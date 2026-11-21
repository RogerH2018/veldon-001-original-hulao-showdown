<p align="center"><img src="assets/veldon-game.png" width="80" height="80" alt="Veldon Game"></p>

[简体中文](README.md) · **English**

# Hulao Showdown

Veldon Original No. 001 is a browser fighting game set at Hulao Pass. Pick one of 100 chibi fighters from the Three Kingdoms, challenge the CPU, or share a keyboard or touchscreen with a second player. [Play in English](https://rogerh2018.github.io/veldon-001-original-hulao-showdown/?lang=en)

The game starts in a supported browser language. Use **English / 简体中文** to switch at any time. The browser remembers your choice. Fighter Select, move names, touch controls, counter messages and the combo editor are available in both languages.

## Fighter Select

Shu and Wei each have 30 fighters. Wu and the Warlords each have 20. Select either player’s name in the lobby to filter by faction or search by name, pinyin or weapon. Select a move to watch it at full speed. Each fighter has four basic attacks and three signature combos. The signatures open with a close Jab, a pursuit Rush and an energy-consuming Break finisher respectively. The opening hit must connect for the sequence to continue.

## Default controls

| Action | P1 | P2 |
| --- | --- | --- |
| Up, Left, Down, Right | W, A, S, D | Arrow keys |
| Jab, Rush, Break, Launcher | J, K, U, I | 1, 2, 4, 5 |
| Three signature shortcuts | L, O, P | 3, 6, 9 |

For Guan Yu’s **Beard-Stroking Crescent**, press **Left → Jab → Down → Jab**, or **A → J → S → J** on the default P1 keyboard. Release each key before the next press. Left and Right always follow the screen. Both move lists show every input. In **Combos & controls**, set a shortcut to **Custom** and tap directions or attacks to build a sequence. Ordinary attacks wait for recovery. A complete signature input can cancel the current basic move.

Hold back or crouch to guard. A normal Break opens a guard. Press **Esc** to pause. Rounds last 55 seconds. Win two rounds to take the match.

Saved legacy macros still play. In `A W8 236A`, `A` is Jab. `W8` adds an eight-frame wait after the normal gap. `236A` is Down, Down-Forward, then Forward and Jab together. Forward is relative to the fighter’s facing. The simulation runs at 60 frames per second. The default legacy gap is 16 frames.

## Counters

| Matchup | Result |
| --- | --- |
| Jab against Break | Jab counter |
| Break against Rush | Break counter |
| Rush against Jab | Rush counter |
| Launcher against a jumping opponent | Anti-air |

Countering an attack during startup deals 25% extra damage and adds five frames of hitstun. Within five frames of impact, a move with priority can intercept a slower incoming move if range, facing and height line up. Equal moves can trade on the same frame. The opener of each signature follows the same counter rules.

## Run locally

Use Node.js 22 or later. From the project directory, run the development server or the test suite.

~~~sh
npm run dev
npm test
~~~

Open the address printed by the server, normally `http://127.0.0.1:4173/`. The browser loads static modules with zero third-party runtime dependencies. War drums, gongs, plucked strings and flute tones are synthesized with Web Audio.

## Credits

Each of the 100 fighters has an individual costume, four named basic moves and three signature combos. The hands, elbows, knees and ankles follow the fighter’s choreography. The weapon follows its grip, and archery, dual blades and zither playing have different hand poses. The wrist joins its sleeve, and the boots roll from heel to toe during a step. ImageGen supplied the portraits, body art, major weapons and Hulao Pass backdrop. These assets load locally with the game. The logo comes from the Veldon Game project. [Portrait, weapon and scenery prompts](assets/roster/PROMPTS.md) · [Costume and limb prompts](assets/rig/PROMPTS.md) · [Veldon Game](https://github.com/RogerH2018/Veldon-Game)

## Help improve the game

Players and developers are welcome to help make Hulao Showdown better. Does a fighter’s combo feel awkward? Is a move too strong, or could an animation feel more natural? Share playtest feedback, bug reports, and ideas in GitHub Issues. If you’d like to improve the gameplay, art, sound, or translations, we welcome pull requests. [Share feedback](https://github.com/RogerH2018/veldon-001-original-hulao-showdown/issues) · [Contribute a change](https://github.com/RogerH2018/veldon-001-original-hulao-showdown/pulls)

## License

© 2026 Veldon Game. This project is licensed under the MIT License. Include the copyright and permission notices when you distribute copies or substantial portions. [Full license](LICENSE)
