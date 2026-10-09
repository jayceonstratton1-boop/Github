# Dutch Bros Road 68 — Pasco, WA

An unofficial one-page community website for the Dutch Bros coffee stand on Burden Blvd near Road 68 in Pasco, Washington.

## Run it locally

No build step needed: it is a single static file. Open `index.html` in a browser, or serve it:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Edit store details

Address, ordering note and hours live in the `STORE` object near the bottom of `index.html`. Drinks live in the `MENU` object right below it.

## Publish

`.github/workflows/pages.yml` deploys the site to GitHub Pages on every push to `main`.

One-time setup: in the repository on GitHub, go to **Settings → Pages** and set **Source** to **GitHub Actions**. After the next push to `main` (or running the workflow manually from the **Actions** tab), the site is live at `https://<your-username>.github.io/<repo-name>/`.
