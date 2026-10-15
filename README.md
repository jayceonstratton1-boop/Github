# SnacExpress website

A starter website for **SnacExpress**, a snack bar at 3315 W Court St, Ste 101 (Riverview Plaza), Pasco, WA 99301.

It's plain HTML, CSS and JavaScript with no build step. To see it, open `index.html` in a browser, or drag the folder into Netlify, GitHub Pages or any static host.

## What's on the site

- **Hero:** the "Snack Your Way" slogan from the shop mural, plus a live "Open now / Closed" badge based on Pasco time
- **Menu:** tabs for Drinks, Snacks and Sweets
- **Our Story:** the snack cart to storefront story
- **Gallery:** real photos of the shop, drinks and grand opening
- **Catering & Events:** a request form (works automatically on Netlify)
- **Visit:** address, phone, hours (with today highlighted), payment info and a Google Map
- **Mobile:** a sticky Call / Directions / Menu bar on phones
- **Search:** business details built in so Google can show the hours, address and phone

## Still needed from the owners

Search `index.html` for `TODO(owner)` to find each spot to fill in.

- [ ] Real menu: item names, descriptions and prices (prices currently show `$ —`)
- [ ] Full-size original photos. The ones in `/images` were cropped from Google listing screenshots and enlarged 4x with an AI upscaler (Real-ESRGAN). They look sharper, but small text like signs and the cup logo comes out scrambled. Some were posted by customers, so use the owners' own photos (or get permission) before the site goes live. Keep the same file names to swap them in.
- [ ] Photos of the Hot Cheeto Elote, the dessert cup and the fruit cup (these still use drawings)
- [ ] Logo file, to replace the text logo
- [ ] The owners' own story for the "Our Story" section
- [ ] Catering details: minimum order, packages and how far ahead to book
- [ ] Confirm the hours (taken from Apple Maps / Google; Tuesday is closed)
- [ ] Instagram or Facebook links, if they have them (only TikTok @snacexpress is linked)
- [ ] Whether they want online ordering (e.g. a DoorDash, Uber Eats or Square link)

## Changing the hours

Hours are listed in two places. Update both:

1. The `HOURS` table at the top of `js/main.js`, which drives the open/closed badge
2. The hours table and the `openingHoursSpecification` block in `index.html`
