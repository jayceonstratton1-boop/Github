# The New Era Barber Studio website

- `index.html`: the public website
- `book.html`: Angel's booking page, for booking from your phone
- `kiosk.html`: the walk-in kiosk for a tablet on a stand at the front desk (name, phone, service, barber, live list)
- `checkin.html`: the check-in screen with customer accounts and staff tools (call up, barber in/break/off); shares the kiosk's walk-in list
- `netlify/functions/sms-welcome.mjs`: sends the welcome text when a customer signs up with "Text me a confirmation" ticked

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
