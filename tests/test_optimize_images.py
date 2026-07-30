import contextlib, importlib.util, io, json, os, struct, tempfile, unittest, zlib
from pathlib import Path
from unittest import mock

SPEC=importlib.util.spec_from_file_location("opt",Path(__file__).parents[1]/"scripts/optimize_images.py")
opt=importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(opt)

def png(w=2,h=2,color=6):
    def chunk(n,d): return struct.pack(">I",len(d))+n+d+struct.pack(">I",zlib.crc32(n+d)&0xffffffff)
    channels={0:1,2:3,4:2,6:4}[color]
    raw=b"".join(b"\0"+bytes([30])*w*channels for _ in range(h))
    return b"\x89PNG\r\n\x1a\n"+chunk(b"IHDR",struct.pack(">IIBBBBB",w,h,8,color,0,0,0))+chunk(b"IDAT",zlib.compress(raw))+chunk(b"IEND",b"")

class ImageWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.t=tempfile.TemporaryDirectory(); self.root=Path(self.t.name)
        (self.root/"plain.png").write_bytes(png(color=2)); (self.root/"alpha.png").write_bytes(png(color=6))
        (self.root/"skip.svg").write_text("<svg/>"); (self.root/"index.html").write_text('<img src="plain.png" width="2" height="2"><a href="alpha.png">full</a>')
    def tearDown(self): self.t.cleanup()
    def report(self): return opt.audit(self.root)
    def test_01_audit_detects_png(self): self.assertEqual(self.report()["summary"]["raster_count"],2)
    def test_02_svg_skipped(self): self.assertNotIn("skip.svg",[x["path"] for x in self.report()["images"]])
    def test_03_apng_detected_animated(self):
        p=self.root/"a.png"; p.write_bytes(png()+b"acTL"); self.assertTrue(opt.png_info(p.read_bytes())[3])
    def test_04_transparent_png_detected(self): self.assertTrue(next(x for x in self.report()["images"] if x["path"]=="alpha.png")["alpha"])
    def test_05_aspect_ratio_recorded(self): self.assertEqual(self.report()["images"][0]["aspect_ratio"],1)
    def test_06_no_resize_or_upscale_in_generation_policy(self): self.assertNotIn("resize",opt.generate.__doc__ or "")
    def test_07_generated_directory_is_separate(self): self.assertTrue(str(opt.candidate_path("plain.png")).startswith("assets/generated/"))
    def test_08_threshold_requires_bytes_and_ratio(self): self.assertEqual((opt.MIN_BYTES,opt.MIN_RATIO),(20000,.10))
    def test_09_missing_pillow_is_graceful(self):
        r=self.report()
        with mock.patch.object(opt,"Image",None): self.assertEqual(opt.generate(self.root,r,dry=True)[0]["status"],"SKIPPED")
    def test_10_dry_run_changes_nothing(self):
        before={p:p.read_bytes() for p in self.root.rglob("*") if p.is_file()}; opt.generate(self.root,self.report(),dry=True)
        self.assertEqual(before,{p:p.read_bytes() for p in self.root.rglob("*") if p.is_file()})
    def test_11_apply_requires_state(self): self.assertFalse(opt.apply(self.root))
    def test_12_restore_removes_candidate_only(self):
        c=self.root/opt.candidate_path("plain.png"); c.parent.mkdir(parents=True); c.write_bytes(b"candidate")
        s=self.root/opt.STATE; s.parent.mkdir(exist_ok=True); s.write_text(json.dumps({"results":[{"candidate":str(opt.candidate_path('plain.png'))}],"references_updated":[]}))
        self.assertTrue(opt.restore(self.root)); self.assertTrue((self.root/"plain.png").exists()); self.assertFalse(c.exists())
    def test_13_broken_reference_detected(self):
        (self.root/"index.html").write_text('<img src="missing.png">'); self.assertTrue(opt.validate_references(self.root))
    def test_14_srcset_duplicate_detected(self):
        (self.root/"index.html").write_text('<img src="plain.png" srcset="plain.png 2w, alpha.png 2w">'); self.assertTrue(any("duplicate" in x for x in opt.validate_references(self.root)))
    def test_15_fallback_valid(self): self.assertFalse(opt.validate_references(self.root))
    def test_16_full_resolution_link_valid(self): self.assertFalse(opt.validate_references(self.root))
    def test_17_audit_idempotent(self):
        self.assertEqual(self.report(),self.report())
    def test_18_report_totals_match(self): self.assertEqual(self.report()["summary"]["raster_bytes"],sum(p.stat().st_size for p in (self.root/"plain.png",self.root/"alpha.png")))
    def test_19_unsupported_untouched(self):
        before=(self.root/"skip.svg").read_bytes(); opt.audit(self.root); self.assertEqual(before,(self.root/"skip.svg").read_bytes())
    def test_20_permissions_untouched(self):
        mode=(self.root/"plain.png").stat().st_mode; opt.generate(self.root,self.report(),dry=True); self.assertEqual(mode,(self.root/"plain.png").stat().st_mode)

    def candidate_report(self):
        r=self.report(); results=[]
        for name,source,candidate in (("plain.png",1000,400),("alpha.png",2000,500),("third.png",900,600),("bad.png",9999,1)):
            results.append({"source":name,"source_bytes":source,"candidate_bytes":candidate,"bytes_saved":source-candidate,
              "percent_saved":round((source-candidate)/source*100,2),"status":"FAILED" if name=="bad.png" else "PASS","class":"photo"})
        r["candidate_results"]=results; return r

    def test_21_generate_prints_final_summary(self):
        r=self.candidate_report(); opt.add_candidate_data(r,{"results":[],"references_updated":[]})
        r["candidate_results"]=self.candidate_report()["candidate_results"]
        with contextlib.redirect_stdout(io.StringIO()) as out: opt.generation_summary(r,3)
        self.assertIn("IMAGE GENERATION RESULT",out.getvalue())

    def test_22_top_three_only_and_sorted(self):
        with contextlib.redirect_stdout(io.StringIO()) as out: opt.print_top(self.candidate_report(),3)
        text=out.getvalue(); self.assertEqual(sum(f"\n{i}. " in text for i in range(1,5)),3)
        self.assertLess(text.index("alpha.png"),text.index("plain.png")); self.assertNotIn("bad.png",text)

    def test_23_state_candidates_override_stale_environment(self):
        r=self.report(); source=r["images"][0]
        opt.add_candidate_data(r,{"results":[{"source":source["path"],"source_sha256":source["sha256"],"status":"PASS",
          "source_bytes":100,"candidate_bytes":50,"bytes_saved":50,"percent_saved":50,"class":"photo"}],"references_updated":[]})
        self.assertIn("Potential bytes saved | 50",opt.markdown(r))

    def test_24_favicon_is_manual_review(self):
        (self.root/"favicon.png").write_bytes(png())
        item=next(x for x in self.report()["images"] if x["path"]=="favicon.png")
        self.assertEqual((item["class"],item["automatic_action"]),("special-consumer icon","MANUAL REVIEW"))

    def test_25_webp_not_reencoded(self):
        if not opt.Image: self.skipTest("Pillow unavailable")
        opt.Image.new("RGB",(2,2)).save(self.root/"existing.webp")
        item=next(x for x in self.report()["images"] if x["path"]=="existing.webp")
        self.assertEqual(item["automatic_action"],"SKIPPED")

    def test_26_duplicates_and_same_basename_paths(self):
        (self.root/"nested").mkdir(); (self.root/"nested/plain.png").write_bytes((self.root/"plain.png").read_bytes())
        r=self.report(); self.assertIn(["nested/plain.png","plain.png"],r["duplicates"]["identical_hash"])
        self.assertNotEqual(opt.candidate_path("plain.png"),opt.candidate_path("nested/plain.png"))

    def test_27_candidate_paths_are_relative_and_deterministic(self):
        a=opt.candidate_path("images/photo.jpg"); self.assertEqual(a,opt.candidate_path("images/photo.jpg")); self.assertFalse(a.is_absolute())

    def test_28_apply_is_verification_only(self):
        before={p.relative_to(self.root):p.read_bytes() for p in self.root.rglob("*") if p.is_file()}
        (self.root/opt.STATE).parent.mkdir(); (self.root/opt.STATE).write_text(json.dumps({"results":[],"references_updated":[]}))
        self.assertTrue(opt.apply(self.root)); after={p.relative_to(self.root):p.read_bytes() for p in self.root.rglob("*") if p.is_file()}
        self.assertEqual({k:v for k,v in after.items() if k!=opt.STATE},before)

    def prepare_pass(self, html='<img class="hero" alt="Plain" src="plain.png" width="2" height="2" loading="lazy" data-x="1">'):
        (self.root/"index.html").write_text(html)
        candidate=self.root/opt.candidate_path("plain.png"); candidate.parent.mkdir(parents=True,exist_ok=True); candidate.write_bytes(b"valid-webp")
        source=self.root/"plain.png"
        state={"results":[{"source":"plain.png","candidate":opt.candidate_path("plain.png").as_posix(),"status":"PASS","class":"photo",
          "source_bytes":source.stat().st_size,"candidate_bytes":len(b"valid-webp"),"bytes_saved":10,"source_sha256":opt.hashlib.sha256(source.read_bytes()).hexdigest(),
          "candidate_sha256":opt.hashlib.sha256(candidate.read_bytes()).hexdigest()}],"references_updated":[]}
        (self.root/opt.STATE).parent.mkdir(); (self.root/opt.STATE).write_text(json.dumps(state))

    def integrate(self):
        with mock.patch.object(opt,"verify_pair",return_value=(True,"ok")), mock.patch.object(opt,"verify",return_value=True):
            return opt.integrate_pass(self.root)

    def test_29_pass_image_integrated_and_fallback_preserved(self):
        self.prepare_pass(); self.assertTrue(self.integrate()); text=(self.root/"index.html").read_text()
        self.assertIn('<picture>',text); self.assertIn('assets/generated/images/plain.webp',text)
        self.assertIn('class="hero" alt="Plain" src="plain.png"',text); self.assertIn('loading="lazy" data-x="1"',text)

    def test_30_manual_and_protected_assets_untouched(self):
        self.prepare_pass('<img src="plain.png"><img src="favicon.png">'); (self.root/"favicon.png").write_bytes(png())
        state=json.loads((self.root/opt.STATE).read_text()); state["results"].append({"source":"favicon.png","status":"MANUAL REVIEW"}); (self.root/opt.STATE).write_text(json.dumps(state))
        self.assertTrue(self.integrate()); self.assertIn('<img src="favicon.png">',(self.root/"index.html").read_text())

    def test_31_existing_picture_upgraded_without_nesting(self):
        self.prepare_pass('<picture><img src="plain.png" alt="x"></picture>'); self.assertTrue(self.integrate()); text=(self.root/"index.html").read_text()
        self.assertEqual(text.lower().count("<picture>"),1); self.assertEqual(text.lower().count("<source"),1); self.assertFalse(opt.validate_html(text))

    def test_32_repeated_integration_is_idempotent(self):
        self.prepare_pass(); self.assertTrue(self.integrate()); once=(self.root/"index.html").read_text()
        # Git safety is intentionally absent in the isolated temporary repository.
        self.assertTrue(self.integrate()); self.assertEqual((self.root/"index.html").read_text(),once)

    def test_33_already_integrated_image_unchanged(self):
        self.prepare_pass('<picture><source srcset="assets/generated/images/plain.webp" type="image/webp"><img src="plain.png"></picture>')
        before=(self.root/"index.html").read_text(); self.assertTrue(self.integrate()); self.assertEqual((self.root/"index.html").read_text(),before)

    def test_34_restore_recovers_html_after_integration(self):
        self.prepare_pass(); original=(self.root/"index.html").read_text(); self.assertTrue(self.integrate()); self.assertTrue(opt.restore(self.root))
        self.assertEqual((self.root/"index.html").read_text(),original); self.assertTrue((self.root/"plain.png").exists())

if __name__=="__main__": unittest.main()
