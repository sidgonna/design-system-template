---
doc_type: design-system-part
file: design/motion-video.md
part_of: ../design.md
title: "Module M3 · Motion and video"
owns: [§M3]
depends_on: [§5, §6, §10, §11, §12, §13]
enabled_by: parts.motion_video.enabled   # in ../design.md front matter
may_narrow: [§10]   # never contradict
---

# Module M3 · Motion and video

> Index: [../design.md](../design.md). Read **§0** there first for conventions, ownership and precedence.
> Tokens like `{color.brand.primary}` resolve from **§13** in [core.md](core.md#13-design-tokens-single-source-of-truth).
> Load only if enabled in the index. Each rule here may NARROW a core rule for this medium, written as `NARROWS §N: …`, but MUST NOT contradict it.

## §M3 Motion and video
**FEEL:** {{…}}

```yaml
video:
  intro_outro: { file: "motion/intro.mp4", max_length: "{{2s}}" }
  transitions: ["{{cut}}", "{{soft wipe {motion.duration.slow}}}"]
  titles_and_lower_thirds: { font: "{font.family.heading}", template: "motion/lower-third.aep" }
  captions: { font: "{font.family.body}", min_size: "{{5% of frame height}}", style: "{{white on 60% black}}" }
  export: { vertical: "1080×1920 30fps", horizontal: "1920×1080 30fps", codec: "{{H.264}}" }
sound:
  sonic_logo: "{{motion/sonic-logo.wav}}"
  music_mood: "{{…}}"
  voiceover: "{{voice, pace, language → §6, §12}}"
  loudness: "{{-14 LUFS}}"
```
NARROWS §10: video may use longer durations than UI but keeps the same easing personality.
