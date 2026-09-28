# Streak

A personal streak tracker built with Angular. Add routines, mark dates complete, and build consistency with a calendar that uses fire icons for completed days.

## Start the app

Requires Node.js 20 or newer and npm.

```bash
npm install
npm start
```

Open the local address printed by Angular CLI (normally `http://localhost:4200`).

## Use it

- Add a streak with a name and emoji.
- Delete any streak from its row; the app asks for confirmation before deleting its history.
- Choose a streak to view its monthly calendar, current run, best run, and monthly progress.
- Mark today complete from the focus panel, or update any past date from the calendar. Future dates cannot be checked off.
- Use **Export JSON** to download a backup, or **Import JSON** to restore one.

## Data and privacy

There is no backend or account. The initial example streaks are loaded from `public/streaks.json`; after first load, edits are saved in this browser's `localStorage`. Browser security prevents a web app from silently writing changes back into a project file, so use JSON export/import to move or back up your data. Clearing browser storage removes locally saved streaks unless you have an export. Data saved in one browser does not automatically sync to another device; import an export on your phone to transfer it.

The responsive layout works on phones and tablets. The GitHub Actions workflow in `.github/workflows/deploy-pages.yml` builds and deploys the app to GitHub Pages whenever changes are pushed to `main`. Enable GitHub Pages with **GitHub Actions** as the build/deployment source in the repository settings. The published URL is `https://<github-user>.github.io/<repository-name>/`.

## Build and tests

```bash
npm run build
npm test -- --watch=false
```
