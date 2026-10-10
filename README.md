# Sip & Co Website

Static website for Sip & Co: a home page, fan favorites, menu, drink picker, both locations (Pasco and the newer Richland shop) with live open/closed status, the company story and a contact form.

## Files
- `site/` – the website itself (this is the only folder Netlify publishes)
  - `index.html` – page content
  - `styles.css` – styling (responsive, mobile menu, phone quick-action bar)
  - `script.js` – mobile nav, menu tabs, location switch and open status, drink picker, contact form
  - `images/` – photos, logo, favicon and the link-preview image (`og-image.jpg`)
- `netlify.toml` – tells Netlify to publish `site/`
- `build-demo.py` – run `python3 build-demo.py` to regenerate `sip-and-co.html`
- `sip-and-co.html` – single-file copy of the site (styles, script and photos built in) for previewing or sharing. Edit `site/`, then regenerate.

## Still to confirm
- Photos in `site/images/` were cropped from screenshots and AI-upscaled 4x (Real-ESRGAN). Original files from Sip & Co. (same file names) would be sharper. A staff member is visible in `cans-counter.jpg`.
- Prices: the menu section shows no prices (the fall drinks had none, so all were removed for consistency). Known in-store prices: board photo for coffee/specialty/most matcha, Pink Wave $7.50; Fan favorites cards and the hero tag still show prices. Cup size unknown.
- Hours (both shops: Mon–Fri 5am–7pm, Sat–Sun 7am–6pm) come from Joe Coffee, Apple Maps and Yelp listings; confirm with the owners. The open/closed status uses these hours.
- Pasco phone number, whether catering is offered. (Instagram: @sip.co__, linked in the fall section, contact section and footer.)

## Before launch
- The link-preview tags and Google business details in `site/index.html` use `https://sip-and-co-bcym.netlify.app/`. If the site gets its own domain, replace that URL.
- Contact form uses Netlify Forms: after the first deploy, turn on form detection (Project configuration > Forms), redeploy, add an email notification to the owners' address, and send a test message.
