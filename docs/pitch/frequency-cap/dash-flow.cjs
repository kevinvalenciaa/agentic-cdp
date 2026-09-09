const { chromium } = require("playwright");
const fs = require("node:fs");
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const page = (title, sub, body) => `<!doctype html><meta charset=utf-8><style>
body{margin:0;background:#0c1118;color:#e7ebf1;font:15px/1.5 "IBM Plex Mono","DejaVu Sans Mono",monospace;padding:40px 48px}
h1{font:600 22px "IBM Plex Sans","Liberation Sans",sans-serif;margin:0 0 4px}.sub{color:#8b95a8;margin:0 0 24px;font-family:"IBM Plex Sans","Liberation Sans",sans-serif}
pre{margin:0;white-space:pre-wrap}.k{color:#7fb0ff}.s{color:#f1b862}.n{color:#6fd7ad}.c{color:#8b95a8}.hl{background:rgba(111,215,173,.14);display:inline-block;width:100%}</style>
<h1>${title}</h1><p class=sub>${sub}</p><pre>${body}</pre>`;
const jsonHi = s => esc(s).replace(/"([^"]+)":/g, '<span class=k>"$1"</span>:').replace(/: "([^"]*)"/g, ': <span class=s>"$1"</span>').replace(/: (-?\d[\d.]*|true|false)/g, ': <span class=n>$1</span>');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })).newPage();
  const shot = async (n, full) => { await p.waitForTimeout(700); await p.screenshot({ path: `shots/${n}.png`, fullPage: !!full }); console.log("shot", n); };
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" }); await shot("dash-01-dashboard");
  await p.goto("http://localhost:3000/opportunities", { waitUntil: "networkidle" });
  await p.click("text=Second-purchase SMS to one-time buyers"); await p.waitForTimeout(1200); await shot("dash-02-sms-opportunity-analysis");
  await p.click("[role=tab]:has-text('Plan')"); await p.waitForTimeout(900);
  console.log("plan text:", (await p.innerText("[role=tabpanel]").catch(() => "")).replace(/\s+/g, " ").slice(0, 700));
  await shot("dash-03-sms-opportunity-plan");
  await p.click("button:has-text('Approve & launch')"); await p.waitForTimeout(1500);
  console.log("after launch url:", p.url(), "dialog:", (await p.innerText("[role=dialog]").catch(() => "none")).replace(/\s+/g, " ").slice(0, 400));
  await shot("dash-04-approve-launch");
  const confirm = p.locator("[role=dialog] button:has-text('Launch'), [role=dialog] button:has-text('Confirm'), [role=dialog] button:has-text('Approve')").first();
  if (await confirm.count()) { await confirm.click(); await p.waitForTimeout(1500); console.log("confirmed; url:", p.url()); await shot("dash-04b-launched-confirm"); }
  await p.goto("http://localhost:3000/launched", { waitUntil: "networkidle" }); await p.waitForTimeout(800);
  console.log("launched:", (await p.innerText("main").catch(() => "")).replace(/\s+/g, " ").slice(0, 600));
  await shot("dash-05-launched", true);
  await p.goto("http://localhost:3000/settings", { waitUntil: "networkidle" }); await p.waitForTimeout(600);
  console.log("settings:", (await p.innerText("main").catch(() => "")).replace(/\s+/g, " ").slice(0, 900));
  await shot("dash-06-settings-guardrails", true);
  // the decision bundle the phone downloads
  const bundle = (await (await fetch("http://localhost:3000/api/bundle")).json()).bundle;
  const bjson = JSON.stringify({ bundle_id: bundle.bundle_id, caps: bundle.caps, campaigns: bundle.campaigns.map(c => ({ campaign_id: c.campaign_id, surface: c.surface, eligibility: c.eligibility, arms: c.arms.map(a => a.arm_id + " · " + a.template) })), recent_sends: bundle.recent_sends }, null, 2);
  fs.writeFileSync("shots/_bundle.html", page("GET /api/bundle — the decision bundle the phone downloads", "Served by the dashboard. The rule (weekly_2: max 2 in any 7 days) and the one SMS already logged this week ride along, so the phone can count on its own.", jsonHi(bjson).replace(/(<span class=k>"id"<\/span>: <span class=s>"weekly_2"<\/span>,)/, '<span class=hl>$1</span>')));
  await p.goto("file://" + process.cwd() + "/shots/_bundle.html"); await shot("dash-07-decision-bundle-json", true);
  // backend: the SQL that counts sends
  const caps = fs.readFileSync("../../../packages/core/src/activation/caps.ts", "utf8");
  fs.writeFileSync("shots/_caps.html", page("packages/core/src/activation/caps.ts — the backend count", "Same constant as the bundle. Checking the rule on the server is one GROUP BY over campaign_sends.", esc(caps).replace(/(GROUP BY[^\n]*|HAVING[^\n]*)/g, '<span class=hl>$1</span>')));
  await p.goto("file://" + process.cwd() + "/shots/_caps.html"); await shot("dash-08-backend-count-sql", true);
  // backend: what the phone reported back
  const sup = fs.readFileSync("../../../runs/delivery/suppressions.json", "utf8");
  fs.writeFileSync("shots/_sup.html", page("runs/delivery/suppressions.json — the phone's receipts, tallied", "POST /api/ingest folds every device decision into this aggregate. The suppression the phone decided on its own is now counted on the backend too.", jsonHi(sup).replace(/(<span class=k>"frequency_cap:weekly_2"<\/span>: <span class=n>1<\/span>)/, '<span class=hl>$1</span>')));
  await p.goto("file://" + process.cwd() + "/shots/_sup.html"); await shot("dash-09-suppressions-reported-back", true);
  await b.close();
})().catch(e => { console.error("FAILED", String(e).slice(0, 500)); process.exit(1); });
