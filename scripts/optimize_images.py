#!/usr/bin/env python3
"""Non-destructive, repository-local raster image audit/optimization workflow."""
from __future__ import annotations

import argparse, hashlib, html.parser, json, math, os, re, shutil, struct, subprocess, sys
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import unquote, urlsplit

RASTER = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"}
TEXT = {".html", ".htm", ".css", ".js", ".mjs", ".json", ".md", ".webmanifest", ".xml", ".rss", ".atom"}
MIN_BYTES, MIN_RATIO = 20_000, .10
STATE = Path("reports/image-optimization-state.json")
GENERATED = Path("assets/generated/images")

try:
    from PIL import Image, ImageChops, ImageStat
except ImportError:
    Image = ImageChops = ImageStat = None

def human(n):
    for unit in ("B", "KiB", "MiB", "GiB"):
        if n < 1024 or unit == "GiB": return f"{n:.1f} {unit}"
        n /= 1024

def png_info(data):
    if data[:8] != b"\x89PNG\r\n\x1a\n": raise ValueError("bad PNG")
    w,h,depth,color = struct.unpack(">IIBB", data[16:26])
    alpha = color in (4,6) or b"tRNS" in data
    animated = b"acTL" in data
    return w,h,alpha,animated,None

def gif_info(data):
    if data[:6] not in (b"GIF87a", b"GIF89a"): raise ValueError("bad GIF")
    w,h = struct.unpack("<HH", data[6:10]); frames=data.count(b"\x2c")
    return w,h, b"\x21\xf9" in data, frames > 1, None

def jpeg_info(data):
    if data[:2] != b"\xff\xd8": raise ValueError("bad JPEG")
    i=2; w=h=None
    while i+4 <= len(data):
        if data[i] != 0xff: i+=1; continue
        marker=data[i+1]; i+=2
        if marker in (0xd8,0xd9) or 0xd0 <= marker <= 0xd7: continue
        if i+2 > len(data): break
        length=struct.unpack(">H",data[i:i+2])[0]
        if marker in range(0xc0,0xd0) and marker not in (0xc4,0xc8,0xcc):
            h,w=struct.unpack(">HH",data[i+3:i+7]); break
        i += length
    if not w: raise ValueError("JPEG dimensions unavailable")
    orientation=None
    m=re.search(b"Exif\x00\x00",data)
    if m:
        try:
            ex=data[m.end():]; endian="<" if ex[:2]==b"II" else ">"
            off=struct.unpack(endian+"I",ex[4:8])[0]; count=struct.unpack(endian+"H",ex[off:off+2])[0]
            for j in range(count):
                ent=ex[off+2+j*12:off+14+j*12]
                if struct.unpack(endian+"H",ent[:2])[0]==274: orientation=struct.unpack(endian+"H",ent[8:10])[0]
        except Exception: pass
    return w,h,False,False,orientation

def image_info(path):
    data=path.read_bytes(); ext=path.suffix.lower()
    if Image:
        with Image.open(path) as im:
            w,h=im.size; alpha="A" in im.getbands() or "transparency" in im.info
            return w,h,alpha,getattr(im,"n_frames",1)>1,im.getexif().get(274)
    if ext==".png": return png_info(data)
    if ext in (".jpg",".jpeg"): return jpeg_info(data)
    if ext==".gif": return gif_info(data)
    raise ValueError("dimensions require Pillow")

def files(root, suffixes):
    ignored={".git", "node_modules", "__pycache__"}
    return [p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in suffixes
            and not any(x in ignored for x in p.parts)
            and not p.relative_to(root).as_posix().startswith(GENERATED.as_posix()+"/")]

def classify(rel, ext, alpha, animated):
    s=rel.lower()
    if animated: return "animated"
    if any(x in s for x in ("map", "geomagnetic", "horizon", "overlay")): return "map/scientific asset"
    if any(x in s for x in ("field-note", "museum", "artifact", "evidence")): return "museum evidence image"
    if "avatar" in s: return "avatar"
    if any(x in s for x in ("favicon", "apple-touch", "mask-icon")) or re.search(r"(^|[-_/])icon(?:[-_.]|$)",s): return "special-consumer icon"
    if "nebby" in s: return "transparent illustration" if alpha else "icon"
    if ext in ("jpg","jpeg"): return "photo"
    if alpha: return "transparent illustration"
    if any(x in s for x in ("screen", "terminal", "desktop", "system")): return "screenshot"
    return "unknown"

def text_corpus(root):
    out={}
    for p in files(root,TEXT):
        rel=p.relative_to(root).as_posix()
        # Reports contain a copy of every discovered path and are outputs, not site references.
        if rel.startswith("reports/image-optimization-"): continue
        try: out[p]=p.read_text("utf-8")
        except UnicodeDecodeError: pass
    return out

