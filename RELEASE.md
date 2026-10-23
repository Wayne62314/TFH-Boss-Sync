# v0.5.1 — Oleander balance fixes

Download **TFH-Boss-Sync-v0.5.1-windows-x64.zip**, not Source code. Fully extract to a separate writable folder, keep `_internal`, and run `TFH-Boss-Sync.exe`. Runtime included; no Python/Setup.cmd or game-file replacement needed. English-first GUI with 中文 / English switching and bilingual move instructions.

## Fixed

- **Background upkeep bypass:** Homing Spark's background-entry action and native background idle now join the 50-raw-super-units-per-60-updates drain regardless of how Oleander arrived. Repeated casting does not pause or reset upkeep.
- **Free 64 fireballs:** native airborne 64+attack (including 64C) costs one magic level per accepted cast, in foreground or background. A/B/C share the native Homing Spark state and fee. Insufficient magic prevents startup.
- **Unlimited air 6A chains:** every newly accepted 6A start is settled separately, even when restarting the same named state. Normal ground/air starts cost one magic each. Paid-flight/background exit retains its first free 6A, but that entitlement cannot be reused for repeated starts. Natural playback is not charged per frame.

6A half-damage and other flight rules are retained. Background meter exhaustion still triggers the free 6A exit. Velvet's two-bar 22D, ~6-second tornado, A/B/C once each and level-1 super exit remain unchanged. No level-2 freeze effect is included.

The author confirmed all three regression tests in **Steam training**: repeated air 6A payments/denial, 8D→64C/background casting payments and upkeep, and free auto-exit at zero super meter. 65 JavaScript and 9 Python tests pass; native C scratch tests and portable extraction/runtime/UI smoke checks pass. This does not establish dual-client synchronization of the new fixes or exhaustive rollback correctness. Previously reviewed Steam and Epic build profiles are retained; other updates/builds may be refused.

## Multiplayer requirements

**BOTH players must agree to use this SAME release and keep it connected. Upgrade both sides; never mix v0.5.0 and v0.5.1.** Mismatched installs can desync into "parallel worlds". There is no remote MOD/version handshake, automatic refusal or matchmaking isolation. Local Connected does not verify the peer. Restart affected games after stopping or on divergence. Do not use against unsuspecting players.

v0.5.0 is superseded and withdrawn from public downloads; its release is retained privately as a recoverable draft and its source tag/history remain. This remains an experimental prerelease. No game assets/executables are included. See README/MOVES files for setup, precise supported hashes and limitations.

中文：0.5.1 修复了 64 火球白嫖魔法、火球进背景不扣超能，以及空中 6A 同名连发不付费三个漏洞，作者已在 Steam 训练场确认通过。背景每秒 50 原始超能、每次火球一格魔法、每次新 6A 独立结算；首次付费飞行退出免费。双方必须同时更新，旧 0.5.0 撤回公开下载。新修复的双端同步仍待另测；不同步不是可靠的 MOD 检测或自动拒战机制。
