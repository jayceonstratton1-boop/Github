# The New Era Barber Studio website

- `index.html`: the public website
- `book.html`: Angel's booking page. Customers pick a service, time and details and book right on the site
- `admin.html`: staff schedule (PIN protected): see and cancel appointments, block off time
- `kiosk.html`: the walk-in kiosk for a tablet on a stand at the front desk (name, phone, service, barber, live list)
- `checkin.html`: the check-in screen with customer accounts and staff tools (call up, barber in/break/off); shares the kiosk's walk-in list
- `netlify/functions/`: the booking server (`availability`, `bookings`, `admin`) and the sign-up welcome text (`sms-welcome`)
- `netlify/lib/shop.mjs`: barbers, hours and services for online booking. Keep it in sync with `BARBER` in `book.html`

## Turning on online booking

Booking runs on Netlify: the functions in `netlify/functions` store appointments in Netlify Blobs, which
needs no extra account or database. Opened as plain files (or in a preview), the booking page runs in a
preview mode that keeps bookings in that browser only and says so on screen.

1. Deploy the repo to Netlify. `netlify.toml` already sets the build: it copies the site files to `dist/`
   and publishes the functions.
2. In the Netlify dashboard, add these environment variables:
   - `ADMIN_PIN`: the staff PIN for `admin.html`. Make it long (8+ digits); anyone with it can see
     customers' names and phone numbers.
   - `NOTIFY_PHONE` (optional): a 10-digit number that gets a text for every new booking.
   - The Twilio variables below, if you want confirmation texts.
3. Open `/admin.html` on the live site and enter the PIN to see the schedule.

**If Angel keeps using Booksy too:** the two calendars don't talk to each other. Block the times of any
Booksy appointments in `admin.html` (or block whole days) so the website doesn't offer them, or switch
fully to booking on the site.

Run the server tests with `npm install` then `npm test`.

## Turning on sign-up texts

Texts are sent through [Twilio](https://www.twilio.com). The site has to be hosted somewhere that runs the
function in `netlify/functions` (the repo is set up for Netlify). Opening `checkin.html` straight from a
file never sends texts.

1. Create a Twilio account and buy a phone number that can send SMS.
2. Complete Twilio's A2P 10DLC registration for the shop. US carriers block business texts from
   unregistered numbers.
3. In the hosting dashboard, add these environment variables:
   - `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` (from the Twilio console)
   - `TWILIO_FROM_NUMBER`, the Twilio number in `+15095550123` format
   - `KIOSK_KEY`, a long random password
4. Deploy, then on the shop tablet open `checkin.html?key=YOUR_KIOSK_KEY` once. The tablet remembers the
   key and removes it from the address bar. Only devices that have the key can send texts.

Customers have to tick "Text me a confirmation" when signing up. Each number can get one text per minute.
