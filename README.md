# 2FA Bingo

A million-square bingo card for the six-digit codes you collect through the day. Type `250417` or open card 25 and click row 04, column 17. Daub the same code again and the square shows `2×`, `3×`, and a deeper green.

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

## Where a code sits

A code `ABCDEF` is three pairs:

| Digits | Meaning |
| --- | --- |
| `AB` | Card `00`–`99`, laid out in a 10×10 wall |
| `CD` | Row `00`–`99` on that card |
| `EF` | Column `00`–`99` |

`250417` is card 25, row 04, column 17. There are 100 cards and each card is 100×100, so the wall covers `000000` through `999999`.

## Calls

Lines run left to right. A square counts once it has been daubed at least once.

- **Mini-line** — 100 squares in one row of a card
- **Five-stack** — five mini-lines, one under the next, on the same card
- **Mini-house** — all 10,000 squares on one card
- **Full line** — all ten cards in a horizontal band, each one a mini-house
- **Double line** — two full lines, one band under the other
- **Full house** — all 1,000,000 squares

Click a square to daub it. Right-click, or **Remove one**, takes a daub back. Paste several codes at once if you have a list.

**Export** downloads your card as JSON. **Import** replaces the card with that file.

## Logging in

A password is not enough. After you create an account, the next screen shows a QR code and a secret for an authenticator app (the same kind of six-digit codes this card is for). Enter the code the app is showing to confirm the pairing. That confirming code is daubed on your card.

The next time you log in, the password step is followed by another authenticator code. The first successful code each UTC day is daubed for you, even if that square already has a count. Later logins the same day do not add another daub. A code from the previous or next 30-second step still counts.

If you already had an account before authenticator login, the next visit sends you to the pairing screen before the card opens.

## Accounts

Passwords are hashed with scrypt. The authenticator secret is stored with the account and is only shown while you are pairing the app. Sessions live in an httpOnly cookie. Squares are stored in SQLite at `data/bingo.db`, which is created on first use and is not committed.

Run this on a machine with a persistent disk. A serverless host that wipes the filesystem will forget accounts when the instance shuts down.
