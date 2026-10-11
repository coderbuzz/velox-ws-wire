<!-- docs: sync from coderbuzz/codex@956f0b5 -->

# Velox WS Wire: AI Agent Knowledge File

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
import type {
  DecodedFrame, MsgTypeValue,
  DecodedPing, DecodedPong, DecodedRequest, DecodedResponse,
  DecodedSubscribe, DecodedUnsubscribe, DecodedPublish, DecodedMessage,
  DecodedAuth, DecodedAuthOk, DecodedAuthFail,
} from "@coderbuzz/velox-ws-wire";
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

## DecodedFrame Type

```ts
type DecodedFrame =
  | { type: MsgType.PING }                                   // 1 byte
  | { type: MsgType.PONG }                                   // 1 byte
  | { type: MsgType.REQUEST;  corrId: number; payload: string }
  | { type: MsgType.RESPONSE; corrId: number; payload: string }
  | { type: MsgType.SUBSCRIBE; topic: string }
  | { type: MsgType.UNSUBSCRIBE; topic: string }
  | { type: MsgType.PUBLISH; topic: string; payload: string }
  | { type: MsgType.MESSAGE; topic: string; payload: string }
  | { type: MsgType.AUTH; payload: string }
  | { type: MsgType.AUTH_OK; payload: string }   // '' when no data
  | { type: MsgType.AUTH_FAIL; payload: string };
```

---

## Wire Format Specifications

### Frame Layout

| Offset | Size | Field |
|---|---|---|
| 0 | 1 byte | Type byte (one of MsgType) |
| 1+ | variable | Type-specific payload |

### PING / PONG (1 byte total)

```
Byte 0: 0x01 (PING) or 0x02 (PONG)
```
Pre-allocated singleton `Uint8Array(1)`, zero allocation.

### REQUEST / RESPONSE (5+ bytes)

```
Byte 0: 0x03 (REQUEST) or 0x04 (RESPONSE)
Bytes 1-4: u32 correlation ID (big-endian)
Bytes 5+:  UTF-8 payload string
```

Correlation IDs are u32 → range 0–4294967295.

### SUBSCRIBE / UNSUBSCRIBE (2+ bytes)

```
Byte 0: 0x05 (SUBSCRIBE) or 0x06 (UNSUBSCRIBE)
Byte 1: u8 topic length (0-255)
Bytes 2+: UTF-8 topic string
```

### PUBLISH / MESSAGE (2+ bytes)

```
Byte 0: 0x07 (PUBLISH) or 0x08 (MESSAGE)
Byte 1: u8 topic length (0-255)
Bytes 2..topicLen+1: UTF-8 topic string
Bytes topicLen+2+: UTF-8 payload string
```

### AUTH (1+ bytes)

```
Byte 0: 0x09 (AUTH)
Bytes 1+: UTF-8 token string
```

### AUTH_OK / AUTH_FAIL (1+ bytes)

```
Byte 0: 0x0A (AUTH_OK) or 0x0B (AUTH_FAIL)
Bytes 1+: UTF-8 payload (optional for AUTH_OK, reason for AUTH_FAIL)
```

---

## Encode/Decode API

### encodePing / encodePong

```ts
const ping = encodePing(); // Uint8Array [0x01]
const pong = encodePong(); // Uint8Array [0x02]
// Both return shared singletons, do NOT mutate
```

### encodeRequest / encodeResponse

```ts
const req = encodeRequest(42, JSON.stringify({ method: "getUser" }));
const res = encodeResponse(42, JSON.stringify({ id: 1, name: "Alice" }));
```

### encodeSubscribe / encodeUnsubscribe

```ts
const sub = encodeSubscribe("chat");
const unsub = encodeUnsubscribe("chat");
```

### encodePublish / encodeMessage

```ts
const pub = encodePublish("chat", JSON.stringify({ text: "hello" }));
const msg = encodeMessage("chat", JSON.stringify({ text: "hello" }));
```

### encodeAuth / encodeAuthOk / encodeAuthFail

```ts
const auth = encodeAuth("my-token");
const ok = encodeAuthOk();        // no payload
const ok2 = encodeAuthOk(JSON.stringify({ userId: "u1" }));
const fail = encodeAuthFail("bad token");
```

### decode(data)

```ts
const frame = decode(ping);
if (frame) {
  switch (frame.type) {
    case MsgType.PING:       // { type: 0x01 }
    case MsgType.REQUEST:    // { type: 0x03, corrId: 42, payload: '...' }
    case MsgType.SUBSCRIBE:  // { type: 0x05, topic: 'chat' }
    case MsgType.PUBLISH:    // { type: 0x07, topic: 'chat', payload: '...' }
    case MsgType.AUTH:       // { type: 0x09, payload: 'token' }
  }
}
```

Returns `null` for: empty data, truncated frames, unknown type bytes.

### isWireBinaryFrame(data)

```ts
if (isWireBinaryFrame(bytes)) {
  const frame = decode(bytes)!; // safe after positive check
}
```

Fast check: first byte matches a known MsgType (0x01–0x0B).

---

## Benchmarks

