<!-- docs: sync from coderbuzz/codex@cd4a13b -->

# Velox WS Wire — AI Agent Knowledge File

**Package:** `@coderbuzz/velox-ws-wire`
**Purpose:** Binary Wire Protocol codec for WebSocket messages. 80-93% bandwidth reduction vs JSON.
**Distribution:** ESM only (`dist/index.js` + `dist/index.d.ts`).

---

## Mental Model

Typed encode functions per frame type, single `decode()` function for all frames. PING/PONG use pre-allocated singletons for zero-allocation hot path.

```
encodePing()                         → Uint8Array  (pre-allocated singleton)
encodePong()                         → Uint8Array  (pre-allocated singleton)
encodeRequest(corrId, payload)       → Uint8Array
encodeResponse(corrId, payload)      → Uint8Array
encodeSubscribe(topic)               → Uint8Array
encodeUnsubscribe(topic)             → Uint8Array
encodePublish(topic, payload)        → Uint8Array
encodeMessage(topic, payload)        → Uint8Array
encodeAuth(token)                    → Uint8Array
encodeAuthOk(payload?)               → Uint8Array
encodeAuthFail(reason)               → Uint8Array

decode(data)                         → DecodedFrame | null
isWireBinaryFrame(data)              → boolean
```

---

## Import Map

```ts
import {
  decode, encodeAuth, encodeAuthFail, encodeAuthOk,
  encodeMessage, encodePing, encodePong, encodePublish,
  encodeRequest, encodeResponse, encodeSubscribe, encodeUnsubscribe,
  isWireBinaryFrame,
  MsgType,
} from "@coderbuzz/velox-ws-wire";
import type { DecodedFrame, MsgTypeValue } from "@coderbuzz/velox-ws-wire";
```

---

## MsgType Constants

```ts
MsgType.PING       // 0x01
MsgType.PONG       // 0x02
MsgType.REQUEST    // 0x03
MsgType.RESPONSE   // 0x04
MsgType.SUBSCRIBE  // 0x05
MsgType.UNSUBSCRIBE // 0x06
MsgType.PUBLISH    // 0x07
MsgType.MESSAGE    // 0x08
MsgType.AUTH       // 0x09
MsgType.AUTH_OK    // 0x0A
MsgType.AUTH_FAIL  // 0x0B
```

---

## Gotchas

1. `encodePing()`/`encodePong()` return **shared singletons** — do NOT mutate the returned buffer.
2. Topic fields use u8 length prefix → max 255 UTF-8 bytes per topic.
3. Correlation IDs are u32 → range 0–4294967295.
4. `decode()` returns `null` for empty data, truncated frames, or unknown type bytes.
5. No bounds checking on input beyond length checks — only decode trusted data.
6. Payload is raw UTF-8, not MessagePack — callers handle serialization.

---

## Dependencies

None. Standalone codec.
