<!-- docs: sync from coderbuzz/codex@8a99d5c -->

# Velox WS Wire &mdash; `@coderbuzz/velox-ws-wire`

> **Binary framing protocol for WebSocket messages.** 80-93% bandwidth reduction over JSON. Zero dependencies.
> AI agents: see [AI_KNOWLEDGE.md](https://github.com/coderbuzz/velox-ws-wire/blob/main/AI_KNOWLEDGE.md) for expert context.

The Wire Protocol is a compact binary framing layer for WebSocket messages. It encodes type, topic, correlation ID, and payload into a minimal binary format — up to 93% smaller than equivalent JSON for control frames (heartbeat, ack, pub/sub routing).

---

## Why Wire Protocol?

Standard WebSocket `JSON.stringify`/`JSON.parse` overhead adds up fast for high-throughput connections. Wire Protocol eliminates the waste:

| Frame type | JSON | Wire | Savings |
|---|---|---|---|
| Heartbeat | `~18 bytes` | `1 byte` | **~94%** |
| Pub/sub message `{ topic: "chat", data: {...} }` | `~55 bytes` | `~8 bytes + data` | **~85%** |
| Request-response `{ id: 1, type: "rpc", data: {...} }` | `~70 bytes` | `~12 bytes + data` | **~83%** |
| Ack `{ id: 1, ok: true }` | `~18 bytes` | `2 bytes` | **~89%** |

---

## Installation

```sh
npm install @coderbuzz/velox-ws-wire
```

---

## Quick Start

```ts
import { decode, encodePing, encodeRequest, encodeSubscribe } from "@coderbuzz/velox-ws-wire";

// Ping — 1 byte vs ~18 bytes JSON
const ping = encodePing(); // Uint8Array [0x01]

// Request — compact correlation + payload
const req = encodeRequest(42, JSON.stringify({ method: "hello" }));
const frame = decode(req);
// => { type: 0x03, corrId: 42, payload: '{"method":"hello"}' }

// Subscribe — topic without JSON overhead
const sub = encodeSubscribe("chat");
const msg = decode(sub);
// => { type: 0x05, topic: "chat" }
```

---

## Frame Types

| Type | Byte | Encode Function | Decoded Shape |
|---|---|---|---|
| PING | `0x01` | `encodePing()` | `{ type: 1 }` |
| PONG | `0x02` | `encodePong()` | `{ type: 2 }` |
| REQUEST | `0x03` | `encodeRequest(corrId, payload)` | `{ type: 3, corrId, payload }` |
| RESPONSE | `0x04` | `encodeResponse(corrId, payload)` | `{ type: 4, corrId, payload }` |
| SUBSCRIBE | `0x05` | `encodeSubscribe(topic)` | `{ type: 5, topic }` |
| UNSUBSCRIBE | `0x06` | `encodeUnsubscribe(topic)` | `{ type: 6, topic }` |
| PUBLISH | `0x07` | `encodePublish(topic, payload)` | `{ type: 7, topic, payload }` |
| MESSAGE | `0x08` | `encodeMessage(topic, payload)` | `{ type: 8, topic, payload }` |
| AUTH | `0x09` | `encodeAuth(token)` | `{ type: 9, payload }` |
| AUTH_OK | `0x0A` | `encodeAuthOk(data?)` | `{ type: 10, payload }` |
| AUTH_FAIL | `0x0B` | `encodeAuthFail(reason)` | `{ type: 11, payload }` |

---

## API

### Encoding

Each frame type has a dedicated encode function returning `Uint8Array`. These are zero-allocation for simple frames (PING/PONG use pre-allocated singletons).

### Decoding

```ts
decode(data: ArrayBuffer | Uint8Array): DecodedFrame | null
```

Returns `null` for empty data or unrecognized type bytes.

### Detection

```ts
isWireBinaryFrame(data: ArrayBuffer | Uint8Array): boolean
```

Fast check if first byte matches a known type (useful for routing in mixed-protocol servers).

---

## Wire Format

| Offset | Size | Field |
|---|---|---|
| 0 | 1 | Type byte |
| 1+ | variable | Type-specific payload |

- REQUEST/RESPONSE: bytes 1-4 = big-endian u32 correlation ID, rest = UTF-8 payload
- SUBSCRIBE/UNSUBSCRIBE: byte 1 = topic length (u8), rest = UTF-8 topic
- PUBLISH/MESSAGE: byte 1 = topic length (u8), topic bytes, rest = UTF-8 payload
- PING/PONG: 1 byte total, no payload
- AUTH/AUTH_OK/AUTH_FAIL: rest = UTF-8 payload

---

## Edge Cases

| Case | Behavior |
|---|---|
| Empty buffer | `decode()` returns `null` |
| Truncated frame | `decode()` returns `null` |
| Unknown type byte | `decode()` returns `null` |
| Topic length > 255 | Not possible (u8 length field) |

---

## License

MIT &copy; 2026 Indra Gunawan
