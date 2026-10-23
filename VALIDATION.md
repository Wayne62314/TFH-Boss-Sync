# v0.5.0 validation — 2026-10-23

- Gameplay core copied from user-confirmed v0.4.4; no balance edits in this sharing version.
- 56 JavaScript tests pass: both sides, mode gates, charge costs, free exits, timers, damage filtering, native entry rejection and input preservation.
- 9 Python tests pass: build/resource checks, one/two-client activation, stop cleanup, and mid-match refusal.
- Source and portable Tk UI smoke checks cover default English, Chinese switching, consent default-off and document loading, without attaching.
- Fresh ZIP extraction checks: archive CRC, no logs/game assets, required runtime/documents, Unicode/spaced destination, startup with no external Python on PATH.
- The GUI/single-client host has mocked activation tests, not new end-to-end gameplay confirmation. Earlier real gameplay tests were same-PC Steam/Epic sessions. Remote-PC latency, exhaustive rollback and complete match lifecycle coverage remain unverified.
- Prior v0.4.4 log contains one safety fault `Invalid Oleander resources` following a background-meter exit. Cause (active gameplay or process teardown) unconfirmed; documented as a known issue. Do not treat user-confirmed move functionality as proof of universal stability.
- No remote handshake or modded-peer detection. Desync is not reliable automatic exclusion of unmodded clients.
