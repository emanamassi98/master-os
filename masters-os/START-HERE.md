# Start here — Masters OS

## 1. Preview your website

Unzip `masters-os-2027.zip`. Inside `masters-os`, open **PREVIEW.html** in Chrome, Firefox or Safari.

The app includes Explore, Applications, Alerts and Profile/Settings. Track a course, tick checklist items and add notes. Progress is saved in that browser; export a backup before switching devices or clearing browser data. Live alerts cannot run from the offline preview.

## 2. Publish as a new website on GitHub

Use a **new repository** such as `masters-os`, so your existing Career OS stays intact. A public repository is the straightforward GitHub Free Pages route. Do not upload personal progress backups, statements or visa documents.

Create an empty repository on GitHub with the name you want. Leave its README, licence and .gitignore creation boxes unchecked if using these commands. In Terminal, go into the extracted `masters-os` folder — the folder that directly contains `package.json`, `src` and `.github` — then run:

```sh
git init -b main
git add .
git commit -m "Add Masters OS for 2027 applications"
git remote add origin https://github.com/YOUR-USERNAME/masters-os.git
git push -u origin main
```

Replace `YOUR-USERNAME` and the repository name with your own. Authenticate with GitHub's normal sign-in flow when asked. Do not share credentials with ChatGPT.

If using GitHub's web upload, upload the extracted **project contents**, not the ZIP itself or the outer folder. Ensure the `.github/workflows` directory is included. On a Mac, press Command+Shift+Period in Finder to show hidden folders. If the web upload misses the workflow files, create each file with **Add file → Create new file** using these exact paths and paste its content:

- `.github/workflows/pages.yml`
- `.github/workflows/monitor.yml`

Then:

1. Open repository **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Open **Actions → Deploy to GitHub Pages → Run workflow** on `main`.
4. When the deployment succeeds, use the URL shown in the run or in Settings → Pages.

Assets use relative paths and routes use URL hashes, so you can choose a repository name without changing the source code. The supplied ZIP includes a lockfile and the workflow builds automatically. You do not need to install Node just to upload the project.

## 3. Enable daily checks and notifications

1. Make sure repository **Settings → General → Features → Issues** is enabled.
2. Open **Settings → Actions → General**. Allow the Actions used by the workflows and enable **Read and write permissions** under Workflow permissions if your repository's policy requires it.
3. Open **Actions → Monitor 2027 opportunities**. Enable it if GitHub says it is disabled, then choose **Run workflow** on `main` once.
4. In the repository's **Watch** menu, select **Custom → Issues**, or watch all activity.
5. In your GitHub account **Settings → Notifications**, enable email and/or GitHub notifications for repositories you are watching. Use a verified email address.
6. Open the website's **Alerts** page after the monitor and Pages deployment finish. It should show a run date, successful baselines and any blocked sources.

The schedule is daily at **07:17 UTC** (07:17 London in winter, 08:17 in summer). GitHub may delay scheduled jobs; this is not a time-critical delivery guarantee. Public-repository schedules can be disabled after 60 days without repository activity. Check the Actions page if the date stops advancing and re-enable the workflow if necessary.

New-year signals open a review issue in your repository. GitHub delivers notifications according to your watching/email preferences. No personal token or email service secret is required: GITHUB_TOKEN is supplied automatically by Actions.

**Alerts require your repository setup; they are not active just because you received this ZIP.** The refresh button loads the latest report; it does not itself crawl university pages. Personal follow-up dates appear on your dashboard but do not send background notifications.

## 4. Use the new-year catalogue

The starting catalogue focuses on **2027/28**; expired scholarship rounds are intentionally absent. Clarendon is included as an automatic Oxford funding route through the linked new-year course applications. It has no separate scholarship form, and its displayed deadline applies to those linked courses. Only verified-open courses carry that label. “Opening to confirm” means that the upcoming course exists, but availability is not yet confirmed.

Scholarship pages showing an older round appear only in the watchlist. Previous-year notes help prioritise what to monitor; they must be rechecked against the new round. For Palestinians living in the UK, some nationality-based awards require residence in Palestine or another country. Sanctuary schemes may include Humanitarian Protection, pending asylum claims or refugees differently, and some require no access to student finance.

When an alert arrives:

1. Read the original university or provider page.
2. Confirm **2027/28**, a future deadline, master's coverage, your residence and immigration status, and financial/academic rules.
3. Use **Explore → Add opportunity** to record it. You can mark accepted statuses and residence restrictions from its published rules.
4. Track it and complete its application checklist.

Custom opportunities stay in your browser. To share a verified opportunity across browsers, add it to `src/data/opportunities.json` and commit it. Export your personal progress separately.

## 5. If something does not work

- **Blank website:** make sure project files are at repository root and Pages Source is GitHub Actions. Check the deploy run's error message.
- **Workflow files missing:** check that `.github/workflows` was uploaded, not just `src` and the ZIP file.
- **Permission denied creating issues:** enable Issues and allow the monitor workflow to write to the repository and Issues.
- **Updates appear in GitHub but not on the website:** wait for the Pages run triggered after monitoring completes, then refresh Alerts.
- **A university is blocked:** Alerts lists it under manual checks. The monitor preserves its old baseline and does not pretend it checked successfully.
- **No scholarship alerts:** an old 2026 page or a future announcement with no opening is not a verified opportunity. Monitoring covers selected sources and can miss unlabelled links or JavaScript-only pages; check providers directly too.
- **Progress appears missing:** use the same browser and website address, or restore your exported JSON backup in Settings.

## Official setup references

- GitHub Pages workflows: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- GitHub notifications: https://docs.github.com/en/subscriptions-and-notifications/get-started/configuring-notifications
- Scheduled workflow behaviour: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- Enabling workflows: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows

The site and workflow code were checked locally. Publishing to your account and actual notification delivery can only be verified after your setup.