def tag_details(text, name):
    matches=[]
    for tag in re.findall(r"<(?:img|source)\b[^>]*>",text,re.I|re.S):
        if name in unquote(tag):
            def attr(n):
                m=re.search(rf"\b{n}\s*=\s*(['\"])(.*?)\1",tag,re.I|re.S); return m.group(2) if m else None
            matches.append({"width":attr("width"),"height":attr("height"),"loading":attr("loading"),"decoding":attr("decoding")})
    return matches

def special_consumer(rel, corpus):
    """Return a reason when an asset appears in non-page image metadata."""
    names=(rel,"/"+rel,Path(rel).name)
    for source,text in corpus.items():
        suffix=source.suffix.lower(); low=text.lower()
        if not any(n.lower() in low for n in names): continue
        if suffix in (".xml",".rss",".atom") or "<feed" in low or "<rss" in low:
            return "feed consumer requires authored-format review"
        if suffix==".webmanifest" or (suffix==".json" and '"icons"' in low):
            return "manifest icon consumer requires authored-format review"
        for tag in re.findall(r"<meta\b[^>]*>",text,re.I|re.S):
            if any(n.lower() in tag.lower() for n in names) and re.search(r"(?:og:image|twitter:image)",tag,re.I):
                return "Open Graph/Twitter metadata consumer requires authored-format review"
    if any(x in rel.lower() for x in ("email","newsletter")):
        return "email consumer requires authored-format review"
    return None

def audit(root, selected=None):
    root=root.resolve(); corpus=text_corpus(root); inventory=[]; errors=[]
    candidates=files(root,RASTER)
    if selected:
        target=(root/selected).resolve(); candidates=[p for p in candidates if p.resolve()==target]
    for p in sorted(candidates):
        rel=p.relative_to(root).as_posix(); size=p.stat().st_size
        try: w,h,alpha,animated,orient=image_info(p)
        except Exception as e: w=h=None; alpha=animated=None; orient=None; errors.append(f"{rel}: {e}")
        refs=[]; tags=[]
        variants={rel,"/"+rel,p.name,"./"+rel}
        for source,text in corpus.items():
            # Different spellings overlap (for example `/avatar.png` contains
            # `avatar.png`); count each textual occurrence only once.
            positions={m.start() for v in variants for m in re.finditer(re.escape(v),text)}
            count=len(positions)
            if count:
                refs.append({"file":source.relative_to(root).as_posix(),"count":count})
                tags += tag_details(text,p.name)
        displays=[]
        for t in tags:
            if t["width"] and t["height"] and t["width"].isdigit() and t["height"].isdigit(): displays.append([int(t["width"]),int(t["height"])])
        cls=classify(rel,p.suffix.lower()[1:],alpha,animated); consumer=special_consumer(rel,corpus)
        if consumer and cls!="special-consumer icon": cls="external metadata consumer"
        manual=animated or cls in ("museum evidence image","map/scientific asset","special-consumer icon","external metadata consumer") or w is None
        maxdisplay=max((x[0]*x[1] for x in displays),default=None)
        oversized=bool(w and maxdisplay and w*h > 4*maxdisplay)
        inventory.append({"path":rel,"extension":p.suffix.lower()[1:],"bytes":size,"human_size":human(size),
          "width":w,"height":h,"aspect_ratio":round(w/h,6) if w and h else None,"alpha":alpha,"animated":animated,
          "exif_orientation":orient,"referenced":bool(refs),"reference_count":sum(r["count"] for r in refs),
          "referenced_by":refs,"likely_display_dimensions":displays,"explicit_width_height":bool(displays),
          "loading_lazy":any(t["loading"]=="lazy" for t in tags),"decoding_async":any(t["decoding"]=="async" for t in tags),
          "substantially_oversized":oversized,"class":cls,"automatic_action":"MANUAL REVIEW" if manual else ("SKIPPED" if p.suffix.lower() in (".webp",".avif") else "ELIGIBLE"),
          "exclusion_reason": ("special-consumer icon; retain its broadly supported authored format" if cls=="special-consumer icon" else consumer if consumer else "animated input" if animated else "already optimized input format" if p.suffix.lower() in (".webp",".avif") else "curator review required" if manual else None),
          "sha256":hashlib.sha256(p.read_bytes()).hexdigest()})
    repo_bytes=sum(p.stat().st_size for p in root.rglob("*") if p.is_file() and ".git" not in p.parts)
    ext=Counter(); hashes=defaultdict(list); dims=defaultdict(list)
    for x in inventory: ext[x["extension"]]+=x["bytes"]; hashes[x["sha256"]].append(x["path"]); dims[(x["width"],x["height"])].append(x["path"])
    total=sum(x["bytes"] for x in inventory)
    classes=Counter(x["class"] for x in inventory)
    summary={"raster_count":len(inventory),"raster_bytes":total,"repository_bytes":repo_bytes,
      "image_percentage_of_repository":round(total/repo_bytes*100,2) if repo_bytes else 0,"bytes_by_extension":dict(ext),
      "unreferenced_count":sum(not x["referenced"] for x in inventory),"oversized_count":sum(x["substantially_oversized"] for x in inventory),
      "manual_review_count":sum(x["automatic_action"]=="MANUAL REVIEW" for x in inventory),"failed_count":0,"audit_warning_count":len(errors),
      "optimized_count":0,"converted_count":0,"resized_count":0,"unchanged_count":len(inventory),
      "skipped_count":sum(x["automatic_action"]=="MANUAL REVIEW" or x["bytes"]<MIN_BYTES for x in inventory),
      "new_derivatives":0,"references_updated":0,"estimated_transfer_bytes_before":total,
      "estimated_transfer_bytes_after":total,"estimated_transfer_bytes_saved":0,"estimated_transfer_percent_saved":0,
      "repository_size_change":0,"bytes_by_class":dict(classes)}
    return {"schema_version":2,"root":".","summary":summary,
      "largest_20":sorted(inventory,key=lambda x:x["bytes"],reverse=True)[:20],
      "largest_relative_to_display_20":sorted([x for x in inventory if x["likely_display_dimensions"]],key=lambda x:x["bytes"]/max(1,max(a*b for a,b in x["likely_display_dimensions"])),reverse=True)[:20],
      "unreferenced_candidates":[x["path"] for x in inventory if not x["referenced"]],
      "oversized_candidates":[x["path"] for x in inventory if x["substantially_oversized"]],
      "missing_dimensions":[x["path"] for x in inventory if x["referenced"] and not x["explicit_width_height"]],
      "missing_lazy_loading":[x["path"] for x in inventory if x["referenced"] and not x["loading_lazy"]],
      "must_not_touch_automatically":[x["path"] for x in inventory if x["automatic_action"]=="MANUAL REVIEW"],
      "duplicates":{"identical_hash":[v for v in hashes.values() if len(v)>1],"same_dimensions":[v for v in dims.values() if len(v)>1],"perceptual":"not computed; optional Pillow/imagehash tooling unavailable"},
      "errors":errors,"images":inventory,"page_estimates":page_estimates(inventory)}

