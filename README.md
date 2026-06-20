<!-- docs: sync from coderbuzz/codex@bd2db2c -->

# Velox WS Wire &mdash; `@coderbuzz/velox-ws-wire`

> **Binary framing protocol for WebSocket messages.** 80-93% bandwidth reduction over JSON. Zero dependencies.
> AI agents: see [AI_KNOWLEDGE.md](https://github.com/coderbuzz/velox-ws-wire/blob/main/AI_KNOWLEDGE.md) for expert context.
<p align="center">
  <a href="https://www.npmjs.com/package/@coderbuzz/velox-ws-wire"><img src="https://img.shields.io/npm/v/@coderbuzz/velox-ws-wire.svg?style=flat-square" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@coderbuzz/velox-ws-wire"><img src="https://img.shields.io/npm/dm/@coderbuzz/velox-ws-wire.svg?style=flat-square" alt="npm downloads" /></a>
  <a href="https://github.com/coderbuzz/velox-ws-wire/blob/main/LICENSE"><img src="https://img.shields.io/github/license/coderbuzz/velox-ws-wire.svg?style=flat-square" alt="MIT License" /></a>
  <a href="https://github.com/coderbuzz/velox-ws-wire"><img src="https://img.shields.io/github/stars/coderbuzz/velox-ws-wire.svg?style=flat-square" alt="GitHub Stars" /></a>
</p>

The Wire Protocol is a compact binary framing layer for WebSocket messages. It encodes type, topic, correlation ID, and payload into a minimal binary format — up to 93% smaller than equivalent JSON for control frames (heartbeat, ack, pub/sub routing).

---

## Why Wire Protocol?

Standard WebSocket `JSON.stringify`/`JSON.parse` overhead adds up fast for high-throughput connections. Wire Protocol eliminates the waste.

**Part of the Velox Wire ecosystem** — this codec powers both `@coderbuzz/velox-ws-wire-client` (standalone WebSocket client) and `@coderbuzz/velox-ws-wire-server` (Velox middleware). Use them together for end-to-end binary protocol, or use this codec standalone with any WebSocket implementation.

| Frame type | JSON | Wire | Savings |
|---|---|---|---|
| Heartbeat | `~18 bytes` | `1 byte` | **~94%** |
| Pub/sub message `{ topic: "chat", data: {...} }` | `~55 bytes` | `~8 bytes + data` | **~85%** |
| Request-response `{ id: 1, type: "rpc", data: {...} }` | `~70 bytes` | `~12 bytes + data` | **~83%** |
| Ack `{ id: 1, ok: true }` | `~18 bytes` | `2 bytes` | **~89%** |

---

## Benchmarks

Full results at **[github.com/coderbuzz/benchmarks](https://github.com/coderbuzz/benchmarks)**.

All tests on Apple M-series, Bun runtime.

### Encode Throughput

| Frame type | Wire (ops/s) | JSON (ops/s) | Factor |
|---|---|---|---|
| subscribe | **24,171,615** | 14,606,357 | **1.65x** |
| request | **19,355,778** | 7,072,553 | **2.74x** |
| response | **16,389,412** | 6,417,593 | **2.55x** |
| ping | **14,396,601** | 8,162,655 | **1.76x** |
| publish | **8,869,312** | 6,696,429 | **1.32x** |

### Decode Throughput

| Frame type | Wire (ops/s) | JSON (ops/s) | Factor |
|---|---|---|---|
| ping | **16,272,286** | 16,567,033 | 0.98x |
| subscribe | **16,198,267** | 11,702,865 | **1.38x** |
| request | **13,332,000** | 4,429,499 | **3.01x** |
| response | **11,672,016** | 4,771,485 | **2.45x** |
| publish | **7,637,717** | 4,202,166 | **1.82x** |

### Wire Size

| Frame type | Wire (bytes) | JSON (bytes) | Savings |
|---|---|---|---|
| ping | **1** | 15 | **93%** |
| subscribe | **12** | 41 | **71%** |
| request | **37** | 83 | **55%** |
| response | **37** | 84 | **56%** |
| publish | **44** | 92 | **52%** |

Wire Protocol encodes frame metadata (type, correlation ID, topic) as compact binary fields instead of JSON object keys, achieving 52-93% bandwidth reduction while also being faster to encode and decode.

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

Full results at **[github.com/coderbuzz/benchmarks](https://github.com/coderbuzz/benchmarks)**.

All tests on Apple M-series, Bun runtime.

### Encode Throughput

| Frame type | Wire (ops/s) | JSON (ops/s) | Factor |
|---|---|---|---|
| subscribe | **24,171,615** | 14,606,357 | **1.65x** |
| request | **19,355,778** | 7,072,553 | **2.74x** |
| response | **16,389,412** | 6,417,593 | **2.55x** |
| ping | **14,396,601** | 8,162,655 | **1.76x** |
| publish | **8,869,312** | 6,696,429 | **1.32x** |

### Decode Throughput

| Frame type | Wire (ops/s) | JSON (ops/s) | Factor |
|---|---|---|---|
| ping | **16,272,286** | 16,567,033 | 0.98x |
| subscribe | **16,198,267** | 11,702,865 | **1.38x** |
| request | **13,332,000** | 4,429,499 | **3.01x** |
| response | **11,672,016** | 4,771,485 | **2.45x** |
| publish | **7,637,717** | 4,202,166 | **1.82x** |

### Wire Size

| Frame type | Wire (bytes) | JSON (bytes) | Savings |
|---|---|---|---|
| ping | **1** | 15 | **93%** |
| subscribe | **12** | 41 | **71%** |
| request | **37** | 83 | **55%** |
| response | **37** | 84 | **56%** |
| publish | **44** | 92 | **52%** |

Wire Protocol encodes frame metadata (type, correlation ID, topic) as compact binary fields instead of JSON object keys, achieving 52-93% bandwidth reduction while also being faster to encode and decode.

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
