// Renders index.html to an MP4 (1920x1080, 30 fps) by seeking the deterministic
// timeline frame by frame and piping PNGs into ffmpeg.
//
//   node render.mjs                     -> out/verifier-animation.mp4
//   node render.mjs --captions          -> burns the transcript captions in
//   node render.mjs --sheet             -> out/contact-sheet.png (keyframes only)
//   FFMPEG=/path/to/ffmpeg node render.mjs
//
// Needs `playwright` resolvable (pnpm add -D playwright, or NODE_PATH=/path/to/global/node_modules).
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
// CommonJS require honors NODE_PATH, so a global playwright install works too.
const { chromium } = createRequire(import.meta.url)("playwright");

const here = dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const FPS = 30;
const captions = args.has("--captions");
const ffmpeg = process.env.FFMPEG || "ffmpeg";
const outDir = resolve(here, "out");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const url = pathToFileURL(resolve(here, "index.html")).href + `?render=1${captions ? "&captions=1" : ""}`;
await page.goto(url);
await page.evaluate(() => document.fonts.ready);
const duration = await page.evaluate(() => window.__duration);

if (args.has("--sheet")) {
  const times = [0.2, 1.8, 7.9, 10.6, 12.3, 14.8, 15.5, 16.4, 17.9, 18.3, 22.4, 24.0, 26.5, 29.0, 31.5, 32.9];
  const shots = [];
  for (const t of times) {
    await page.evaluate(t => window.__seek(t), t);
    shots.push({ t, png: await page.screenshot({ type: "png" }) });
  }
  const cols = 4, w = 480, h = 270;
  const sheet = await page.evaluate(async ({ shots, cols, w, h }) => {
    const c = document.createElement("canvas");
    c.width = cols * w; c.height = Math.ceil(shots.length / cols) * h;
    const ctx = c.getContext("2d");
    for (let i = 0; i < shots.length; i++) {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = "data:image/png;base64," + shots[i].png; });
      const x = (i % cols) * w, y = Math.floor(i / cols) * h;
      ctx.drawImage(img, x, y, w, h);
      ctx.fillStyle = "rgba(0,0,0,.7)"; ctx.fillRect(x, y, 70, 24);
      ctx.fillStyle = "#fff"; ctx.font = "16px monospace"; ctx.fillText(shots[i].t.toFixed(1) + "s", x + 6, y + 17);
    }
    return c.toDataURL("image/png").split(",")[1];
  }, { shots: shots.map(s => ({ t: s.t, png: s.png.toString("base64") })), cols, w, h });
  const { writeFileSync } = await import("node:fs");
  writeFileSync(resolve(outDir, "contact-sheet.png"), Buffer.from(sheet, "base64"));
  console.log("wrote", resolve(outDir, "contact-sheet.png"));
  await browser.close();
  process.exit(0);
}

const outFile = resolve(outDir, captions ? "verifier-animation-captions.mp4" : "verifier-animation.mp4");
const ff = spawn(ffmpeg, [
  "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "medium", "-movflags", "+faststart", outFile,
], { stdio: ["pipe", "inherit", "inherit"] });
// Playwright's own ffmpeg build cannot encode H.264 - fail loudly instead of hanging on a dead pipe.
let ffDead = null;
ff.on("error", e => { ffDead = e; });
ff.on("close", code => { if (code !== 0) ffDead = new Error(`ffmpeg exited ${code} (needs a build with libx264, e.g. FFMPEG=$(python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'))`); });
ff.stdin.on("error", () => {});

const frames = Math.round(duration * FPS);
for (let i = 0; i < frames; i++) {
  const t = i / FPS;
  await page.evaluate(t => window.__seek(t), t);
  const png = await page.screenshot({ type: "png" });
  if (ffDead) throw ffDead;
  if (!ff.stdin.write(png)) await Promise.race([new Promise(r => ff.stdin.once("drain", r)), new Promise(r => ff.once("close", r))]);
  if (i % 60 === 0) process.stdout.write(`\rframe ${i}/${frames}`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on("close", code => (code === 0 ? res() : rej(ffDead || new Error(`ffmpeg exited ${code}`)))));
console.log(`\nwrote ${outFile} (${frames} frames, ${duration}s)`);
await browser.close();
