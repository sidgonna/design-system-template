---
doc_type: design-system-part
file: design/print.md
part_of: ../design.md
title: "Module M4 · Print and physical"
owns: [§M4]
depends_on: [§3, §4, §5, §9, §13]
enabled_by: parts.print_physical.enabled   # in ../design.md front matter
may_narrow: [§4, §9]   # never contradict
---

# Module M4 · Print and physical

> Index: [../design.md](../design.md). Read **§0** there first for conventions, ownership and precedence.
> Tokens like `{color.brand.primary}` resolve from **§13** in [core.md](core.md#13-design-tokens-single-source-of-truth).
> Load only if enabled in the index. Each rule here may NARROW a core rule for this medium, written as `NARROWS §N: …`, but MUST NOT contradict it.

## §M4 Print and physical
**FEEL:** A handover sheet you can read at the yard gate in the morning.

```yaml
print:
  color_mode: "CMYK; convert from the sRGB role tokens, and match {color.brand.primary} to a solid at the printer."
  bleed: "3mm"
  safe_margin: "5mm"
  paper_and_finish: "Handover sheets on 80 gsm. Pole cards on 300 gsm matte."
  packaging: "No box in this version. The pole card is the object."
  merch: "None in this version."
```