def page_estimates(items):
    pages=defaultdict(dict)
    by={x["path"]:x for x in items}
    for x in items:
        for ref in x["referenced_by"]: pages[ref["file"]][x["path"]]=x
    out=[]
    for page,ims in sorted(pages.items()):
        total=sum(x["bytes"] for x in ims.values()); largest=max(ims.values(),key=lambda x:x["bytes"])
        out.append({"page":page,"estimated_image_bytes_before":total,"estimated_image_bytes_after":total,"estimated_savings":0,
          "largest_image":largest["path"],"above_fold_changed":False,"lazy_loading_changed":False,"width_height_added":False,"likely_lcp_image":"not inferred"})
    return out

def valid_savings(report):
    return sorted([x for x in report.get("candidate_results",[]) if x.get("status")=="PASS" and x.get("bytes_saved",0)>0],
                  key=lambda x:(-x["bytes_saved"],x["source"]))

def add_candidate_data(report, state):
    """Merge current, source-hash-matched state into an audit report."""
    current={x["path"]:x for x in report["images"]}; results=[]
    for item in state.get("results",[]):
        source=current.get(item.get("source"))
        if source and item.get("source_sha256")==source["sha256"]:
            results.append(item)
    report["candidate_results"]=results
    good=valid_savings(report); s=report["summary"]
    represented=sum(x["source_bytes"] for x in good); candidate=sum(x["candidate_bytes"] for x in good)
    s.update({"candidate_count":len(good),"candidate_original_bytes":represented,"candidate_bytes":candidate,
      "estimated_transfer_bytes_after_integration":s["raster_bytes"]-sum(x["bytes_saved"] for x in good),
      "potential_bytes_saved":sum(x["bytes_saved"] for x in good),
      "potential_percent_saved":round(sum(x["bytes_saved"] for x in good)/represented*100,2) if represented else 0,
      "references_updated":len(state.get("references_updated",[])),
      "candidate_status_counts":dict(Counter(x["status"] for x in results))})
    return report

