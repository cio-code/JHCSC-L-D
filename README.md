# JHCSC Faculty Learning & Development Portal (FPDP)

Faculty self-assessment (Annex D), Immediate Head competency assessment (Annex C), Learner Needs Survey (Annex G),
printable Individual Development Plan (Annex I) and an L&D analytics / competency-gap report.

Built the same way as EduMatrix:

* **Frontend**: plain HTML/CSS/JS, runs from XAMPP `htdocs` (later GitHub Pages).
* **Backend**: Google Apps Script web app (the API). It checks login and role on every request.
* **Database**: a Google Sheet.

```
Browser (frontend/)  ->  Apps Script web app (backend/)  ->  Google Sheet
```

| Role | Tabs | Can do |
|---|---|---|
| faculty | Annex D, Annex G, Annex I | Fill their **own** self-assessment, survey and IDP goals |
| chair (Immediate Head) | Annex C, Annex I, Analytics | Rate faculty of **their own department**, sign off the IDP, see department analytics |
| admin (L&D) | Analytics, IDP viewer, Users & activity log | See everything (all departments), create and manage accounts |

Roles are enforced on the **server** (`ACTIONS` table in `Config.gs`, scope rules in `Faculty.gs`). Hiding tabs in the browser is only for convenience.

---------------------------------------------------------------------------

## Setup (about 20 minutes)

### 1. Create the Sheet and paste the backend

1. In Google Drive create a new **Google Sheet** (name it e.g. `JHCSC L&D DB`). Keep it private.
2. Open **Extensions > Apps Script** (it must be opened from the Sheet so the script is "bound" to it).
3. Easiest: delete the default code, create **one** file and paste the whole of `backend/JHCSC-LD-all-in-one.gs` into it.
   (Or create one file per `backend/*.gs` file with the same names.)
4. **Project Settings** (gear icon) > tick **Show "appsscript.json" manifest file in editor**, go back and replace its content with `backend/appsscript.json`.

### 2. Create the tabs and the first accounts

1. In `Setup.gs`, change every `CHANGE_ME` password in `SEED_USERS` (8+ characters). Edit names/departments if you like. Save.
2. Select `setupSheets` in the function dropdown and press **Run**. Approve the permission prompt
   ("Advanced > Go to project (unsafe)" appears because it is your own unverified script - this is normal).
3. Select `createInitialUsers` and press **Run**.
4. *(Optional, for testing)* Run `seedSampleData` to fill the three sample faculty with example ratings.
5. Go back to `Setup.gs` and **delete the passwords** from `SEED_USERS`. Save.

### 3. Deploy the API

1. **Deploy > New deployment > type: Web app**.
2. *Execute as*: **Me**. *Who has access*: **Anyone**. (Required so your page can call it - the app's own login protects the data.)
3. **Deploy**, then copy the **Web app URL** (ends with `/exec`). Opening it in a browser should show `"JHCSC L&D Portal API is running."`

> Every time you change backend code: **Deploy > Manage deployments > pencil icon > Version: New version > Deploy**. The URL stays the same.

### 4. Run the frontend on localhost (XAMPP)

1. Copy the **`frontend`** folder to `C:\xampp\htdocs\jhcsc-ld\` (so `index.html` is at `C:\xampp\htdocs\jhcsc-ld\index.html`).
2. Open `js/config.js` and paste your Web app URL into `API_URL`.
3. Start **Apache** in the XAMPP control panel (MySQL is not needed).
4. Open **http://localhost/jhcsc-ld/index.html** (not by double-clicking the file) and sign in.

No XAMPP? From this folder run `npx serve frontend -l 3000` (or `cd frontend && python3 -m http.server 3000`) and open http://localhost:3000.
The pages load Tailwind and Chart.js from a CDN, so the computer needs internet access.

### 5. Put it on GitHub Pages

```bash
git init && git add . && git commit -m "JHCSC L&D portal"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Then **Settings > Pages > Source: GitHub Actions**. The included workflow (`.github/workflows/pages.yml`) publishes the
`frontend/` folder on every push; your site is `https://<you>.github.io/<repo>/`.
`config.js` only holds the Apps Script URL (not a secret), so nothing else changes. **Never commit passwords** (remove them from `SEED_USERS` after setup).

---------------------------------------------------------------------------

## Quick test (5 minutes)

1. Sign in as **admin** > Users & activity log. Create a faculty account (needs a rank and a department) and a chair account with the **same department name**.
2. Sign out, sign in as the **faculty** user: Annex D (rate all 16 items, Save), Annex G (pick topics, Save), Annex I (write goals, Save).
3. Sign in as the **chair**: Annex C > choose the faculty > rate > Save. Annex I shows the calculated gaps; type the sign-off name and Save. Print / export PDF.
4. Chair > L&D Analytics shows the department; **admin** sees all departments (with a department filter).

## Notes on how it works

* **Who sees whom**: a chair sees faculty whose *department* is spelled the same as the chair's department (case ignored). A faculty account is linked to exactly one faculty profile, created together with the account.
* **Ratings** are 1-4 (Novice, Competent, Proficient, Expert). Every item must be answered before saving. The framework (domains, questions, topics) lives only in `backend/Config.gs` (`FRAMEWORK`); the browser loads it - edit it there to change wording or topics.
* **Gap** = Immediate Head average − Self average per domain. A negative gap means the faculty rated themselves higher than the supervisor did. Averages only count faculty who have **both** ratings.
* **IDP**: Parts I-II are calculated, Part III is written by the faculty, the sign-off name by the chair. The admin view is read-only. School year printed on the IDP comes from the `Settings` tab (`schoolYear`).
* **Passwords** are salted and hashed. 5 wrong tries lock that username for 10 minutes. Sessions last 6 hours.
* Limits: Apps Script requests take 1-2 seconds. Fine for a college-sized faculty list.

## Troubleshooting

| Message | Fix |
|---|---|
| "API_URL is not set" | Paste the Web app URL in `frontend/js/config.js`. |
| "Unexpected reply from the server" | The URL must end with `/exec`. Re-deploy as Web app with access set to Anyone. |
| "Cannot reach the server" | Check internet. Use the deployed `/exec` URL, not the editor URL. |
| "Missing sheet tab ..." | Run `setupSheets()` from the Apps Script editor. |
| "Your account is not linked to a faculty profile" | Faculty accounts must be created from Users & activity log (role Faculty) so a profile is made. |
| Chair sees "No faculty found in your department" | The chair's Department must match the faculty's Department text (Users > Edit). |
| Changes to backend code have no effect | Deploy a **new version** (Manage deployments). |
| "Authorization required" in Apps Script | Run any function once from the editor and approve the permissions. |

## Files

```
jhcsc-ld-portal/
  README.md
  .github/workflows/pages.yml
  frontend/
    index.html                login page
    app.html                  main app shell
    css/ styles.css, print.css
    js/  config.js            <- paste your API URL here
         api.js, auth.js, state.js, ui.js, forms.js, charts.js, app.js
         steps/ step1-self.js (Annex D), step2-lns.js (Annex G), step3-chair.js (Annex C),
                step4-idp.js (Annex I), step5-analytics.js, admin-users.js
    assets/logo.png           <- replace with the school logo
  backend/                    (paste into Apps Script)
    appsscript.json, Code.gs, Config.gs, Sheets.gs, Audit.gs, Auth.gs, Users.gs, Faculty.gs,
    Assessments.gs, Analytics.gs, Setup.gs
    JHCSC-LD-all-in-one.gs    <- the same code in ONE file (paste this alone to avoid duplicate-declaration errors)
  sheet/SHEET_STRUCTURE.md
```
