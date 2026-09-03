# JOUST — Williams 1982 Style

Browser recreation of **Williams Electronics’ Joust** (1982), companion to:

- [PAC-MAN](https://bamtec70.github.io/pacman-game/)
- [MS. PAC-MAN](https://bamtec70.github.io/ms-pacman-game/)
- [DIG DUG](https://bamtec70.github.io/dig-dug-game/)
- [DEFENDER](https://bamtec70.github.io/defender-game/)
- [GALAGA](https://bamtec70.github.io/galaga-game/)

## Play

**Live:** https://bamtec70.github.io/joust-game/

You should see **BUILD V11** on the title screen. If nobody is playing, the cabinet runs an **attract demo**, then loops back to INSERT COIN. Space, flap, or tap starts a real game.

```powershell
cd C:\Users\bamte\joust
python -m http.server 8766
```

**Landscape / horizontal** playfield fills the screen. Rotate phones sideways for best play.

## Mission

Mount your **ostrich**, flap into the air, and unseat enemy knights by striking **from above**. Collect **eggs** before they hatch. Avoid **lava** and the **pterodactyl**.

## Controls

| Input | Action |
|-------|--------|
| **← → / A D** | Face / accelerate left-right |
| **Space / ↑ / W** | Flap wings |
| **FLAP** (touch) | Flap |
| **◀ ▶** (touch) | Direction |
| **P** | Pause |
| **M** | Mute |

## Scoring (approx.)

| Target | Points |
|--------|--------|
| Bounder | 500 |
| Hunter | 750 |
| Shadow Lord | 1500 |
| Egg | 250 |
| Pterodactyl | 1000 |

Extra mount every **20,000**.

## Files

- `index.html` / `joust-v11.css` / `joust-v11.js`
- `sfx/` — original Williams cabinet samples (16-bit PCM for the browser)

Fan recreation for personal / educational use. Not affiliated with Williams or its successors.
