import html.parser
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ABOUT = ROOT / "about" / "index.html"


class AboutParser(html.parser.HTMLParser):
    VOID_ELEMENTS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}

    def __init__(self):
        super().__init__()
        self.in_quiet = False
        self.quiet_depth = 0
        self.picture = None
        self.picture_depth = 0

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        classes = set(attributes.get("class", "").split())
        if tag == "section" and "quiet" in classes:
            self.in_quiet = True
            self.quiet_depth = 1
            return
        if self.in_quiet:
            if tag not in self.VOID_ELEMENTS:
                self.quiet_depth += 1
            if tag == "picture" and self.picture is None:
                self.picture = {"attrs": attributes, "sources": [], "img": None}
                self.picture_depth = self.quiet_depth
            elif self.picture is not None and self.quiet_depth >= self.picture_depth:
                if tag == "source":
                    self.picture["sources"].append(attributes)
                elif tag == "img":
                    self.picture["img"] = attributes

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if self.in_quiet:
            self.quiet_depth -= 1

    def handle_endtag(self, tag):
        if not self.in_quiet:
            return
        self.quiet_depth -= 1
        if self.quiet_depth == 0:
            self.in_quiet = False


class AboutConnectionLayoutTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.markup = ABOUT.read_text(encoding="utf-8")
        cls.parser = AboutParser()
        cls.parser.feed(cls.markup)

    def test_picture_is_the_layout_wrapper_with_webp_and_fallback(self):
        picture = self.parser.picture
        self.assertIsNotNone(picture)
        self.assertIn("quiet-media", picture["attrs"]["class"].split())
        self.assertIn("workspace-crop", picture["attrs"]["class"].split())
        self.assertEqual(picture["sources"], [{
            "srcset": "../assets/generated/images/assets/me/IMG_20260427_102547.webp",
            "type": "image/webp",
        }])
        self.assertEqual(picture["img"]["src"], "/assets/me/IMG_20260427_102547.jpg")
        self.assertEqual((picture["img"]["width"], picture["img"]["height"]), ("4000", "1800"))

    def test_wrapper_image_and_copy_have_non_collapsing_rules(self):
        self.assertRegex(self.markup, re.compile(r"\.quiet \.copy \{[^}]*width:100%;[^}]*min-width:0;[^}]*max-width:780px"))
        self.assertRegex(self.markup, re.compile(r"\.quiet > \.quiet-media \{[^}]*width:100%;[^}]*max-width:1184px;[^}]*display:block"))
        self.assertRegex(self.markup, re.compile(r"\.quiet > \.quiet-media > img \{[^}]*width:100%;[^}]*height:auto;[^}]*display:block"))
        self.assertNotIn("calc((100vw - 1184px)/2)", self.markup)


if __name__ == "__main__":
    unittest.main()
