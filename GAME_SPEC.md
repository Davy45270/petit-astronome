# Règles du jeu

## Structure

- 7 leçons, 37 niveaux (`src/engine/levels.ts`). Chaque niveau a une carte notion (titre, trois phrases, un dessin) et une banque d’au moins six questions, chacune avec une clé unique et une explication.
- Une série = 6 questions tirées de la banque (graine aléatoire) ; les questions manquées lors des séries précédentes passent en tête (au plus 3).
- Étoiles : 6 justes du premier coup → 3, 5 → 2, 4 → 1. Deux étoiles ouvrent le niveau suivant ; deux étoiles au premier niveau d’une leçon ouvrent aussi le premier niveau de la leçon suivante.

## Types de questions (`src/engine/questions.ts`)

| Type | Geste | Juste | Erreur |
| --- | --- | --- | --- |
| `choice` | toucher une image ou un mot | la bonne proposition | la proposition est grisée, on réessaie |
| `spot` | toucher une cible dans une scène | la cible la plus proche du doigt (contour compris) | idem |
| `order` | toucher les éléments dans l’ordre | l’élément suivant | l’élément tremble ; après 3 erreurs, le bon élément brille |
| `draw` | glisser d’étoile en étoile, ou toucher deux étoiles | un trait de la figure | un trait absent de la figure ; après 3 erreurs, les pointillés reviennent |

Les boutons agissent sur le click standard. Repli : si un toucher (pointerdown puis pointerup tactiles sur le bouton) n’est suivi d’aucun click en 350 ms, l’action part une fois ; un click tardif après ce repli est ignoré une fois (jamais deux actions pour un tap). Le dessin d’une constellation se termine au lever du doigt, jamais sous un doigt posé.

Pendant un glissé, passer sur une étoile qui n’est pas reliée à l’étoile de départ ne compte pas ; seul le trait demandé au lever du doigt est jugé, et un glissé qui a déjà tracé un trait n’est jamais une erreur. Un deuxième doigt est ignoré tant que le premier est posé.

## Suivi de maîtrise (`src/engine/mastery.ts`)

- Chaque question se termine en **sûr** (juste du premier coup), **réessai** (trouvé après une erreur, calmement) ou **hasard** (une réponse moins d’une seconde après une erreur ; ou, pour un choix à 3 propositions ou plus, toutes les mauvaises sauf une essayées, au plus 3 ; ou 3 erreurs sur un rangement ou un dessin). Un vrai/faux n’est jamais classé « hasard » sur le nombre d’essais.
- Deux « hasard » dans une série : la série ne donne pas d’étoiles (elle est quand même comptée dans le suivi).
- Acquis : les 12 dernières réponses (deux séries) comptent au moins 11 « sûr », aucun « hasard » et aucune question à revoir.

## Données scientifiques

- Planètes (`src/engine/planets.ts`) : rayon moyen, distance moyenne au Soleil, durée de l’année. Les comparaisons de tailles et la scène « Soleil, Jupiter, Terre » sont à l’échelle exacte ; l’alignement du système solaire garde l’ordre des tailles (échelle en racine carrée, signalée sous le dessin) mais pas les distances.
- Lune (`src/engine/moon.ts`) : âge en jours depuis la nouvelle lune, mois synodique 29,53 j. Fraction éclairée (1 − cos θ)/2 ; dessin = un demi-disque éclairé ± une demi-ellipse, dont l’aire est exactement cette fraction. Vue de l’hémisphère nord : croissante éclairée à droite.
- Étoiles (`src/engine/sky.ts`) : ascension droite et déclinaison J2000, magnitude, couleur. Projection stéréographique, nord en haut et est à gauche comme vu du sol. La scène du nord est centrée sur le pôle, Grande Ourse au-dessus de l’étoile Polaire (une soirée de printemps).

## Vie privée

Sauvegarde locale `petit-astronome.v1` (progrès, suivi, questions à revoir, lecture à voix haute). Aucun appel réseau dans le code de l’application (test `local-only`). Synthèse vocale : seules les voix françaises `localService` sont utilisées.
