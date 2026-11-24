# Bill Tracker

Your fortnightly bill tracker as an app you install from the browser, with no app store.
It signs in with the same Supabase login as **Fortnight Shop**, and every phone and PC signed in stays in sync.

* **Login and sync:** the Fortnight Shop Supabase project (one row in the `docs` table, `col = 'bills'`)
* **Hosting:** GitHub Pages (free)

Your bills never go in this repository. They live in your Supabase project, locked to your login.

## Turn on hosting (once)

In this repository: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.
About a minute later the app is at **https://haydencumner96-max.github.io/bill-tracker/**

## Install

* **Samsung / Android (Chrome):** open the link → **⋮** menu → **Install app** (or **Add to Home screen**) → **Install**.
* **iPhone (Safari):** open the link → **Share** → **Add to Home Screen**.
* **Windows (Chrome or Edge):** open the link → install icon at the right of the address bar.

Open it from the new icon and sign in with your Fortnight Shop email and password.
If you're already signed in to Fortnight Shop in Chrome on that phone, it signs you straight in.

## Bring your bills over from the Claude version (once, on one device)

In the Claude version: **Data → Export**. In the app: **Data → Import** and pick that file.
Every other device signed in picks it up straight away.

## Updating

The tracker's code is `src/app.html` (the same tracker as the claude.ai version) plus `bills-app.js`.
After a change, run `python3 build.py` and push. Devices pick up the new version the next time
they open the app with signal.
