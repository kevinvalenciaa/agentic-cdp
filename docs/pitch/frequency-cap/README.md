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
> happened anyway. Each opportunity that survives gets drafted into a campaign, launched,
> and measured against a control group, and the result goes back into memory.
>
> Here's where it gets interesting. My agent wrote a rule: don't text anyone more than
> twice a week.

That is 64 words before the existing "Here's where it gets interesting" line, which is
about 13 s at the pace of your recorded take. If "control group" feels too clinical on
camera, "measured against customers who didn't get it" says the same thing in plain words. If it runs long, cut "and the result goes
back into memory" (saves ~2 s). The bridge deliberately ends on "launched, and measured",
because the rule is a *launch* concern, so the segue lands on the same word.

## The rest of the segment, in the take's voice

The original copy is accurate but written. This is the same argument at the pace and
register of the recorded take:

> So the cap has to actually be counted, in code, and it has to be counted in two places.
>
> [dashboard] Every text the system sends gets logged. So on the backend, checking the rule
> is basically just counting how many this person already got this week.
>
> [phone] But out here, the phone is deciding on its own whether to show the message. It's
> not calling back to the server. So it keeps its own count too.
>
> And so both sides are enforcing the exact same rule, no more than two a week. Because if
> the backend only knows about the texts it sent, and the phone only knows about what it
> showed, then neither one actually knows this person is already at two. And they get a
> third.
>
> [revisit → suppressed] And there it is. This person already got two this week, so the
> message never fires. That was decided right on the phone.

The failure case is phrased to match the captures: the 2/2 on the phone is one SMS the
backend logged plus one message the phone showed, so the risk is each side seeing only
its own half. Shorter alternative for the long sentence: "Because if only one side is
counting, this person ends up with a third."

## Shot list, in script order

| Script | On screen |
|---|---|
| "So here's the whole thing, end to end. You give it a business goal." | Talking head, or `shots/dash-01-dashboard.png` |
| "The agents read the warehouse, rank the opportunities, and the verifier kills the ones that would have happened anyway." | `shots/dash-01-dashboard.png`. Left column: ranked survivors. Right column "Ruled out overnight": the verifier's kills. |
| "Each opportunity that survives gets drafted into a campaign," | `shots/dash-02-sms-opportunity-analysis.png`, then `shots/dash-04-approve-launch.png` on "drafted" ("Compiling the audience… drafts on-brand message variants"). |
| "launched, and measured against a control group, and the result goes back into memory." | `shots/dash-05-launched.png`: "live · measuring", +10.0pp lift, holdout vs treatment. |
| "Here's where it gets interesting. My agent wrote a rule: don't text anyone more than twice a week." | `shots/dash-06-settings-guardrails.png`, landing on the `frequency_cap` card. |
| "But an LLM can't enforce that. It's judging the words in the message, and the words can't tell you how many texts that person already got." | Hold on the card; its text ends "machine-enforced… not an LLM judgment". |
| "So the cap has to actually be counted, in code, and it has to be counted in two places." | `shots/dash-07-decision-bundle-json.png`: the `weekly_2 · max 2 · P7D` block, and `recent_sends` below. |
| "[dashboard] Every text the system sends gets logged." | Stay on `dash-07`, pointing at `recent_sends`. |
| "So on the backend, checking the rule is basically just counting how many this person already got this week." | `shots/dash-08-backend-count-sql.png`: the highlighted `GROUP BY … HAVING COUNT(*) >= max`. |
| "[phone] But out here, the phone is deciding on its own whether to show the message. It's not calling back to the server." | `shots/phone-01-visit1-offer-delivered.png`: first visit, the offer shows. |
| "So it keeps its own count too." | `shots/phone-03-debug-visit1-delivered.png`: `ledger 1 entries`, `LAST DECISION delivered`. |
| "And so both sides are enforcing the exact same rule, no more than two a week." | Split screen: `dash-07` (weekly_2) beside `phone-03` (ledger). |
| "Because if the backend only knows about the texts it sent, and the phone only knows about what it showed, then neither one actually knows this person is already at two. And they get a third." | `shots/phone-04-product-open.png`: the revisit action. Leaving Home and coming back triggers the next decision. |
| "[revisit → suppressed] And there it is. This person already got two this week, so the message never fires." | `shots/phone-05-revisit-suppressed.png`: back on Home, no offer. |
| "That was decided right on the phone." | `shots/phone-06-debug-suppressed.png`: `suppressed · c_second_purchase_sms`, reason `frequency_cap:weekly_2:2/2`. Hold on the reason line. |
| Optional tag, no script line | `shots/dash-09-suppressions-reported-back.png`: the phone's receipt tallied on the server, 1 suppressed under weekly_2. |

Spares: `shots/dash-03-sms-opportunity-plan.png` (Plan tab before launch) and
`shots/phone-02-home-after-offer.png` (Home right after dismissing the offer).

The 2/2 on the phone's reason line is one SMS the backend logged (it rides along in the
bundle's `recent_sends`) plus the in-app delivery the phone recorded in its own ledger on
the first visit. The server's count and the device's count are merged on the device, and
the device decides.

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