def markdown(report, top=20):
    s=report["summary"]; rows=["# Image optimization audit", "", "> Byte figures are inventory/transfer estimates, not browser timings. Candidate savings are not live savings.", "", "## Baseline inventory", "",
      f"- Raster images: **{s['raster_count']}**",f"- Raster bytes: **{s['raster_bytes']} ({human(s['raster_bytes'])})**",f"- Repository bytes (excluding `.git`): **{s['repository_bytes']} ({human(s['repository_bytes'])})**",f"- Images / repository: **{s['image_percentage_of_repository']}%**",
      f"- Oversized candidates: **{s['oversized_count']}**",f"- Unreferenced candidates: **{s['unreferenced_count']}**",f"- Manual review: **{s['manual_review_count']}**", "", "### By extension", "", "| Extension | Bytes |", "|---|---:|"]
    rows += [f"| {k} | {v} ({human(v)}) |" for k,v in sorted(s["bytes_by_extension"].items())]
    rows += ["", "## Candidate generation result", "", "| Metric | Value |", "|---|---:|",
      f"| Original raster count | {s['raster_count']} |",f"| Current raster count | {s['raster_count']} |",
      f"| Estimated transfer before | {human(s['estimated_transfer_bytes_before'])} |",f"| Estimated transfer after | {human(s['estimated_transfer_bytes_after'])} |",
      f"| Potential transfer after approved candidate integration | {human(s.get('estimated_transfer_bytes_after_integration',s['raster_bytes']))} |",
      f"| Potential bytes saved | {s.get('potential_bytes_saved',0)} ({human(s.get('potential_bytes_saved',0))}) |",
      f"| Potential percentage saved (represented sources) | {s.get('potential_percent_saved',0)}% |",
      f"| Live references changed | {s.get('references_updated',0)} |", "",
      "The potential figure applies only if maintainers visually approve candidates and explicitly integrate them. Actual live savings remain **0 bytes** because this workflow does not edit references."]
    counts=s.get("candidate_status_counts",{})
    rows += ["", "### Candidate counts by status", "", "| Status | Count |", "|---|---:|"]+[f"| {k} | {v} |" for k,v in sorted(counts.items())]
    rows += ["", "## Top savings", ""]
    ranked=valid_savings(report)[:top]
    if ranked:
        rows += ["| Source | Original | Candidate | Saved | Saved % | Status / class |", "|---|---:|---:|---:|---:|---|"]
        rows += [f"| `{x['source']}` | {human(x['source_bytes'])} | {human(x['candidate_bytes'])} | {human(x['bytes_saved'])} | {x['percent_saved']}% | {x['status']} / {x['class']} |" for x in ranked]
    else: rows += ["No valid candidates are available; potential savings are 0 bytes."]
    rows += ["", "## Largest 20", "", "| Path | Size | Dimensions | Class | Status |", "|---|---:|---:|---|---|"]
    rows += [f"| `{x['path']}` | {human(x['bytes'])} | {x['width']}×{x['height']} | {x['class']} | {x['automatic_action']} |" for x in report["largest_20"]]
    excluded=[x for x in report["images"] if x.get("exclusion_reason")]
    rows += ["", "## Excluded special-consumer and protected assets", "", "| Path | Class | Reason |", "|---|---|---|"]
    rows += [f"| `{x['path']}` | {x['class']} | {x['exclusion_reason']} |" for x in excluded] or ["| None | — | — |"]
    for title,key in (("Unreferenced candidates","unreferenced_candidates"),("Oversized relative to explicit display dimensions","oversized_candidates"),("Referenced images missing explicit width/height","missing_dimensions"),("Referenced images missing lazy loading","missing_lazy_loading"),("Must not be touched automatically","must_not_touch_automatically")):
        rows += ["",f"## {title}",""] + ([f"- `{p}`" for p in report[key]] or ["- None detected."])
    rows += ["", "## Duplicate source groups", "", "Byte-identical sources retain separate audit identities and deterministic destination paths. Generation may reuse verified bytes, but references are never redirected.", "", "### Identical hashes", ""]
    rows += ["- "+", ".join(f"`{p}`" for p in group) for group in report["duplicates"]["identical_hash"]] or ["- None."]
    rows += ["", "## Page-level estimates", "", "| Page | Before | After | Savings | Largest |", "|---|---:|---:|---:|---|"]
    rows += [f"| `{x['page']}` | {human(x['estimated_image_bytes_before'])} | {human(x['estimated_image_bytes_after'])} | 0 B | `{x['largest_image']}` |" for x in report["page_estimates"]]
    return "\n".join(rows)+"\n"

def write_if_changed(path, data):
    path=Path(path); path.parent.mkdir(parents=True,exist_ok=True)
    if not path.exists() or path.read_text()!=data: path.write_text(data)

def write_report(report,jpath=None,mpath=None,top=20):
    if jpath: write_if_changed(jpath,json.dumps(report,indent=2,sort_keys=True)+"\n")
    if mpath: write_if_changed(mpath,markdown(report,top))

def summary(report,label="BASELINE"):
    s=report["summary"]; print(f"IMAGE OPTIMIZATION {label}\n\nRaster images scanned: {s['raster_count']}\nTotal raster size: {human(s['raster_bytes'])}")
    for e,n in sorted(s["bytes_by_extension"].items()): print(f"{e.upper()}: {human(n)}")
    if report["largest_20"]: print(f"Largest file: {report['largest_20'][0]['path']} — {human(report['largest_20'][0]['bytes'])}")
    print(f"Potential oversized images: {s['oversized_count']}\nPotential unreferenced images: {s['unreferenced_count']}\nFiles requiring manual review: {s['manual_review_count']}")

def dependencies():
    import importlib.util
    vals={"Pillow":"available" if Image else "unavailable","cwebp":"available" if shutil.which("cwebp") else "unavailable","avifenc":"available" if shutil.which("avifenc") else "unavailable","oxipng":"available" if shutil.which("oxipng") else "unavailable","SSIM support":"available" if importlib.util.find_spec("skimage") else "unavailable"}
    for k,v in vals.items(): print(f"{k}: {v}")
    print(f"AVIF generation: {'enabled' if shutil.which('avifenc') else 'disabled'}\nWebP generation: {'enabled' if Image or shutil.which('cwebp') else 'disabled'}")

