<!-- docs: sync from coderbuzz/codex@aa9c4da -->

# Velox WS Wire: `@coderbuzz/velox-ws-wire`

> **Binary framing protocol for WebSocket messages.** 80-93% bandwidth reduction over JSON. Zero dependencies.
> AI agents: see [AI_KNOWLEDGE.md](https://github.com/coderbuzz/velox-ws-wire/blob/main/AI_KNOWLEDGE.md) for expert context.
<p align="center">
  <a href="https://www.npmjs.com/package/@coderbuzz/velox-ws-wire"><img src="https://img.shields.io/npm/v/@coderbuzz/velox-ws-wire.svg?style=flat-square" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@coderbuzz/velox-ws-wire"><img src="https://img.shields.io/npm/dm/@coderbuzz/velox-ws-wire.svg?style=flat-square" alt="npm downloads" /></a>
  <a href="https://github.com/coderbuzz/velox-ws-wire/blob/main/LICENSE"><img src="https://img.shields.io/github/license/coderbuzz/velox-ws-wire.svg?style=flat-square" alt="MIT License" /></a>
  <a href="https://github.com/coderbuzz/velox-ws-wire"><img src="https://img.shields.io/github/stars/coderbuzz/velox-ws-wire.svg?style=flat-square" alt="GitHub Stars" /></a>
  <a href="https://github.com/coderbuzz/velox-ws-wire/actions/workflows/ci.yml"><img src="https://github.com/coderbuzz/velox-ws-wire/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://codecov.io/gh/coderbuzz/velox-ws-wire"><img src="https://codecov.io/gh/coderbuzz/velox-ws-wire/graph/badge.svg" alt="Codecov" /></a>
</p>

The Wire Protocol is a compact binary framing layer for WebSocket messages. It encodes type, topic, correlation ID, and payload into a minimal binary format: up to 93% smaller than equivalent JSON for control frames (heartbeat, ack, pub/sub routing).

---

## Why Wire Protocol?

Standard WebSocket `JSON.stringify`/`JSON.parse` overhead adds up fast for high-throughput connections. Wire Protocol eliminates the waste.

**Part of the Velox Wire ecosystem.** This codec powers both `@coderbuzz/velox-ws-wire-client` (standalone WebSocket client) and `@coderbuzz/velox-ws-wire-server` (Velox middleware). Use them together for end-to-end binary protocol, or use this codec standalone with any WebSocket implementation.

| Frame type | JSON | Wire | Savings |
|---|---|---|---|
| Heartbeat | `~18 bytes` | `1 byte` | **~94%** |
| Pub/sub message `{ topic: "chat", data: {...} }` | `~55 bytes` | `6 bytes + data` | **~89%** |
| Request-response `{ id: 1, type: "rpc", data: {...} }` | `~70 bytes` | `5 bytes + data` | **~93%** |

---

## Benchmarks

Numbers from [github.com/coderbuzz/benchmarks](https://github.com/coderbuzz/benchmarks) (`results/latest.json`): cloud machine (Intel Xeon @ 2.80GHz, family 6 model 85 stepping 7, 4 cores, Linux x64), Bun 1.4.3, run of 2026-10-10 (benchmarks `f9601b4`). @coderbuzz/velox-ws-wire 0.1.17 against `JSON.stringify`/`JSON.parse` of the same frame; ops/s, best of 3 processes, higher is better.

### Encode Throughput

| Frame type | Wire (ops/s) | JSON (ops/s) | Result |
|---|---|---|---|
| subscribe | 7.86M | **10.28M** | **1.31x** JSON |
| response | 5.57M | 5.58M | 1.00x JSON (level) |
| request | 5.68M | 5.56M | 1.02x Wire (level) |
| publish | 3.84M | **5.39M** | **1.40x** JSON |

### Decode Throughput

| Frame type | Wire (ops/s) | JSON (ops/s) | Result |
|---|---|---|---|
| ping | **43.52M** | 9.35M | **4.7x** Wire |
| response | **5.18M** | 3.66M | **1.42x** Wire |
| request | **4.94M** | 3.49M | **1.41x** Wire |
| publish | 2.95M | **3.49M** | **1.18x** JSON |
| subscribe | 6.13M | **7.98M** | **1.30x** JSON |

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

Wire Protocol encodes frame metadata (type, correlation ID, topic) as compact binary fields instead of JSON object keys: 52-93% fewer bytes on every frame type. In this run Wire decodes ping, request and response frames faster; JSON encodes and decodes subscribe and publish frames faster (1.18-1.40x); request and response encode are level. Wire against JSON speed depends on the CPU: on the dev VM (Xeon Platinum 8255C) Wire won every encode row. The size advantage holds on every machine.

---

## Installation

```sh
npm install @coderbuzz/velox-ws-wire
```

---

## Quick Start

```ts
import { decode, encodePing, encodeRequest, encodeSubscribe } from "@coderbuzz/velox-ws-wire";

// Ping: 1 byte vs ~18 bytes JSON
const ping = encodePing(); // Uint8Array [0x01]

// Request: compact correlation + payload
const req = encodeRequest(42, JSON.stringify({ method: "hello" }));
const frame = decode(req);
// => { type: 0x03, corrId: 42, payload: '{"method":"hello"}' }

// Subscribe: topic without JSON overhead
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

Returns `null` for empty data, truncated frames, or unrecognized type bytes.

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
| Topic longer than 255 UTF-8 bytes | Not rejected by the encoder: the u8 length byte wraps, producing a corrupt frame. Keep topics at 255 bytes or less |

---

## License

MIT &copy; 2026 Indra Gunawan
