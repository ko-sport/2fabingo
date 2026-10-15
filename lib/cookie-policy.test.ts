import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { needsPartitionedCookies } from "./cookie-policy";

describe("cookie policy", () => {
  it("keeps local HTTP cookies first-party", () => {
    assert.equal(
      needsPartitionedCookies({ host: "127.0.0.1:3847" }),
      false,
    );
    assert.equal(needsPartitionedCookies({ host: "localhost:3847" }), false);
    assert.equal(needsPartitionedCookies({ host: "[::1]:3847" }), false);
  });

  it("partitions when the preview host is not local, even without an Origin", () => {
    assert.equal(
      needsPartitionedCookies({
        host: "127.0.0.1:3847",
        forwardedHost: "ca77ec4f-pod-example-3847.us3.cursorvm.com",
      }),
      true,
    );
    assert.equal(
      needsPartitionedCookies({
        host: "p-3847-pod.example.agent.cvm.dev",
      }),
      true,
    );
    assert.equal(
      needsPartitionedCookies({
        host: "127.0.0.1:3847",
        forwardedProto: "https",
      }),
      true,
    );
  });
});