def candidate_path(rel): return GENERATED / Path(rel).with_suffix(".webp")

def encoder_info():
    return {"pillow_available":bool(Image),"pillow_version":getattr(Image,"__version__",None) if Image else None,
            "cwebp_available":bool(shutil.which("cwebp")),"generator":"Pillow" if Image else None}

def generate(root, report, selected=None, dry=False):
    results=[]; canonical={}; old={}
    if (root/STATE).exists():
        try: old={x["source"]:x for x in json.loads((root/STATE).read_text()).get("results",[])}
        except (ValueError,KeyError): pass
    for x in report["images"]:
        status="MANUAL REVIEW" if x["automatic_action"]=="MANUAL REVIEW" else "SKIPPED"
        reason=x.get("exclusion_reason") or ("below generation threshold" if x["bytes"]<MIN_BYTES else "not eligible")
        dst_rel=candidate_path(x["path"]); src=root/x["path"]; dst=root/dst_rel; reused=False; duplicate_of=None
        if x["automatic_action"]=="ELIGIBLE" and x["bytes"]>=MIN_BYTES and x["extension"] in ("png","jpg","jpeg"):
            if not Image: reason="Pillow unavailable; install dependency and retry"
            else:
                if dry: status="PROPOSED"; reason="eligible non-destructive WebP candidate"
                else:
                    dst.parent.mkdir(parents=True,exist_ok=True)
                    previous=old.get(x["path"],{})
                    if previous.get("source_sha256")==x["sha256"] and dst.exists() and verify_pair(src,dst)[0] and hashlib.sha256(dst.read_bytes()).hexdigest()==previous.get("candidate_sha256"):
                        reused=True
                    elif x["sha256"] in canonical and canonical[x["sha256"]].exists():
                        duplicate_of=next(y["source"] for y in results if y.get("source_sha256")==x["sha256"] and y.get("candidate_sha256"))
                        shutil.copyfile(canonical[x["sha256"]],dst); reused=True
                    else:
                        with Image.open(src) as im:
                            kwargs={"format":"WEBP","method":6}
                            if x["class"] in ("screenshot","transparent illustration","icon"): kwargs["lossless"]=True
                            else: kwargs["quality"]=90
                            im.save(dst,**kwargs)
                    ok,reason=verify_pair(src,dst)
                    saving=x["bytes"]-dst.stat().st_size
                    if ok and saving>=MIN_BYTES and saving/x["bytes"]>=MIN_RATIO: status="PASS"
                    else: status="MANUAL REVIEW" if ok else "FAILED"; dst.unlink(missing_ok=True)
                    if status=="PASS": canonical[x["sha256"]]=dst
        item={"source":x["path"],"candidate":dst_rel.as_posix(),"status":status,"reason":reason,"class":x["class"],
              "source_bytes":x["bytes"],"source_sha256":x["sha256"],"verification":"PASS" if status=="PASS" else "NOT APPLICABLE"}
        if not dry and status=="PASS":
            item.update({"candidate_bytes":dst.stat().st_size,"candidate_sha256":hashlib.sha256(dst.read_bytes()).hexdigest(),
              "bytes_saved":x["bytes"]-dst.stat().st_size,"percent_saved":round((x["bytes"]-dst.stat().st_size)/x["bytes"]*100,2),
              "reused":reused,"duplicate_of":duplicate_of})
        results.append(item)
    if not dry:
        groups=report["duplicates"]["identical_hash"]
        state={"schema_version":2,"root":".","output_directory":GENERATED.as_posix()+"/","encoder":encoder_info(),
               "duplicate_source_groups":groups,"results":results,"references_updated":[]}
        write_if_changed(root/STATE,json.dumps(state,indent=2,sort_keys=True)+"\n")
    return results

def print_top(report, top):
    print("\nTOP SAVINGS")
    ranked=valid_savings(report)[:top]
    if not ranked: print("\nNo valid candidates are available for a savings ranking."); return
    for i,x in enumerate(ranked,1):
        print(f"\n{i}. {x['source']}\n   {human(x['source_bytes'])} -> {human(x['candidate_bytes'])}\n   saved {human(x['bytes_saved'])} ({x['percent_saved']}%) — {x['status']} / {x['class']}")

def generation_summary(report, top):
    s=report["summary"]; results=report.get("candidate_results",[]); counts=Counter(x["status"] for x in results)
    print("\nIMAGE GENERATION RESULT\n")
    print(f"Generated candidates: {sum(x['status']=='PASS' and not x.get('reused') for x in results)}")
    print(f"Reused unchanged candidates: {sum(x['status']=='PASS' and bool(x.get('reused')) for x in results)}")
    print(f"Skipped: {counts['SKIPPED']}\nManual review: {counts['MANUAL REVIEW']}\nFailed: {counts['FAILED']}")
    print(f"Duplicate source groups: {len(report['duplicates']['identical_hash'])}\nOutput directory: {GENERATED.as_posix()}/")
    print(f"Original bytes represented: {s.get('candidate_original_bytes',0)} ({human(s.get('candidate_original_bytes',0))})")
    print(f"Candidate bytes: {s.get('candidate_bytes',0)} ({human(s.get('candidate_bytes',0))})")
    print(f"Potential savings: {s.get('potential_bytes_saved',0)} bytes ({s.get('potential_percent_saved',0)}%)")
    print_top(report,top)

