# Changelog

## Non publié

- “Donner mon avis” on the home screen: a plain link that opens the game's public feedback forms in a new tab (`rel="noopener"`). Nothing is sent from the app, and no tracker is involved.
- Two short French feedback forms (“Quelque chose ne marche pas”, “J'ai une idée”) and a `CONTRIBUTING.md` explaining how to report.

## 0.2.0

- “Mes autres jeux” on the home screen: a short list of the author's three other games (Opencade, Opencadkid, TicTac), each with its icon and one sentence, opened in the same tab.
- The list and its icons ship with the app, so the screen still shows offline; the network guard allows these three plain links and nothing else.

## 0.1.0

- Thirty-seven levels in seven lessons: the Sun and the Earth, recognising the planets, their order, sizes and distances, the Moon, stars and constellations.
- Four ways to answer: pick a picture or a word, tap in a scene (solar system, day and night, northern sky, Moon orbit, stars), sort planets or Moon phases, and draw constellations by sliding a finger from star to star (or tapping two stars).
- Hand-made SVG drawn from real data: planet radii and distances, true-scale size comparisons, exact Moon phase shapes as seen from France, real star positions for seven constellations and asterisms.
- A notion card before each level and an explanation after each answer; a French mnemonic for the order of the planets and the “lying Moon” rule.
- Learning follow-up: sure, retry or guess for every question; a missed question returns next session; two guesses spoil a session’s stars; a level is mastered after two strong sessions. Parents’ area behind a small multiplication, kept on the device and erasable.
- Offline PWA, optional read-aloud with on-device French voices only, reduced motion respected.
- Unit tests on the science data and on every level’s answers, browser tests including a noisy-finger session, continuous integration and Pages deployment.
