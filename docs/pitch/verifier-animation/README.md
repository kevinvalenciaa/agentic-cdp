# Verifier + memory cutaway

A 33-second animated cutaway for the Hightouch pitch video. It covers this stretch of the
script, timed at a normal speaking pace (about 142 words per minute, with the beats the
script asks for):

| Start | End | Line |
|---|---|---|
| 0.0 | 3.8 | That verifier is the part I care most about. |
| 4.8 | 8.6 | So mine doesn't just use an LLM as a judge. |
| 8.6 | 12.0 | It runs seasonal decomposition against historical baselines — |
| 12.5 | 18.8 | and if an insight can't beat its own baseline, it never makes it out of the run. |
| 19.6 | 22.6 | Every run also writes back structured memory. |
| 22.6 | 25.6 | Which audiences don't convert regardless of offer. |
| 25.6 | 27.6 | Which ones respond to SMS. |
| 27.6 | 31.6 | So the next run starts smarter than the last one. |
| 31.6 | 33.0 | hold |

What is on screen, in order: the four-agent chain with the Verifier lit; an "LLM as judge"
card that approves a Q4 spike and gets struck through; the two-year conversions series
decomposed by STL into trend, seasonal and residual; the baseline band; the Q4 candidate
stamped KILLED (`explained_by_seasonality`) and dropped; the SMS candidate stamped
VERIFIED (`real_lift`) and passed to a human; the memory table filling through the
verified-only write gate; the dead-end audience and the SMS audience; the loop back to the
Explorer, and the next run's hypotheses with two skipped from memory and one boosted.

## Files

- `index.html` - the animation. Open it in a browser: space or the button plays, the slider
  scrubs, the checkbox overlays the transcript line being spoken. Everything is a pure
  function of time (`render(t)`), so any frame can be reproduced exactly.
- `render.mjs` - renders the HTML to `out/verifier-animation.mp4` (1920x1080, 30 fps, H.264).
  `--captions` burns the transcript lines in; `--sheet` writes a keyframe contact sheet.

```sh
# needs playwright and an ffmpeg with libx264
pnpm dlx playwright install chromium   # once
FFMPEG=/path/to/ffmpeg node docs/pitch/verifier-animation/render.mjs
```

## Retiming

All timings live in two places at the top of `index.html`: `CAPTIONS` (when each line is
spoken) and `T` (when each visual beat starts and ends). If a take runs long or short,
shift the entries in `T` for that section; nothing else depends on absolute times.