def verify_pair(src,dst):
    try:
        with Image.open(src) as a, Image.open(dst) as b:
            if a.size!=b.size: return False,"dimensions changed"
            if getattr(a,"n_frames",1)!=getattr(b,"n_frames",1): return False,"animation changed"
            aa="A" in a.getbands() or "transparency" in a.info; ba="A" in b.getbands() or "transparency" in b.info
            if aa!=ba: return False,"alpha presence changed"
            if a.size[0]/a.size[1] != b.size[0]/b.size[1]: return False,"aspect ratio changed"
        return True,"dimensions, aspect ratio, alpha, animation and readability verified; lossy candidates require visual review"
    except Exception as e: return False,str(e)

def verify(root):
    issues=validate_references(root)
    state=json.loads((root/STATE).read_text()) if (root/STATE).exists() else {"results":[]}
    for x in state["results"]:
        if x["status"]=="PASS":
            ok,msg=verify_pair(root/x["source"],root/x["candidate"]); x["verify_status"]="PASS" if ok else "FAILED"; x["verify_reason"]=msg
    print(f"Reference validation: {'PASS' if not issues else 'FAILED'} ({len(issues)} issue(s))")
    for i in issues: print(i)
    return not issues and all(x.get("verify_status","PASS")!="FAILED" for x in state["results"])

def local_url(value):
    value=value.strip(); u=urlsplit(value)
    return not u.scheme and not value.startswith(("data:","#","//"))

def resolve_url(root,source,value):
    path=unquote(urlsplit(value).path)
    return root/path.lstrip("/") if path.startswith("/") else source.parent/path

def validate_references(root):
    issues=[]
    for p,text in text_corpus(root).items():
        if p.suffix.lower() in (".html",".htm"):
            for tag in re.findall(r"<(?:img|source|a)\b[^>]*>",text,re.I|re.S):
                for attr in ("src","href"):
                    m=re.search(rf"\b{attr}\s*=\s*(['\"])(.*?)\1",tag,re.I|re.S)
                    if m and local_url(m.group(2)) and Path(urlsplit(m.group(2)).path).suffix.lower() in RASTER and not resolve_url(root,p,m.group(2)).exists(): issues.append(f"{p.relative_to(root)}: broken {attr} {m.group(2)}")
                m=re.search(r"\bsrcset\s*=\s*(['\"])(.*?)\1",tag,re.I|re.S)
                if m:
                    seen=set()
                    for item in m.group(2).split(","):
                        bits=item.strip().split()
                        if len(bits) not in (1,2): issues.append(f"{p.relative_to(root)}: malformed srcset entry {item}"); continue
                        if len(bits)==2 and bits[1] in seen: issues.append(f"{p.relative_to(root)}: duplicate srcset descriptor {bits[1]}")
                        if len(bits)==2: seen.add(bits[1])
                        if local_url(bits[0]) and not resolve_url(root,p,bits[0]).exists(): issues.append(f"{p.relative_to(root)}: broken srcset {bits[0]}")
        if p.suffix.lower()==".css":
            for val in re.findall(r"url\(\s*['\"]?([^)'\"]+)",text,re.I):
                if local_url(val) and Path(urlsplit(val).path).suffix.lower() in RASTER and not resolve_url(root,p,val).exists(): issues.append(f"{p.relative_to(root)}: broken CSS URL {val}")
    return issues

class MarkupValidator(html.parser.HTMLParser):
    """Small structural validator for the picture markup that we author."""
    def __init__(self):
        super().__init__(convert_charrefs=False); self.picture_depth=0; self.issues=[]
    def handle_starttag(self, tag, attrs):
        if tag.lower()=="picture":
            self.picture_depth += 1
            if self.picture_depth > 1: self.issues.append("nested picture element")
    def handle_startendtag(self, tag, attrs): self.handle_starttag(tag,attrs)
    def handle_endtag(self, tag):
        if tag.lower()=="picture":
            if self.picture_depth == 0: self.issues.append("unmatched picture end tag")
            else: self.picture_depth -= 1
    def close(self):
        super().close()
        if self.picture_depth: self.issues.append("unclosed picture element")

def validate_html(text):
    parser=MarkupValidator()
    try: parser.feed(text); parser.close()
    except Exception as exc: parser.issues.append(str(exc))
    return parser.issues

