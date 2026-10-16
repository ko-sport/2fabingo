# 2FA Bingo

A million-square bingo card for the six-digit codes you collect through the day. You only ever see one 10×10 grid. Type `250417` and press Find to open `250400 to 250500`, then click `250417` to register it. You can mark the same code more than once - it will go darker with every marking.

Create an account with an email and a password, or with Google. Stay signed in for 30 days. Choose 2FA via an authenticator app or email, or just a password. A code from the app or from the email is daubed once each day. A password on its own is not. Google Authenticator works for the app. Older accounts can still sign in with the username.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

```bash
npm test
```

## Three grids

Only one grid is on screen.

| Grid | What a square holds | Example |
| --- | --- | --- |
| The set | 10,000 codes | `000000 to 010000` |
| A block | 100 codes | `000000 to 000100` |
| A hundred | one code | `000042` |

`250417` is in the block `250000 to 260000`, the hundred `250400 to 250500`, and the square `250417`.

**Find** opens that hundred and does not register the code. Click the square to register it. Click it again for `2×`, `3×`, and a darker green. Right-click, or **Remove one**, takes a registration back.

On the set and on a block, a square’s green is how much of it is already registered. A full hundred, a full block of 10,000, and the full set each get a stamp.

**Export** downloads your card as JSON. **Import** replaces the card with that file.

## Logging in

You stay signed in for 30 days. Opening the card starts that window again, so it lapses after 30 days away.

Choose the second step when you create the account, or later from the card.

A password on its own opens the card. An authenticator app asks for a six-digit code that changes every 30 seconds. A code from the previous or next step still counts. Email sends a six-digit code that lasts 10 minutes. Either code is marked once each UTC day. Later sign-ins the same day do not add another mark. From the code screen you can switch back to a password only.

Email codes are sent with Resend. On Netlify set `RESEND_API_KEY`, and `EMAIL_FROM` once `2fabingo.co.uk` is a verified sender (for example `2FA Bingo <codes@2fabingo.co.uk>`). Until those exist, choosing email explains that the sender is missing. Locally, with no key, the code is shown on the sign-in page so you can try the step.

The sign-in carries a short-lived ticket on the address so a browser that drops the cookie does not send you back to the password. After the code works, the card opens with the session on its address as well.

## Accounts

Passwords are hashed with scrypt. The authenticator secret is stored with the account and is only shown while you are pairing the app. Sessions live in an httpOnly cookie for 30 days.

Locally, squares are stored in SQLite at `data/bingo.db`, which is created on first use and is not committed. On Netlify, set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Without those, a serverless deploy has nowhere to keep accounts.

## Publish on Netlify

Create an empty Turso database named `bingo` in Ireland (`aws-eu-west-1`). If the form asks for a group, create that first, in the same place, with no replicas. London is not a create location; choosing it comes back as Internal Server Error. If the button errors, refresh the database list before trying again — the database is sometimes created anyway. Leave it empty. The app creates the tables on the first request.

Then in the Netlify site set:

- `TURSO_DATABASE_URL` to the `libsql://` address
- `TURSO_AUTH_TOKEN` to the token
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for Sign in with Google
- `RESEND_API_KEY` to send email sign-in codes, and `EMAIL_FROM` once the domain can send

In Google Cloud, create a web OAuth client. Authorized redirect URI: `https://2fabingo.co.uk/api/auth/google/callback`. Continue with Google is on Log in and Start a card. It opens a new card and does not mark a square. The same Google account returns to that card later. Until the two Google values are set, the button explains that the client ID and secret are still missing.

Connect this project and deploy. Netlify detects Next.js. The build command is `npm run build`, and Node 22 is set in `netlify.toml`. Without those two variables the site says the card has no database yet, instead of failing with an empty server error.

To remove the Powered by Netlify badge for every visitor: Project configuration → General → Powered by Netlify badge → turn it off → Save. That applies on the next request. The Netlify Drawer is only on deploy previews; turn it off under Project configuration → Developer settings → Continuous deployment → Collaboration tools.
