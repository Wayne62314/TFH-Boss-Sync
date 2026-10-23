# v0.5.1 validation — 2026-10-23

- Read-only Steam capture confirmed `Flight_N -> HomingSparkCast -> Flight_N_BG` lost the old tracker and bypassed upkeep, while background casts preserved magic.
- Fix: adopt actual background idle/cast state independently of the old tracker; charge every resolved Homing Spark entry before startup.
- Repeated airborne 6A previously reused mode 4 as a free-start allowance. Every resolved new 6A start now settles separately and consumes the first free flight-exit entitlement once. Normal animation updates do not pay again.
- 65 JavaScript tests and 9 Python tests pass: both sides, native-state replay, timers, payment/denial, same-state restarts, free exits, damage filtering, mode gates, activation/cleanup and mid-match refusal.
- Actual C gate compiled/executed on allocated scratch actors in the Steam process, with no hooks installed or gameplay actor memory written: repeated ground/air 6A fees, zero-magic denial, one-use free exits, Homing Spark fees and unrelated-state bypass passed.
- User confirmed live Steam training regression results after connecting v0.5.1: air 6A payments and exhaustion denial, 8D→64C/background casts and upkeep, zero-super free automatic exit.
- Fresh portable ZIP CRC, required files, no game assets/logs, Unicode/spaced extraction destination, isolated runtime and bilingual Tk UI smoke checks pass.
- Original gameplay core was user-tested with same-PC Steam and Epic clients. The new v0.5.1 fixes have NOT received new dual-client, remote-PC or exhaustive rollback validation. Existing reviewed Steam/Epic profiles remain unchanged. Retain experimental prerelease status.
- A prior `Invalid Oleander resources` safety stop occurred when the author deliberately closed both games, not as a confirmed active-match bug. Exact teardown trigger remains untraced.
- No remote MOD handshake, version detection or matchmaking isolation. Desync is not reliable automatic exclusion of unmodded clients.