def git_safety(root):
    """Return reasons integration must not edit this checkout."""
    if not (root/".git").exists(): return [] # Unit-test and library use.
    reasons=[]
    status=subprocess.run(["git","status","--porcelain=v1","-z"],cwd=root,text=True,capture_output=True)
    if status.returncode: reasons.append("unable to inspect Git working tree")
    else:
        records=status.stdout.split("\0"); i=0
        while i < len(records):
            record=records[i]; i+=1
            if not record: continue
            code,path=record[:2],record[3:]
            paths=[path]
            if "R" in code or "C" in code:
                if i < len(records) and records[i]: paths.append(records[i]); i+=1
            conflict=code in {"DD","AU","UD","UA","DU","AA","UU"}
            for changed in paths:
                allowed=(changed==STATE.as_posix() or changed.startswith("assets/generated/"))
                if conflict or not allowed:
                    reasons.append(f"disallowed Git path ({code}): {changed}")
    conflicts=subprocess.run(["git","diff","--name-only","--diff-filter=U"],cwd=root,text=True,capture_output=True)
    for path in conflicts.stdout.splitlines():
        if path: reasons.append(f"merge conflict present: {path}")
    return reasons

def _attr(tag,name):
    match=re.search(rf"\b{name}\s*=\s*(['\"])(.*?)\1",tag,re.I|re.S)
    return match.group(2) if match else None

def _candidate_url(page, candidate):
    return Path(os.path.relpath(candidate,page.parent)).as_posix()

def integrate_html(root, text, page, passed):
    """Return rewritten HTML and per-candidate integration counters."""
    picture_ranges=[]; stack=[]
    for match in re.finditer(r"</?picture\b[^>]*>",text,re.I|re.S):
        if match.group().lower().startswith("</"):
            if stack: picture_ranges.append((stack.pop(),match.end()))
        else: stack.append(match.start())
    counts=Counter(); used=set()
    edits=[]
    for match in re.finditer(r"<img\b[^>]*>",text,re.I|re.S):
        tag=match.group(); value=_attr(tag,"src")
        if not value or not local_url(value): continue
        resolved=resolve_url(root,page,value).resolve()
        item=passed.get(resolved)
        if not item: continue
        candidate=(root/item["candidate"]).resolve(); url=_candidate_url(page,candidate)
        containing=next((r for r in picture_ranges if r[0] < match.start() and match.end() < r[1]),None)
        if containing:
            block=text[containing[0]:containing[1]]
            sources=[_attr(x,"srcset") for x in re.findall(r"<source\b[^>]*>",block,re.I|re.S)]
            if any(s and urlsplit(s).path==url for s in sources): counts["already"]+=1; used.add(item["source"]); continue
            insertion=f'<source srcset="{url}" type="image/webp">\n'
            edits.append((match.start(),match.start(),insertion)); counts["integrated"]+=1; used.add(item["source"])
        else:
            replacement=f'<picture>\n<source srcset="{url}" type="image/webp">\n{tag}\n</picture>'
            edits.append((match.start(),match.end(),replacement)); counts["integrated"]+=1; used.add(item["source"])
    for start,end,replacement in reversed(edits): text=text[:start]+replacement+text[end:]
    return text,counts,used

