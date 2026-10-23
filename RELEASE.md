# v0.5.0 — Boss Oleander + Velvet (experimental)

Download **TFH-Boss-Sync-v0.5.0-windows-x64.zip** below, not Source code. Fully extract to a separate writable folder (e.g. `D:\TFH-Boss-Sync`), keep `_internal`, then run `TFH-Boss-Sync.exe`. Runtime included; no Setup.cmd/Python install or game-file replacement needed.

English-first GUI with a 中文 / English button, game selection, Connect/Stop, and English/Chinese usage and move rules. Each player connects one local game; same-PC dual-client selection is retained for tests. Both supported characters are always enabled for both sides.

**BOTH players must agree to run this SAME release and keep it connected.** One-sided/mismatched installs can desync into "parallel worlds". This is NOT a safe remote mod check or automatic match refusal: no handshake, version negotiation or matchmaking isolation is implemented. Local Connected does not confirm the peer. Stop and restart both games on divergence.

- Oleander: 8D costs one magic, foreground flight ~3s; 4D background drains 50 raw super units/sec; empty super auto-exits through free 6A. Ground/ordinary-jump 6A costs one magic; paid-flight exit 6A is free. Sampled body/pillar normal HP damage is halved. Insufficient-magic ground/jump 6A is rejected before charge animation.
- VV: grounded 22D spends two bars for ~6s tornado and countdown bar. A/B/C each once; all three finished, D, or timeout exits via level-1 super and drains all remaining meter, even below one bar. Waits for ice to finish; restores opacity. No level-2 freeze transplant.
- The author's exact Steam and Epic builds are supported, with strict EXE/resource/native signature checks. No claim for every update or all rollback/remote-PC situations.

0.4.4 gameplay core was user-tested on the author's two local installations. The share GUI/host adds single-process support; automated smoke tests are not a substitute for two-computer gameplay validation. This remains an experimental prerelease. See included README and MOVES documents for full rules, hashes and known limitations. Restart affected games after stopping. No game assets or executables are included.

Known issue: a prior paired session ended with `Invalid Oleander resources` following a background-meter exit; active-play versus process-teardown cause is not established by the log. The tool stopped on that fault. Restart affected games if this occurs.

中文：解压到独立目录，运行 EXE，主菜单连接；双方必须同版开启。界面可切中文，包内附中文使用与招式说明。不匹配的“平行时空”是不同步，不是可靠检测或拒战机制。Steam/Epic 仅覆盖作者已核对构建，其他版本不承诺。
