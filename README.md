# 2FA Bingo

A million-square bingo card for the six-digit codes you collect through the day. You only ever see one 10×10 grid. Type `250417` and press Find to open `250400 to 250500`, then click `250417` to register it. You can mark the same code more than once - it will go darker with every marking.

Create an account, pair an authenticator, and the card is still there when you come back. The code that signs you in is daubed once each day.

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

Authenticator sign-in is optional. Leave it off and a password is enough. Turn it on when you create the account, or later from the card, and the next sign-in asks for a six-digit code. That code is marked once each UTC day. Later logins the same day do not add another mark. A code from the previous or next 30-second step still counts. Turn it off again any time, including from the code screen.

The sign-in carries a short-lived ticket on the address so a browser that drops the cookie does not send you back to the password. After the code works, the card opens with the session on its address as well.

## Accounts

Passwords are hashed with scrypt. The authenticator secret is stored with the account and is only shown while you are pairing the app. Sessions live in an httpOnly cookie for 30 days.

Locally, squares are stored in SQLite at `data/bingo.db`, which is created on first use and is not committed. On Netlify, set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Without those, a serverless deploy has nowhere to keep accounts.

## Publish on Netlify

Create a Turso database and a token, then in the Netlify site set:

- `TURSO_DATABASE_URL` to the `libsql://` address
- `TURSO_AUTH_TOKEN` to the token

Connect this project and deploy. Netlify detects Next.js. The build command is `npm run build`, and Node 22 is set in `netlify.toml`.

To remove the Powered by Netlify badge for every visitor: Project configuration → General → Powered by Netlify badge → turn it off → Save. That applies on the next request. The Netlify Drawer is only on deploy previews; turn it off under Project configuration → Developer settings → Continuous deployment → Collaboration tools.
