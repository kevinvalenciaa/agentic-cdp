# Frequency cap segment: bridge script + UX flow shots

Covers the "Here's where it gets interesting" section of the pitch. Two deliverables:

1. A 10-15 s spoken bridge that gives the high-level overview of what was built and lands
   on the rule the agent wrote.
2. Real screenshots of the flow, captured from the running dashboard (`apps/ui`, demo mode)
   and the running phone app (`apps/device`, Expo web build), in the order the script
   walks through them.

## The bridge (about 13 s at your pace)

> So here's the whole thing, end to end. You give it a business goal. The agents read the
> warehouse, rank the opportunities, and the verifier kills the ones that would have
> happened anyway. Whatever survives gets drafted, launched, and measured against a
> holdout, and the result goes back into memory.
>
> Here's where it gets interesting. My agent wrote a rule: don't text anyone more than
> twice a week.

That is 60 words before the existing "Here's where it gets interesting" line, which is
about 13 s at the pace of your recorded take. If it runs long, cut "and the result goes
back into memory" (saves ~2 s). The bridge deliberately ends on "launched, and measured",
because the rule is a *launch* concern, so the segue lands on the same word.

## Shot list, in script order

| # | Script beat | Screenshot | What you're pointing at |
|---|---|---|---|
| 1 | "You give it a business goal… the agents rank the opportunities" | `shots/dash-01-dashboard.png` | Dashboard: proven vs ruled-out, the verifier's rejections up top |
| 2 | "…the verifier kills the ones that would have happened anyway" | `shots/dash-02-sms-opportunity-analysis.png` | The SMS opportunity with lift, p-value, and the Approve & launch button |
| 3 | "Whatever survives gets drafted, launched, and measured" | `shots/dash-04-approve-launch.png` then `shots/dash-05-launched.png` | Approving compiles the audience and drafts variants; Launched shows +10pp vs holdout |
| 4 | "My agent wrote a rule: don't text anyone more than twice a week" | `shots/dash-06-settings-guardrails.png` | Settings → Guardrails → `frequency_cap`: "Max 2 messages per customer per 7 days, machine-enforced, not an LLM judgment" |
| 5 | "But an LLM can't enforce that… the words can't tell you how many texts that person already got" | (talking head, or hold on shot 4) | |
| 6 | "So the cap has to be counted, in code, in two places" | `shots/dash-07-decision-bundle-json.png` | The decision bundle the phone downloads: `weekly_2 · max 2 · P7D`, plus the one SMS already logged this week under `recent_sends` |
| 7 | "[dashboard] Every text the system sends gets logged, so on the backend, checking the rule is just counting" | `shots/dash-08-backend-count-sql.png` | `activation/caps.ts`: one `GROUP BY customer_id HAVING COUNT(*) >= max` over `campaign_sends`, using the same constant as the bundle |
| 8 | "[phone] out here, the phone is deciding on its own, without calling back to the server" | `shots/phone-01-visit1-offer-delivered.png` | First Home visit: the offer is delivered (arm B, the modal) |
| 9 | "…so it keeps its own tally too" | `shots/phone-03-debug-visit1-delivered.png` | Debug panel: `ledger 1 entries`, `LAST DECISION delivered · c_second_purchase_sms · arm B` |
| 10 | "Both sides are enforcing the same rule" | `shots/phone-04-product-open.png` | Open a product (this is the "revisit": leaving Home and coming back is a fresh decision) |
| 11 | "[revisit → suppressed] And there it is, this person already got two this week, so the message never fires" | `shots/phone-05-revisit-suppressed.png` | Second Home visit: no offer. The hero surface renders nothing |
| 12 | "Decided right on the device" | `shots/phone-06-debug-suppressed.png` | Debug panel: `suppressed · c_second_purchase_sms`, reason `frequency_cap:weekly_2:2/2`, trail `capped - frequency_cap:weekly_2:2/2` |
| 13 | (optional tag, if you want to close the loop) | `shots/dash-09-suppressions-reported-back.png` | The phone's receipts, flushed to `/api/ingest` and tallied in `runs/delivery/suppressions.json`: 2 decisions, 1 delivered, 1 suppressed under `weekly_2` |

`shots/dash-03-sms-opportunity-plan.png` and `shots/phone-02-home-after-offer.png` are
spares (the Plan tab before launch, and Home right after dismissing the offer).

The 2/2 in shot 12 is one SMS the backend logged (it rides along in the bundle's
`recent_sends`) plus the in-app delivery the phone recorded in its own ledger on the first
visit. That is the "counted in two places" line made literal: the server's count and the
device's count are merged on the device, and the device decides.

## Reproducing the captures

Both apps run locally with no API key.

```sh
pnpm install && pnpm build:deps

# dashboard, demo mode, anonymous
cd apps/ui && LIFT_MODE=demo LIFT_PUBLIC_DEMO=true pnpm dev -p 3000

# phone app on web, pointed at the dashboard
cd apps/device && EXPO_PUBLIC_LIFT_API=http://localhost:3000 npx expo start --web --port 8081
```

Then, from this folder, with Playwright available:

```sh
node phone-flow.cjs    # visit → offer → debug panel → product → back → suppressed
node dash-flow.cjs     # dashboard, opportunity, approve & launch, settings, generated pages
```

One thing to know: the fixture bundle's logged SMS (`apps/ui/public/bundle.json`,
`recent_sends[0].sent_at`) is dated April 2026. On a real clock that is outside the 7-day
window, so the second visit is suppressed by the per-session cap (`session_1`) instead of
the weekly one. For the captures here that date was set to two days before the run so the
weekly cap is the one that trips; do the same before recording, and restart the dashboard
after editing the file.

The phone app on web needed one fix that is now in the repo: two Google-font packages
pulled their own React copy into the web bundle, which crashed with "Invalid hook call".
`apps/device/metro.config.js` now pins `react` and `react-dom` to the app's copy.
