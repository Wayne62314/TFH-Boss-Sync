# TFH Boss Sync

Experimental, unofficial Windows mod for **Them's Fightin' Herds**. Adds balanced Boss Oleander and Boss Velvet moves using the game's normal inputs. English UI by default; click **中文** to switch to Chinese.

[中文说明](README.zh-CN.md) · [Move rules](MOVES.en.md) · [Releases](https://github.com/Wayne62314/TFH-Boss-Sync/releases)

## Both players MUST enable the same release

Agree with your opponent before playing. Both players must install **the same release**, connect the tool at the main menu, and keep it running throughout the match. The tool applies the same rules to P1 and P2, whether controlled locally or remotely.

If only one player runs the mod, or versions differ, the two simulations can diverge into **"parallel worlds"**: different hits, health, actions or even different winners. **This is a desync, not safe mod detection or a reliable automatic match refusal.** There is no remote MOD handshake, version negotiation, peer-status check or enforced modded-only matchmaking in this release. A green/Connected local status does NOT confirm your opponent is modded. Do not use against unsuspecting players or in tournaments without agreement. Stop on any mismatch; both players must restart their games.

## Download and run

1. Download **TFH-Boss-Sync-v0.5.0-windows-x64.zip** under Releases → Assets, NOT the automatic Source code ZIP.
2. Fully extract to a separate, writable folder, e.g. `D:\TFH-Boss-Sync` or a folder on your Desktop. **Do not copy it into the game folder. Do not run inside the ZIP.** Keep the entire `_internal` folder beside the EXE.
3. No Python install, Setup.cmd, resource replacement or game-directory changes are needed; the portable runtime is included. This is an unsigned executable; do not disable security software to run it.
4. Close other TFH mod tools. If a previous tool was connected, fully restart the game. Start your game normally through Steam or Epic, and stay at the **main menu**.
5. Run `TFH-Boss-Sync.exe`. English is the default language; **中文 / English** changes only the UI and documentation, never gameplay.
6. Click Refresh games, select your game, confirm you and your opponent agreed to use the same release, then Connect selected. Each player normally connects ONE game on their own computer. For same-PC tests you may select two games using Ctrl-click.
7. Both players wait for **Connected**, then start a NEW match. Select ordinary **Oleander** or **Velvet**. Selection art is not replaced. Other characters are not enhanced. Both supported characters are always enabled; there are no mismatched per-character strength switches.
8. To stop, both return to the main menu, click Stop, then fully restart affected games before reconnecting or playing unmodded. Closing the tool does not safely undo existing boss flags mid-match. The UI requires a new process after a connection attempt for conservative recovery.

Local training, local versus/CPU and the investigated multiplayer branches are included. Menus and unknown mode types are not modified. Story/scenario compatibility is not promised. No AutoDefense, auto throw-tech, Huggles, phase-3 Oleander or extra keyboard hotkeys are included.

## Steam and Epic compatibility

The author tested the Steam and Epic installations on one PC, including a two-client connected session. The earlier experimental gameplay core (0.4.4) was user-validated; 0.5.0 packages that core with a GUI and single-client support. New GUI/single-client publication plumbing does not imply new remote-PC or high-latency rollback validation.

Only these exact executable builds and character resources are supported:

| Installation identified by the author | EXE SHA-256 |
| --- | --- |
| Steam | `03E20EECE23F39FB1012061A5A7FF92F4B63DA23EB8EB641CF6EE379CBCE373D` |
| Epic | `1D36C6CE32352C364E22F2B627C033C38AA660F84FF39ED0DFBB1B742AB8A5C6` |

Required `data01/characters-foits.gfs` SHA-256: `5C57D152125922C6D47E5E8F6680D88F3E8B65780F0EC574D78E812741C5CD0C`.

Other updates, store builds, modified resources, conflicting tools or loose Oleander/Velvet overrides may be refused. Never bypass the hash/signature checks. The game list's store label is a path-based hint; executable hash validation is authoritative. The tool does not unlock DLC or alter authentication, networking, game files or saves.

## Troubleshooting

Exit-log clarification: the author confirmed that both games were deliberately closed when the earlier paired session ended with `Invalid Oleander resources`. This is an observed shutdown-time safety stop, not evidence of a confirmed active-match gameplay bug. Its exact internal cause has not been traced. If this message occurs while still playing, stop and restart affected games and report it separately. The release remains experimental because remote-PC/rollback coverage is incomplete.

- No game listed: start TFH, click Refresh; the tool must have permission to access that process. Use matching privilege levels; do not disable security controls.
- Main-menu/signature/build error: both return to menu; restart affected games, close other tools and check the supported hashes. Do not attach mid-match.
- No enhancements: wait for Connected and start a new round with ordinary Oleander/Velvet. Follow numpad notation in Move rules; these are game A/B/C/D buttons, not literal letter keys.
- Desync: stop playing, compare exact mod versions and game/resources, and restart both games. There is no automatic recovery or remote installation check.
- Local logs are stored beside the executable in `logs/`. They may contain local paths and process details; review/redact before sharing. Logs are never automatically uploaded.

## Source and verification

`app.py` is the bilingual GUI; `dual_boss.py` manages one/two local processes, hashes, locks, activation and logging. `boss-hook.js` coordinates native hooks. `oleander-*.js` and `velvet-*.js` contain gameplay adapters and pure balance rules. No extracted game scripts/assets or proprietary game executables are distributed.

The mod attaches to the running process with Frida, enables native boss logic and handles resolved native input/state/damage paths. It does not edit game resources. Gameplay decisions use in-game state and input, not a local keyboard timer. Rollback restoration of every reserved field/path has NOT been exhaustively established; agreement and matching installations are necessary but not a guarantee of universal synchronization.

Source requirements: Windows x64, Python 3.12, `pip install -r requirements.txt`; Node.js is needed only for JavaScript tests. Run `python app.py`. Build with `./build.ps1 -Python <path-to-python.exe>`.

Tests: `node --test test-*.cjs`, `python -m unittest test_host test_share`, `python app.py --self-test`, `python app.py --ui-self-test`. Automated and UI smoke tests do not substitute for two-computer gameplay tests.

Third-party runtimes retain their own licenses; portable notices are in `licenses/` and `THIRD_PARTY_NOTICES.txt`. Unofficial community project, not endorsed by the developers, Valve or Epic.
