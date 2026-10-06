# Masters OS

A React + TypeScript application adapted from the supplied Career OS project. Tracks software-related master's applications and newly verified scholarship rounds for 2027/28, with a separate funding watchlist relevant to Palestinians living abroad and people seeking sanctuary in the UK.

**Read [START-HERE.md](START-HERE.md) for preview, GitHub Pages and notification setup.**

## Features

- Overview with real preparation progress, your next unchecked task, deadlines and personal follow-up dates.
- Course and scholarship search, part-time/full-time/online filters, and clear verified-open vs unconfirmed labels.
- Per-application checklists, notes, reminders and a five-stage application board.
- Funding profile distinguishes Humanitarian Protection, refugee status and pending asylum claims, plus nationality, residence and student finance access.
- Browser-local progress, JSON export/restore, light/dark themes and responsive layouts.
- Add a verified 2027/28 opportunity with structured nationality, immigration and residence criteria.
- Daily GitHub Actions source monitoring and repository-issue notifications for new-year review signals.

## Freshness policy

The initial catalogue was checked against university pages on **6 October 2026**. It contains six software-related options for 2027: Oxford Software Engineering, Software and Systems Security, Advanced Computer Science; UCL Software Systems Engineering; Imperial Advanced Computing; and the Open University's Computing/Software Engineering route with a published May 2027 module start.

Oxford's three recorded courses and the linked automatic Clarendon consideration route are labelled open. UCL's 2027 course dates are unconfirmed; Imperial's department advertises 2027 entry but the exact application availability needs checking; OU's module start does not establish programme enrolment availability.

**No old scholarship round is listed as a current opportunity.** The funding watchlist records sources to check for a new 2027/28 round. Its previous-year eligibility notes are not 2027/28 promises. Clarendon is included as an automatic funding route for the verified 2027/28 Oxford courses. Its current policy has no nationality or ordinary-residence restriction and no separate scholarship form. The recorded deadline applies to these three linked courses, not every Oxford course. No sanctuary scholarship from an old round is listed.

The app changes a dated opening to closed at its deadline and hides closed entries from the default Explore view. Existing applications remain available for your records. Automatic source checks never silently change a course's verified opening status: new signals need human review. A new deadline or reopening must be checked on the official page and the catalogue updated, or a fresh custom opportunity added.

## Development

Node 24 and Python 3.12+ are used by the supplied workflows. The Python monitor has no extra package dependencies.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview-file
```

`npm run preview-file` generates a standalone `PREVIEW.html` after a build. The ZIP includes it and the prebuilt `dist/` directory. Opening PREVIEW.html works without installing dependencies; live monitoring still requires hosting and the workflow.

## Data and monitoring

- `src/data/opportunities.json`: manually verified starting catalogue, each entry with its official source, cycle and check date.
- `monitor-sources.json`: target year and curated course/funding source pages.
- `scripts/monitor.py`: HTML parsing, next-year signal detection, source baselines, fetch errors and deduplicated report events.
- `public/data/monitor.json`: public report fetched by the website. Initially inactive, so setup is never falsely reported as complete.
- `scripts/notify.mjs`: creates a GitHub issue for previously unnotified signals, using only the workflow's built-in repository token. No personal token or email credentials are needed.
- `notification-history.json`: IDs of notified events. The notifier also checks existing issues before retrying an issue creation whose history write may have failed.

Run `npm run monitor` to test public source checks locally. The first run creates baselines. Scholarship opening signals explicitly mentioning 2027/28 can be reported on a first run; courses already in the starting catalogue are treated as a baseline. New directory links need a next-year marker and a sanctuary, humanitarian, Palestinian, Bseisu, refugee or asylum-related label or URL. Generic music, sports or international merit awards are not discovered by this focused monitor. A generic new link without a year is not treated as a current offer.

Monitoring has deliberate limits: it watches selected pages, does not search the entire internet, can miss JavaScript-only content or generic links without a year, and may encounter anti-bot blocks. Fetch failures retain previous successful baselines and appear in Alerts. A possible opening is never an eligibility guarantee. Sources may change criteria mid-round; always verify before applying.

The monitor workflow commits public report changes. Because a push made with GITHUB_TOKEN does not normally trigger another workflow, Pages also listens for completion of the monitoring workflow and deploys the latest main branch. No monitoring is active until you enable it in your repository.

## Privacy

Application progress and funding profile stay in browser localStorage under `masters-os-v1`. They are not synced, sent to providers, or committed by the monitoring workflow. Exported backups contain your profile and notes; keep them private. Public repository data, reports and alert issues are public if your repository is public. The default profile is a configurable example and no name, income, visa document or contact information is embedded.

## Validation

The supplied checks cover next-year-only starting data, deadline expiry, Humanitarian Protection vs asylum distinctions, nationality/residence exclusions, student finance restrictions, checklist progress and backup validation. Python checks cover rejection of old rounds and footer-year false positives, closed/future rounds, repeat detection, new-year link discovery and error preservation.

The production bundle was also exercised in a DOM simulation: navigation, tracking, progress, notes, stage changes, abbreviation search, scholarship filtering, setup state, profile changes, rejection of stale custom rounds, residence mismatch filtering and valid/invalid backup restore. Live source checks reached 13 of 15 selected sources; two Imperial pages rejected automated access with HTTP 403. A full visual browser check and GitHub publishing/notification delivery were not available in this environment.
