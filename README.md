# 2FA Bingo

A million-square bingo card for the six-digit codes you collect through the day. You only ever see one 10×10 grid. Type `250417` and press Find to open `250400 to 250500`, then click `250417` to register it. You can mark the same code more than once - it will go darker with every marking.

Create an account with an email and a password, or with Google. You stay signed in for 30 days. The card is where you register six-digit codes you already collect. Signing in does not mark a square. Older accounts can still sign in with the username.

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

An email and a password open the card. Continue with Google does the same, and opens a new card the first time. An older username still works in the email field. Signing in does not ask for another code, and it does not mark a square. The codes on the card are ones you type in yourself.

The card opens with the session on its address, so a browser that drops the cookie still reaches your squares.

## Accounts

Passwords are hashed with scrypt. Sessions live in an httpOnly cookie for 30 days.

Locally, squares are stored in SQLite at `data/bingo.db`, which is created on first use and is not committed. On Netlify, set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Without those, a serverless deploy has nowhere to keep accounts.

## Publish on Netlify

Create an empty Turso database named `bingo` in Ireland (`aws-eu-west-1`). If the form asks for a group, create that first, in the same place, with no replicas. London is not a create location; choosing it comes back as Internal Server Error. If the button errors, refresh the database list before trying again — the database is sometimes created anyway. Leave it empty. The app creates the tables on the first request.

Then in the Netlify site set:

- `TURSO_DATABASE_URL` to the `libsql://` address
- `TURSO_AUTH_TOKEN` to the token
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for Sign in with Google

In Google Cloud, create a web OAuth client. Authorized redirect URI: `https://2fabingo.co.uk/api/auth/google/callback`. Continue with Google is on Log in and Start a card. It opens a new card and does not mark a square. The same Google account returns to that card later. Until the two Google values are set, the button explains that the client ID and secret are still missing.

Connect this project and deploy. Netlify detects Next.js. The build command is `npm run build`, and Node 22 is set in `netlify.toml`. Without those two variables the site says the card has no database yet, instead of failing with an empty server error.

To remove the Powered by Netlify badge for every visitor: Project configuration → General → Powered by Netlify badge → turn it off → Save. That applies on the next request. The Netlify Drawer is only on deploy previews; turn it off under Project configuration → Developer settings → Continuous deployment → Collaboration tools.
