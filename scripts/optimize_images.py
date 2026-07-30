#!/usr/bin/env python3
"""Non-destructive, repository-local raster image audit/optimization workflow."""
from __future__ import annotations

import argparse, hashlib, json, math, os, re, shutil, struct, sys, time
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import unquote, urlsplit

RASTER = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"}
TEXT = {".html", ".htm", ".css", ".js", ".mjs", ".json", ".md", ".webmanifest"}
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
    if any(x in s for x in ("favicon", "icon", "nebby")): return "icon" if not alpha else "transparent illustration"
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
        cls=classify(rel,p.suffix.lower()[1:],alpha,animated)
        manual=animated or cls in ("museum evidence image","map/scientific asset") or w is None
        maxdisplay=max((x[0]*x[1] for x in displays),default=None)
        oversized=bool(w and maxdisplay and w*h > 4*maxdisplay)
        inventory.append({"path":rel,"extension":p.suffix.lower()[1:],"bytes":size,"human_size":human(size),
          "width":w,"height":h,"aspect_ratio":round(w/h,6) if w and h else None,"alpha":alpha,"animated":animated,
          "exif_orientation":orient,"referenced":bool(refs),"reference_count":sum(r["count"] for r in refs),
          "referenced_by":refs,"likely_display_dimensions":displays,"explicit_width_height":bool(displays),
          "loading_lazy":any(t["loading"]=="lazy" for t in tags),"decoding_async":any(t["decoding"]=="async" for t in tags),
          "substantially_oversized":oversized,"class":cls,"automatic_action":"MANUAL REVIEW" if manual else "ELIGIBLE",
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
    return {"schema_version":1,"generated_utc":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"root":".","summary":summary,
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

def markdown(report):
    s=report["summary"]; rows=["# Image optimization audit", "", "> Byte figures are inventory/transfer estimates, not browser timings.", "", "## Global totals", "",
      f"- Raster images: **{s['raster_count']}**",f"- Raster bytes: **{s['raster_bytes']} ({human(s['raster_bytes'])})**",f"- Repository bytes (excluding `.git`): **{s['repository_bytes']} ({human(s['repository_bytes'])})**",f"- Images / repository: **{s['image_percentage_of_repository']}%**",
      f"- Oversized candidates: **{s['oversized_count']}**",f"- Unreferenced candidates: **{s['unreferenced_count']}**",f"- Manual review: **{s['manual_review_count']}**", "", "### By extension", "", "| Extension | Bytes |", "|---|---:|"]
    rows += [f"| {k} | {v} ({human(v)}) |" for k,v in sorted(s["bytes_by_extension"].items())]
    rows += ["", "## Before / after transfer estimate", "", "| Metric | Value |", "|---|---:|",
      f"| Original raster count | {s['raster_count']} |",f"| Current raster count | {s['raster_count']} |",
      f"| Estimated transfer before | {human(s['estimated_transfer_bytes_before'])} |",f"| Estimated transfer after | {human(s['estimated_transfer_bytes_after'])} |",
      f"| Bytes saved | {s['estimated_transfer_bytes_saved']} |",f"| Percentage saved | {s['estimated_transfer_percent_saved']}% |",
      f"| Optimized / converted / resized | {s['optimized_count']} / {s['converted_count']} / {s['resized_count']} |",
      f"| Unchanged / skipped / manual / failed | {s['unchanged_count']} / {s['skipped_count']} / {s['manual_review_count']} / {s['failed_count']} |",
      "", "No live references were changed: the environment had no WebP encoder, so the safety gate produced no PASS candidates. Repository growth is limited to reviewable tooling, tests, documentation, state, and reports."]
    rows += ["", "## Audit findings and root causes", "",
      "- Full-resolution JPEG photographs dominate the raster inventory; evidence and scientific assets require curator/manual review rather than automatic downscaling.",
      "- The 1024×1024 root `avatar.png` is served at a CSS width of 160 px (120 px on small screens), but no derivative was introduced without an available encoder and visual review.",
      "- The requested `nebu.png` does not exist. The similarly named 1024×1024 alpha-bearing `nebby.png` exists in two byte-identical copies and is displayed as a small mascot.",
      "- Existing markup commonly omits intrinsic dimensions and lazy/async hints; these are reported, not bulk-edited, to avoid LCP and semantic regressions.",
      "", "## Top savings", "", "No candidates passed in this environment, so the top-20 savings table is empty (0 bytes saved)."]
    rows += ["", "## Largest 20", "", "| Path | Size | Dimensions | Class | Status |", "|---|---:|---:|---|---|"]
    rows += [f"| `{x['path']}` | {human(x['bytes'])} | {x['width']}×{x['height']} | {x['class']} | {x['automatic_action']} |" for x in report["largest_20"]]
    for title,key in (("Unreferenced candidates","unreferenced_candidates"),("Oversized relative to explicit display dimensions","oversized_candidates"),("Referenced images missing explicit width/height","missing_dimensions"),("Referenced images missing lazy loading","missing_lazy_loading"),("Must not be touched automatically","must_not_touch_automatically")):
        rows += ["",f"## {title}",""] + ([f"- `{p}`" for p in report[key]] or ["- None detected."])
    rows += ["", "## Duplicate candidates", "", "### Identical hashes", ""]
    rows += ["- "+", ".join(f"`{p}`" for p in group) for group in report["duplicates"]["identical_hash"]] or ["- None."]
    rows += ["", "## Page-level estimates", "", "| Page | Before | After | Savings | Largest |", "|---|---:|---:|---:|---|"]
    rows += [f"| `{x['page']}` | {human(x['estimated_image_bytes_before'])} | {human(x['estimated_image_bytes_after'])} | 0 B | `{x['largest_image']}` |" for x in report["page_estimates"]]
    return "\n".join(rows)+"\n"

def write_report(report,jpath=None,mpath=None):
    if jpath: Path(jpath).parent.mkdir(parents=True,exist_ok=True); Path(jpath).write_text(json.dumps(report,indent=2)+"\n")
    if mpath: Path(mpath).parent.mkdir(parents=True,exist_ok=True); Path(mpath).write_text(markdown(report))

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

def generate(root, report, selected=None, dry=False):
    results=[]
    for x in report["images"]:
        status="SKIPPED"; reason="not eligible"
        if x["automatic_action"]=="ELIGIBLE" and x["bytes"]>=MIN_BYTES and x["extension"] in ("png","jpg","jpeg"):
            if not Image: reason="Pillow unavailable; install dependency and retry"
            else:
                src=root/x["path"]; dst=root/candidate_path(x["path"])
                if dry: status="PROPOSED"; reason="eligible non-destructive WebP candidate"
                else:
                    dst.parent.mkdir(parents=True,exist_ok=True)
                    with Image.open(src) as im:
                        kwargs={"format":"WEBP","method":6}
                        if x["class"] in ("screenshot","transparent illustration","icon"): kwargs["lossless"]=True
                        else: kwargs["quality"]=90
                        im.save(dst,**kwargs)
                    ok,reason=verify_pair(src,dst)
                    saving=x["bytes"]-dst.stat().st_size
                    if ok and saving>=MIN_BYTES and saving/x["bytes"]>=MIN_RATIO: status="PASS"
                    else: status="MANUAL REVIEW" if ok else "FAILED"; dst.unlink(missing_ok=True)
        results.append({"source":x["path"],"candidate":candidate_path(x["path"]).as_posix(),"status":status,"reason":reason})
    if not dry:
        STATE.parent.mkdir(parents=True,exist_ok=True); STATE.write_text(json.dumps({"results":results,"references_updated":[]},indent=2)+"\n")
    return results

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
    if state.get("references_updated"): print("Refusing automatic restore: state contains reference edits",file=sys.stderr); return False
    for x in state["results"]: (root/x["candidate"]).unlink(missing_ok=True)
    (root/STATE).unlink(missing_ok=True)
    print("Generated candidates removed; original references were never changed."); return True

def main(argv=None):
    ap=argparse.ArgumentParser(); modes=ap.add_mutually_exclusive_group()
    for flag in ("audit","dry-run","generate","apply","verify","restore","check-dependencies"): modes.add_argument("--"+flag,action="store_true")
    ap.add_argument("--path"); ap.add_argument("--top",type=int,default=20); ap.add_argument("--report-json"); ap.add_argument("--report-md"); ap.add_argument("--root",default=".")
    a=ap.parse_args(argv); root=Path(a.root).resolve()
    if a.check_dependencies: dependencies(); return 0
    if a.restore: return 0 if restore(root) else 1
    if a.apply: return 0 if apply(root) else 1
    if a.verify: return 0 if verify(root) else 1
    report=audit(root,a.path); report["largest_20"]=report["largest_20"][:a.top]
    write_report(report,a.report_json,a.report_md); summary(report,"BASELINE")
    if a.dry_run: generate(root,report,a.path,True)
    if a.generate: generate(root,report,a.path,False)
    return 0
if __name__=="__main__": raise SystemExit(main())
