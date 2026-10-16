# Accessibility Issue Tracker

The Accessibility Issue Tracker is a small web app for recording and managing accessibility issues found on websites. It has a browser-based interface, an Express API, and a SQLite database.

## Live Demo

**Live Website:** https://accessibility-issue-tracker.onrender.com/

## Features
1. Create and manage accessibility issues
2. Categorize issues by severity
3. rack issue status and history
4. Filter issues by status and severity
5. Validate issue details
6. Store issues in SQLite
7. REST API built with Node.js and Express
## Requirements

Node.js 20 LTS or a compatible supported version
npm

## Run the app locally

1. Open a terminal in the project folder.
2. Install the dependencies:

   ```bash
   npm install
   ```

3. Start the server:

   ```bash
   npm start
   ```

4. Open `http://localhost:3000` in your browser.
5. Choose Alice or Bob and select **Sign in**.

The app creates its SQLite database at `data/tracker.sqlite`. The file keeps saved issues between restarts, so leave it in place if you want to retain your local data.

## Demo users

Alice — demo user ID `1`
Bob — demo user ID `2`

These accounts are for local testing only. The app uses a demo identity sent in a request header; this is not real authentication. Do not expose the demo app to the public internet or use it to store real personal information.

## What it can do

1. Create, view, and edit accessibility issues.
2. Check that an issue has a title and a page URL using HTTP or HTTPS.
3. Record the WCAG criterion, severity, status, and timestamps.
4. Filter issues by status and severity.
5. Keep each user's issues separate through backend ownership checks.
6. Track status changes in a history log.
7. Save data in SQLite.
8. Provide interface features such as form labels, a skip link, visible focus styles, text labels for status and severity, and live regions for messages.

These interface features are useful starting points, but they do not by themselves prove that the app conforms to WCAG.

## Status workflow

The backend allows these status changes:

1. `Open` → `In Progress`
2. `In Progress` → `Open`
3. `In Progress` → `Resolved`
4. `Resolved` → `Open`

Other transitions are rejected. The status history records the changes made to an issue.

## Run the tests

```bash
npm test
```

The current tests check that an invalid status transition is rejected, one user cannot read another user's issue, and invalid page URLs are rejected.

## Project documentation

[Architecture](ARCHITECTURE.md) explains the current app structure and outlines possible production changes.
[Accessibility checks](ACCESSIBILITY.md) records the manual, automated, and screen-reader checks that still need to be completed.

## Current limitations

Sign-in is a local demo and is not secure authentication.
The issue list loads all issues belonging to the current demo user; a production version should add pagination.
Team sharing, password management, screenshot attachments, email notifications, and production deployment are not implemented.
Accessibility checks must be completed and their actual results recorded before making a claim about WCAG conformance.