Numbers from [github.com/coderbuzz/benchmarks](https://github.com/coderbuzz/benchmarks) (`results/latest.json`): cloud machine (Intel Xeon @ 2.10GHz, family 6 model 207 stepping 2, 4 cores, Linux x64), Bun 1.4.3, run of 2026-10-10 (benchmarks `31fbcee`). @coderbuzz/velox-ws-wire 0.1.17 against `JSON.stringify`/`JSON.parse` of the same frame; ops/s, best of 3 processes, higher is better.

### Encode Throughput

| Frame type | Wire (ops/s) | JSON (ops/s) | Result |
|---|---|---|---|
| subscribe | 9.03M | **10.71M** | **1.19x** JSON |
| response | 7.23M | 7.58M | 1.05x JSON (level) |
| request | 7.96M | 7.51M | 1.06x Wire (level) |
| publish | 4.89M | **7.50M** | **1.53x** JSON |

### Decode Throughput

| Frame type | Wire (ops/s) | JSON (ops/s) | Result |
|---|---|---|---|
| ping | **50.62M** | 11.95M | **4.2x** Wire |
| response | **6.36M** | 5.07M | **1.25x** Wire |
| request | 5.53M | 5.13M | 1.08x Wire (level) |
| publish | 3.54M | **5.09M** | **1.44x** JSON |
| subscribe | 5.18M | **9.58M** | **1.85x** JSON |

The public suite has no ping encode row.

> Numbers move with the machine; compare them only within one run. The source of truth is `https://raw.githubusercontent.com/coderbuzz/benchmarks/main/results/latest.json` (suite ids `velox-ws-wire-<frame>-encode`, `-decode`, `-size`).

### Wire Size

| Frame type | Wire (bytes) | JSON (bytes) | Savings |
|---|---|---|---|
| ping | **1** | 15 | **93%** |
| subscribe | **12** | 41 | **71%** |
| request | **37** | 83 | **55%** |
| response | **37** | 84 | **56%** |
| publish | **44** | 92 | **52%** |

Wire Protocol encodes frame metadata (type, correlation ID, topic) as compact binary fields instead of JSON object keys: 52-93% fewer bytes on every frame type. In this run Wire decodes ping and response frames faster (4.2x, 1.25x); JSON encodes and decodes subscribe and publish frames faster (1.19-1.85x); request and response encode and request decode are within 8%, level. Wire against JSON speed depends on the CPU: on the dev VM (Xeon Platinum 8255C) Wire won every encode row. The size advantage holds on every machine.

### Header Overhead vs JSON Envelope

Fixed header cost per frame, excluding the payload itself:

| Frame type | JSON | Wire | Savings |
|---|---|---|---|
| Heartbeat | `~18 bytes` | `1 byte` | **~94%** |
| Pub/sub message `{ topic: "chat", data: {...} }` | `~55 bytes` | `6 bytes + data` | **~89%** |
| Request-response `{ id: 1, type: "rpc", data: {...} }` | `~70 bytes` | `5 bytes + data` | **~93%** |

---

## Usage Examples

### Mixed-Protocol Server (JSON + Wire)

```ts
import { isWireBinaryFrame, decode, MsgType } from "@coderbuzz/velox-ws-wire";

ws.on("message", (data) => {
  if (isWireBinaryFrame(data)) {
    const frame = decode(data)!;
    switch (frame.type) {
      case MsgType.REQUEST:
        handleRequest(frame.corrId, JSON.parse(frame.payload));
        break;
      case MsgType.SUBSCRIBE:
        subscribeClient(socketId, frame.topic);
        break;
    }
  } else {
    // Legacy JSON message
    const msg = JSON.parse(String(data));
    handleJson(msg);
  }
});
```

### Building a Custom Binary Client

```ts
import { encodeRequest, decode, MsgType } from "@coderbuzz/velox-ws-wire";

let corrId = 0;
const pending = new Map();

ws.on("message", (data) => {
  const frame = decode(new Uint8Array(data));
  if (!frame) return;

  if (frame.type === MsgType.RESPONSE) {
    const cb = pending.get(frame.corrId);
    if (cb) {
      pending.delete(frame.corrId);
      cb.resolve(JSON.parse(frame.payload));
    }
  }
  if (frame.type === MsgType.MESSAGE) {
    handleMessage(frame.topic, JSON.parse(frame.payload));
  }
});

function sendRpc(method: string, params: unknown, timeout = 10_000): Promise<any> {
  const id = ++corrId;
  const req = encodeRequest(id, JSON.stringify({ method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error("RPC timeout"));
      }
    }, timeout);
    ws.send(req);
  });
}
```

---

## Gotchas

1. `encodePing()`/`encodePong()` return **shared singletons**: do NOT mutate the returned buffer.
2. Topic fields use u8 length prefix → max 255 UTF-8 bytes per topic. The encoders do not check this: a longer topic writes `length & 0xff` as the length byte and produces a corrupt frame that decodes to a truncated topic (the rest spills into the payload for PUBLISH/MESSAGE).
3. Correlation IDs are u32 → range 0–4294967295. Larger numbers are silently truncated to their low 32 bits.
4. `decode()` returns `null` for empty data, truncated frames, or unknown type bytes.
5. No bounds checking on input beyond length checks: only decode trusted data.
6. Payload is raw UTF-8, not MessagePack: callers handle serialization (JSON.stringify/parse).
7. `isWireBinaryFrame()` only checks first byte: true positive if 0x01–0x0B, but could collide with other binary protocols. It returns `false` for an empty `Uint8Array` but throws `RangeError` for an empty `ArrayBuffer`.
9. `encodeResponse(corrId, payload)` also accepts a `Uint8Array` payload, but `decode()` always returns `payload` as a UTF-8 decoded string, so non-UTF-8 bytes come back as replacement characters.
10. Every payload-carrying decoded frame has `payload: string` (empty string when absent), including AUTH_OK.
8. PING/PONG frames are pre-allocated as `const` at module level: never freed, negligible memory.

---

## Dependencies

None. Standalone codec compatible with any WebSocket implementation (Bun, Deno, Node.js, browser).
