# Native HTML publication plan — do not create public routes yet

## Exact reference implementation reviewed

- EN: `blog/how-fast-can-your-computer-crack-a-password/index.html`
- DE: `de/blog/how-fast-can-your-computer-crack-a-password/index.html`
- Shared stylesheet: `/blog/blog.css?v=20261007-guides`
- Language toggle: `/assets/css/language-toggle.css?v=20261006` and `/assets/js/language-toggle.js?v=20261006`
- Navigation: `/blog/navigation.js?v=20261008`

These two original pages have the established header, footer, breadcrumbs, meta row, `.article-layout`, `.article-copy`, `.mobile-toc` and `.desktop-toc`. Copy the original shell responsibly at **approval time**, not its substantive password-lesson text.

## Proposed HTML skeleton (illustrative only)

```html
<!doctype html><html lang="de"><head>
  <!-- native meta, canonical, hreflang, OG/Twitter, stylesheet and JSON-LD here -->
</head><body id="page-top">
  <!-- exact site skip-link/header/navigation/language-toggle conventions -->
  <main id="main" class="article-main">
    <!-- native breadcrumbs/article-header including actual approved publication date -->
    <div class="article-layout">
      <article class="article-copy" aria-labelledby="article-title">
        <details class="mobile-toc"><summary>In diesem Artikel</summary><ol>…</ol></details>
        <!-- the full approved DE article and 4 authentic DE figure elements -->
        <div class="article-end-nav">…</div>
      </article>
      <aside class="article-sidebar"><nav class="desktop-toc" aria-label="In diesem Artikel"><h2>In diesem Artikel</h2><ol>…</ol></nav></aside>
    </div>
    <!-- existing related-guide convention -->
  </main>
  <!-- exact site-footer convention -->
</body></html>
```

Repeat with independent English copy and English screenshot set. Never insert both languages in one routed page. Keep original canonical and locale switch roles, but use future article's actual target URLs.

## SEO and structured data at approved release

- `<title>`, unique description, robots `index,follow,max-image-preview:large`
- canonical EN `/blog/recover-zip-rar-7z-pdf-password-without-upload/`, DE `/de/blog/zip-rar-7z-pdf-passwort-wiederherstellen/`
- reciprocal hreflang `en`, `de`, `x-default`
- Open Graph `og:type=article`, localized title/description and relevant verified article screenshot/OG image
- Twitter large image card
- Schema.org `BlogPosting` and `BreadcrumbList`; datePublished/dateModified set to actual **future** approved date; author Dennis Hilk, no fake awards/reviews/ratings
- Accessible figures with original source attribution, headings, anchored ToCs and responsive image dimensions

## Search intent, not invented volume

Main DE topic: `ZIP Passwort vergessen / ZIP Passwort wiederherstellen` combined with RAR/7Z/PDF contexts. EN: `forgot ZIP password / recover ZIP password` alongside browser-only/no-upload intent. Distinguish the new article (real encrypted-file recovery) from the existing Password Cracking Lab lesson (invented SHA-256 target and CPU/GPU comparison). No keyword-volume data or ranking guarantees available.

## Gate

No public routes, feed entries, blog listings or sitemaps in this preparation commit. In final publication mission install optimized images, render polished native pages, replace provisional lines with final verified evidence, run validation and *then* amend indices/feeds/sitemaps.
