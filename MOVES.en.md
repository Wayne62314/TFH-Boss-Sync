# Move rules — v0.5.1

Only Oleander and Velvet are enhanced. Both players must use the same release and keep the mod connected. The same rules apply to P1/P2 on each client.

## Notation

Directions use fighting-game numpad notation, relative to the character's facing: 6 = forward, 4 = back, 8 = up, 2 = down. 22D = down, down, then D. A/B/C/D are the game's attack buttons, NOT necessarily keyboard A/B/C/D. Reverse forward/back when facing left. No external F-key shortcuts are required.

## Oleander

Select ordinary Oleander. Native Boss Flag27 enables the boss command set; no phase-3/Fred hotkey pack is included.

| Command / state | Rule |
| --- | --- |
| 8D | Enter boss flight; costs 1 MAGIC level (not a super bar) once per flight. Insufficient magic cannot enter. |
| Foreground flight | Lasts about 3 seconds (180 accepted native input updates). 6A exits early; timeout ends flight normally. |
| 4D during foreground flight | Move into the battle background. The 3-second foreground limit no longer applies. |
| Airborne 64 + attack (including 64C) | Native Homing Spark. Costs 1 magic level per accepted cast, in foreground OR background; insufficient magic rejects the action before it starts. All strengths share the same native state and fee. |
| Any background entry | Upkeep starts from Homing Spark's background-entry action or native background idle, regardless of how you arrived. Casting again does not pause/reset upkeep. |
| Background upkeep | Costs 50 raw SUPER-meter units per 60 logic updates, not 50% and not one bar. Sampled Oleander meter is 210 per bar, 630 full; absent other gains/costs, full meter lasts about 12.6 seconds. |
| Background super meter reaches zero | Automatically use a free 6A exit, even with zero magic. |
| 6A outside paid flight (ground or ordinary jump) | Costs 1 magic level once per action. With less than 1 level, neither ground nor ordinary-jump 6A should start a charge animation. Ordinary jump alone does not grant a free exit. |
| 6A during paid 8D foreground/background flight | The exit 6A is free, even with zero magic; it ends the flight/background action. |
| Restarting / chaining 6A | Every newly accepted 6A start is charged separately, even if it cancels directly into the same named air state. The free flight exit is consumed once; it does not grant free repeated 6As. An already-running action is not charged again each frame. |
| 6A damage | Sampled normal HP-damage contacts from both Oleander's body and her dedicated 6A pillar deal 50% of their final damage before HP subtraction. Not just the first visible hit. |

The native move handles its own animations and recovery. Other moves are not globally halved. Chip/gray/true-damage paths not covered by the sampled normal HP subtraction are not claimed to be halved. Rounding, combo scaling and native hit behavior can affect the displayed total.

## Velvet (VV)

Select ordinary Velvet. Normal standalone D remains the original move.

| Command / state | Rule |
| --- | --- |
| Grounded 22D, at least 2 super bars | Spend 2 bars and enter boss tornado mode. |
| Tornado duration | At most about 6 seconds (360 logic/input updates), with the native countdown bar retained. |
| A / B / C in tornado | Each button's boss ice attack can be used ONCE per activation. |
| All A+B+C used | Wait for the last ice action to finish, then automatically release the native level-1 super (IcePrison) and exit. |
| D in tornado | Request the same level-1 super exit; a pending/running ice action finishes first. |
| Timer expires | Request the same level-1 super exit; pending actions may delay the actual exit. |
| Exit cost | Consume ALL remaining super meter. The exit super still works with less than one bar, including zero. |

Opacity is restored after the exit animation settles, avoiding the earlier half-transparent VV bug. The countdown bar is included; the proposed level-2 freeze/slowdown effect is NOT implemented. Do not expect the opponent to be frozen by 22D.

## Timing and limitations

Durations use simulation/input updates, not an independent wall-clock timer. Pause, hitstop, native actions and resimulation can affect perceived time. Matching clients are required, but this experimental release has no remote mod handshake and does not guarantee all rollback situations, characters, match lifecycle paths or online environments are synchronized. Report reproducible issues with exact game and mod versions; do not continue a desynced match.
