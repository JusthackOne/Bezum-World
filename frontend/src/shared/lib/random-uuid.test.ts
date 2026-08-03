import { describe, expect, it } from "bun:test";

import { createRandomUuid } from "./random-uuid";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("createRandomUuid", () => {
  it("uses the native implementation when it is available", () => {
    const nativeUuid = "12c8eb4c-aee7-4079-8358-e1f8f8fd2d2a";

    expect(createRandomUuid({ randomUUID: () => nativeUuid })).toBe(nativeUuid);
  });

  it("creates a UUID v4 when randomUUID is unavailable", () => {
    const cryptoWithoutRandomUuid = {
      getRandomValues: <T extends ArrayBufferView>(array: T): T => {
        new Uint8Array(array.buffer, array.byteOffset, array.byteLength).fill(0xab);
        return array;
      },
    };

    expect(createRandomUuid(cryptoWithoutRandomUuid)).toMatch(UUID_V4_PATTERN);
  });

  it("creates a UUID v4 when Web Crypto is unavailable", () => {
    expect(createRandomUuid(null, () => 0.5)).toMatch(UUID_V4_PATTERN);
  });
});
