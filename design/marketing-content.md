---
doc_type: design-system-part
file: design/marketing-content.md
part_of: ../design.md
title: "Module M2 · Marketing and content"
owns: [§M2]
depends_on: [§1, §4, §6, §7, §9, §12, §13]
enabled_by: parts.marketing_content.enabled   # in ../design.md front matter
may_narrow: [§4, §9]   # never contradict
---

# Module M2 · Marketing and content

> Index: [../design.md](../design.md). Read **§0** there first for conventions, ownership and precedence.
> Tokens like `{color.brand.primary}` resolve from **§13** in [core.md](core.md#13-design-tokens-single-source-of-truth).
> Load only if enabled in the index. Each rule here may NARROW a core rule for this medium, written as `NARROWS §N: …`, but MUST NOT contradict it.

## §M2 Marketing and content
**FEEL:** {{…}}

### M2.1 Format templates
```yaml
formats:
  - { name: "Instagram post", size: "1080×1350", safe_area: "{{…}}", template: "templates/ig-post.fig" }
  - { name: "Reel / Short cover", size: "1080×1920", safe_area: "{{top 250px, bottom 340px}}" }
  - { name: "WhatsApp status", size: "1080×1920" }
  - { name: "WhatsApp catalog / broadcast image", size: "{{…}}" }
  - { name: "Meta / Google ad", sizes: ["1080×1080", "1200×628"] }
  - { name: "YouTube thumbnail", size: "1280×720" }
  - { name: "Deck", size: "16:9", template: "{{…}}" }
```
### M2.2 Campaign system
How a campaign gets its own look *inside* the brand: {{one campaign accent, one hero visual, fixed logo placement}}. NARROWS §4: campaign accents must be approved in §13.
### M2.3 Content pillars
| Pillar | Purpose | Formats | Tone (→ §6) |
|---|---|---|---|
| {{…}} | | | |
### M2.4 Calendar hooks
{{Festivals and seasons by region → §12.}}
