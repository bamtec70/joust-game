# JOUST — Williams 1982 web recreation

**Live:** https://bamtec70.github.io/joust-game/ · part of the [WTP Arcade](https://wethepeoplepress.com/games/)

Native 292×240 playfield (cabinet resolution), pixel-scaled. Every sprite is hand-authored pixel data in `game.js` and every sound is synthesized with the Web Audio API. No ROM data, samples or extracted images are included.

## Controls
| Input | Action |
|---|---|
| ← → / A D | Run / steer |
| Space / Ctrl / ↑ / W | Flap (one flap per press) |
| 5 | Insert coin |
| Enter / 1 | Start (Enter also coins if no credits) |
| 2 | Two-player start (P2 stork: J / L move, I flap) |
| P / M | Pause / sound |
| Touch | Hold ◀ ▶ to run, tap anywhere else to flap (multi-touch); tap to coin/start |

## Game
Bounder 500 · Hunter 750 · Shadow Lord 1500 · Eggs 250/500/750/1000 (+500 caught mid-air) · Pterodactyl 1000 (lance into the open mouth) · extra mount every 20,000.
Wave cycle: regular, Survival (3000 if you don't die), Team (2P, 3000), Gladiator (3000 for first unseating), Egg wave every 5th. Bridges burn at wave 3, the lava troll grabs from wave 3, and ledges vanish on later waves.

Debug: `?wave=N` starts directly at wave N (`&players=2` for two players); with it, the backquote key skips a wave.

Fan recreation for personal / educational use. Not affiliated with Williams or its successors.