def integrate_pass(root):
    """Atomically add verified PASS derivatives to visible HTML rendering."""
    reasons=git_safety(root)
    if not (root/STATE).exists(): reasons.append("missing state manifest; run --generate first")
    if reasons:
        for reason in reasons: print(f"ABORT: {reason}",file=sys.stderr)
        return False
    state_text=(root/STATE).read_text()
    try: state=json.loads(state_text)
    except (OSError,ValueError) as exc: print(f"ABORT: invalid state manifest: {exc}",file=sys.stderr); return False
    passed={}; failures=[]
    inventory={x["path"]:x for x in audit(root)["images"]}
    for item in state.get("results",[]):
        if item.get("status")!="PASS": continue
        src=root/item["source"]; candidate=root/item["candidate"]
        if not src.exists() or not candidate.exists(): failures.append(f"missing candidate or source: {item.get('source')}"); continue
        if hashlib.sha256(src.read_bytes()).hexdigest()!=item.get("source_sha256"): failures.append(f"source hash changed: {item['source']}"); continue
        if hashlib.sha256(candidate.read_bytes()).hexdigest()!=item.get("candidate_sha256"): failures.append(f"candidate hash changed: {item['candidate']}"); continue
        current=inventory.get(item["source"],{})
        if current.get("automatic_action")!="ELIGIBLE" or current.get("class") in ("museum evidence image","map/scientific asset","special-consumer icon","external metadata consumer"):
            failures.append(f"protected PASS entry refused: {item['source']}"); continue
        ok,msg=verify_pair(src,candidate)
        if not ok: failures.append(f"failed verification: {item['source']}: {msg}"); continue
        passed[src.resolve()]=item
    html_files=sorted(files(root,{".html",".htm"}))
    for page in html_files:
        for issue in validate_html(page.read_text("utf-8")): failures.append(f"broken HTML {page.relative_to(root)}: {issue}")
    if failures:
        for reason in failures: print(f"ABORT: {reason}",file=sys.stderr)
        return False
    originals={p:p.read_text("utf-8") for p in html_files}; totals=Counter(); modified=[]; integrated_items=set()
    try:
        for page,old in originals.items():
            new,counts,used=integrate_html(root,old,page,passed); totals.update(counts); integrated_items.update(used)
            issues=validate_html(new)
            if issues: raise ValueError(f"broken HTML {page.relative_to(root)}: {', '.join(issues)}")
            if new!=old: page.write_text(new,"utf-8"); modified.append(page)
        if modified:
            state["references_updated"]=[{"file":p.relative_to(root).as_posix(),"sha256_before":hashlib.sha256(originals[p].encode()).hexdigest(),"content_before":originals[p]} for p in modified]
        write_if_changed(root/STATE,json.dumps(state,indent=2,sort_keys=True)+"\n")
        if not verify(root): raise ValueError("automatic --verify failed")
    except Exception as exc:
        for page,content in originals.items(): page.write_text(content,"utf-8")
        (root/STATE).write_text(state_text)
        print(f"ABORT: {exc}; all HTML changes rolled back",file=sys.stderr); return False
    referenced=set()
    for page in html_files:
        for item in passed.values():
            if item["source"] in page.read_text("utf-8") or Path(item["source"]).name in page.read_text("utf-8"): referenced.add(item["source"])
    saved=sum(x["bytes_saved"] for x in passed.values() if x["source"] in integrated_items)
    original=sum(x["source_bytes"] for x in passed.values() if x["source"] in integrated_items)
    protected=sum(x.get("automatic_action")=="MANUAL REVIEW" for x in inventory.values())
    print("\nPASS INTEGRATION RESULT\n")
    print(f"PASS candidates available: {len(passed)}\n\nIntegrated: {totals['integrated']}\n\nAlready integrated: {totals['already']}\n\nSkipped: {len(passed)-len(referenced)}\n\nProtected: {protected}\n\nModified HTML files: {len(modified)}\n\nEstimated live transfer reduction: {human(saved)}\n{(saved/original*100 if original else 0):.1f} %")
    return True

def apply(root):
    # Deliberately conservative: applying only records verified PASS candidates. References
    # require explicit maintainer edits, preventing semantic/route changes by automation.
    if not (root/STATE).exists(): print("No generated state; run --generate first",file=sys.stderr); return False
    state=json.loads((root/STATE).read_text()); passed=[x for x in state["results"] if x["status"]=="PASS"]
    for x in passed:
        ok,msg=verify_pair(root/x["source"],root/x["candidate"])
        if not ok: print(f"Refusing {x['source']}: {msg}",file=sys.stderr); return False
    print(f"Verified {len(passed)} PASS candidate(s); originals and references remain unchanged.")
    return True

def restore(root):
    if not (root/STATE).exists(): print("Nothing to restore."); return True
    state=json.loads((root/STATE).read_text())
    for edit in state.get("references_updated",[]):
        path=root/edit["file"]
        if "content_before" not in edit: print(f"Cannot restore {edit['file']}: backup absent",file=sys.stderr); return False
        path.write_text(edit["content_before"],"utf-8")
    for x in state["results"]: (root/x["candidate"]).unlink(missing_ok=True)
    (root/STATE).unlink(missing_ok=True)
    print("Original HTML restored and generated candidates removed."); return True

def main(argv=None):
    ap=argparse.ArgumentParser(); modes=ap.add_mutually_exclusive_group()
    for flag in ("audit","dry-run","generate","apply","integrate-pass","verify","restore","check-dependencies"): modes.add_argument("--"+flag,action="store_true")
    ap.add_argument("--path"); ap.add_argument("--top",type=int,default=20); ap.add_argument("--report-json"); ap.add_argument("--report-md"); ap.add_argument("--root",default=".")
    a=ap.parse_args(argv); root=Path(a.root).resolve()
    if a.check_dependencies: dependencies(); return 0
    if a.restore: return 0 if restore(root) else 1
    if a.integrate_pass: return 0 if integrate_pass(root) else 1
    if a.apply: return 0 if apply(root) else 1
    if a.verify: return 0 if verify(root) else 1
    if a.top < 0: ap.error("--top must be zero or greater")
    report=audit(root,a.path); report["largest_20"]=report["largest_20"][:a.top]
    if (root/STATE).exists():
        try: add_candidate_data(report,json.loads((root/STATE).read_text()))
        except (ValueError,KeyError): pass
    write_report(report,a.report_json,a.report_md,a.top); summary(report,"BASELINE")
    if a.dry_run: generate(root,report,a.path,True)
    if a.generate:
        results=generate(root,report,a.path,False)
        state=json.loads((root/STATE).read_text()); add_candidate_data(report,state)
        write_report(report,a.report_json,a.report_md,a.top); generation_summary(report,a.top)
    elif (a.audit or (not any((a.dry_run,a.generate)))) and report.get("candidate_results"):
        print_top(report,a.top)
    return 0
if __name__=="__main__": raise SystemExit(main())
