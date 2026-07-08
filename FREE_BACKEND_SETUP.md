# Free Backend Setup

This setup uses only free services:

- GitHub Pages for the website
- Google Sheets for saved proposal data
- Google Apps Script for the backend
- Gmail/Google MailApp for result emails

Your PC does not need to stay on.

## 1. Create the Google Sheet

1. Go to Google Sheets.
2. Create a blank spreadsheet.
3. Name it `Sorry With Love Proposals`.
4. Open `Extensions` -> `Apps Script`.

## 2. Add the Apps Script Backend

1. Delete the sample code in Apps Script.
2. Paste everything from `google-apps-script-backend.gs`.
3. Change this line:

```js
const PUBLIC_SITE_URL = "PASTE_YOUR_GITHUB_PAGES_URL_HERE";
```

Use your GitHub Pages website URL, for example:

```js
const PUBLIC_SITE_URL = "https://yourusername.github.io/your-repo/";
```

4. Save the script.

## 3. Deploy Apps Script

1. Click `Deploy` -> `New deployment`.
2. Select type: `Web app`.
3. Set `Execute as`: `Me`.
4. Set `Who has access`: `Anyone`.
5. Click `Deploy`.
6. Allow the Google permissions.
7. Copy the Web App URL.

## 4. Connect Website to Apps Script

Open `index.html` and replace:

```js
const APPS_SCRIPT_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
```

with the Web App URL you copied.

## 5. Upload to GitHub

Upload these updated files to your GitHub Pages repository:

- `index.html`
- `brick-game.js`
- `google-apps-script-backend.gs` only for your backup, not required by the website

## How It Works

1. You open your GitHub Pages website.
2. You enter your name, email, and their name.
3. The website creates a unique proposal link.
4. You send that link to them.
5. They click Accept or Reject.
6. Google Sheets stores the response.
7. Gmail sends you the result by email.
