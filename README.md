# 2FA Bingo

A million-square bingo card for the six-digit codes you collect through the day. You only ever see one 10×10 grid. Type `250417` and press Find to open `250400–250500`, then click `250417` to register it. Register it again and that square goes a darker green.

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
| The set | 10,000 codes | `000000–010000` |
| A block | 100 codes | `000000–000100` |
| A hundred | one code | `000042` |

`250417` is in the block `250000–260000`, the hundred `250400–250500`, and the square `250417`.

**Find** opens that hundred and does not register the code. Click the square to register it. Click it again for `2×`, `3×`, and a darker green. Right-click, or **Remove one**, takes a registration back.

On the set and on a block, a square’s green is how much of it is already registered. A full hundred, a full block of 10,000, and the full set each get a stamp.

**Export** downloads your card as JSON. **Import** replaces the card with that file.

## Logging in

A password is not enough. After you create an account, the next screen shows a QR code and a secret for an authenticator app (the same kind of six-digit codes this card is for). Enter the code the app is showing to confirm the pairing. That confirming code is daubed on your card.

The next time you log in, the password step is followed by another authenticator code. The first successful code each UTC day is daubed for you, even if that square already has a count. Later logins the same day do not add another daub. A code from the previous or next 30-second step still counts.

If you already had an account before authenticator login, the next visit sends you to the pairing screen before the card opens.

## Accounts

Passwords are hashed with scrypt. The authenticator secret is stored with the account and is only shown while you are pairing the app. Sessions live in an httpOnly cookie. Squares are stored in SQLite at `data/bingo.db`, which is created on first use and is not committed.

Run this on a machine with a persistent disk. A serverless host that wipes the filesystem will forget accounts when the instance shuts down.
