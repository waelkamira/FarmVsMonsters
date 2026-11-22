# Auto-Rig Worker Security & Integration Gate — 2026-11-22

## Review scope
Static review of the `feat/studio-ai-auto-rig-builder` worker source. This is not a runtime security test and does not imply SAM 2 was installed or run.

## Positive controls observed
- Server binds to loopback (`127.0.0.1`).
- Exact Host check against configured port and rejects browser Origin headers.
- JSON content-type required for POST.
- Body limit (12 MiB) and image-data limit (8 MiB); decoded canvas capped at 4096 pixels on the longest side.
- Request-slot semaphore and inference lock prevent concurrent inference overload.
- SAM 2 model/checkpoint must be explicitly supplied locally; no model auto-download.
- Protocol version and task routes are checked; capabilities endpoint reports degraded state when model setup is missing.
- Alpha visibility is applied to masks; proposals capped at 63; polygons capped at 512 points.

## Findings requiring changes/tests before integration
1. **Payload shape validation is incomplete:** `payload` is assumed to be an object; canvas, dimensions, and imageDataUrl types/ranges are not comprehensively validated before model decode. Malformed payloads may become generic 500 errors instead of predictable 400s.
2. **Content-Length parsing:** malformed/non-numeric lengths can raise exceptions; missing/negative lengths and chunked requests need explicit rejection. HTTP server currently has no explicit request timeout.
3. **JSON parsing and image decode:** duplicate keys, very large nested structures, and base64 decoded-size behavior should be explicitly bounded/tested. The 8 MiB image cap is applied after base64 decoding, so the transport body limit is the primary pre-decode guard.
4. **Error disclosure:** generic inference failures truncate but still include exception text; ensure model/library exception strings do not leak local paths or sensitive environment details.
5. **Loopback security is not a full browser-security boundary:** Origin/Host validation should be tested against hostile local browser requests, IPv4/IPv6 variations, proxy settings, and port configuration. Avoid opening this service beyond loopback.
6. **Resource handling:** ThreadingHTTPServer threads and inference slot behavior need timeout and shutdown handling, including clients disconnecting during inference.
7. **Mask fidelity:** automatic proposals use external contours only, losing holes and multi-component regions. This is an intentional approximation but must be visible in UI and reviewed before asset approval.
8. **Review state and data trust:** proposal roles remain unknown and source pixels; require human review, source fingerprint checks, and quality gates before publishing.

## Required focused test matrix
- malformed JSON, non-object JSON, missing fields, booleans/strings/negative dimensions, canvas mismatch, oversize image/body, unsupported media, truncated base64, corrupt image, unsupported channels.
- request concurrency/busy responses, exception recovery releasing semaphore, local Host/Origin validation, unexpected routes, protocol mismatch.
- alpha clipping, holes/disjoint mask approximation, polygon vertex cap, proposal count cap, prompt count/label/range validation.
- confirm that no hidden-part reconstruction is claimed; worker only segments source pixels.

## Integration decision
Do not merge the divergent branch wholesale. Port and validate isolated manifest/validator modules first, then worker protocol and local worker with payload hardening, followed by UI and runtime integration. Runtime/build verification is still required on a Windows checkout with the actual Studio/game dependencies and (optional) local SAM 2 installation.
