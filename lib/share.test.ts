import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { progressBar, setPercentLabel, shareCard } from "./share";

describe("share card", () => {
  it("fills a bar in tenths", () => {
    assert.equal(progressBar(10, 10), "🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩");
    assert.equal(progressBar(0, 1_000_000), "⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜");
    assert.equal(progressBar(100_000, 1_000_000), "🟩⬜⬜⬜⬜⬜⬜⬜⬜⬜");
  });

  it("names each 0.1 percent from a thousand squares", () => {
    assert.equal(setPercentLabel(1_000), "0.1%");
    assert.equal(setPercentLabel(11_000), "1.1%");
    assert.equal(setPercentLabel(10_000), "1%");
  });

  it("builds a Wordle-style message", () => {
    const card = shareCard("I completed a line! 000000 to 000010", 10, 10);
    assert.equal(card.text, "2FA Bingo\nI completed a line! 000000 to 000010\n🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩");
    const way = shareCard("I’m 0.1% of the way to the whole set!", 1_000, 1_000_000, "0.1%");
    assert.match(way.text, /I’m 0\.1% of the way to the whole set!\n⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 0\.1%/);
  });
});
