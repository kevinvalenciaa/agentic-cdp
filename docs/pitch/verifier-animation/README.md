# Verifier + memory cutaway

A 40-second animated cutaway for the Hightouch pitch video, covering 3:17-3:57 of the cut.
It is timed to the recorded take (138 words in about 40 s, with a short breath between lines):

| Start | End | Line |
|---|---|---|
| 0.0 | 3.0 | That verification agent is the part I care the most about. |
| 3.3 | 6.0 | And so mine doesn't just use an LLM as a judge — |
| 6.0 | 8.5 | it also runs seasonal decomposition against historical baselines. |
| 8.8 | 14.0 | And so if an insight can't beat its own baseline, it never ends up making it out of the run. |
| 14.3 | 17.0 | And also, every run also writes back to structured memory. |
| 17.3 | 20.2 | For example, which audiences don't convert regardless of the offer, |
| 20.2 | 22.5 | or which ones don't respond to SMS. |
| 22.8 | 27.4 | And so I always make sure that the next run always starts smarter than the last one. |
| 27.7 | 31.0 | And another thing to note is that the data never actually moves. |
| 31.3 | 34.3 | The agents are able to query the warehouse through an MCP, |
| 34.6 | 40.0 | and then the AI goes to where that context actually lives, instead of copying the context to the AI. |

What is on screen, in order: the four-agent chain with the Verifier lit; an "LLM as judge"
card that grounds a Q4 spike, then collapses into a chip as the STL decomposition is added
beside it; the two-year conversions series split into trend, seasonal and residual; the
baseline band; the Q4 candidate stamped KILLED (`explained_by_seasonality`) and dropped; the
cart-abandon candidate stamped VERIFIED (`real_lift`) and passed to a human; the memory
table filling through the verified-only write gate, including the audience that never
converts and the audience that never answers SMS; the loop back to the Explorer, and the
next run's hypotheses with three skipped from memory and one boosted. The close is the
warehouse behind the MCP boundary: a `run_metric` call crosses to the data, one number comes
back into the context window, and a ghosted "copy every row" attempt is crossed out at the
boundary.

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
