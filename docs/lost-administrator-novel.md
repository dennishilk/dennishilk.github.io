# Publishing *The Lost Administrator*

> **Never place drafts, Canon notes, planning files or unfinished manuscript content in this public repository.**

Only a finished chapter with explicit author approval may be published:

1. Obtain explicit author approval for the finished chapter.
2. Add only that approved Markdown file to `content/lost-administrator/novel/chapters/`.
3. Add its `number`, `slug`, `title`, and `source` to `novel-manifest.json`. The manifest contains published chapters only.
4. Run `npm run build:novel`.
5. Review the generated chapter, contents, and previous/next navigation.
6. Commit both the approved source and generated public HTML.

The cover already exists at `/assets/lost-administrator/thelostadministrator.webp`. It is used only on the novel landing page and must not be duplicated or renamed without an explicit decision.
