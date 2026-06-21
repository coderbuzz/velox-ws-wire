import { test, expect } from "bun:test";
import { MsgType, encodePing, encodeRequest, decode, isWireBinaryFrame } from "@coderbuzz/velox-ws-wire";

test("encodePing roundtrip", () => {
  const buf = encodePing();
  expect(isWireBinaryFrame(buf)).toBe(true);
  const decoded = decode(buf);
  expect(decoded?.type).toBe(MsgType.PING);
});

test("encodeRequest roundtrip", () => {
  const buf = encodeRequest(1, "hello");
  const decoded = decode(buf);
  expect(decoded?.type).toBe(MsgType.REQUEST);
  if (decoded?.type === MsgType.REQUEST) {
    expect(decoded.corrId).toBe(1);
    expect(decoded.payload).toBe("hello");
  }
});