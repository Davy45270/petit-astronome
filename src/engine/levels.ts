import { planet, planetIds, label, rank, MNEMONIC, type PlanetId } from './planets';
import { phase, phaseIds, waxing, type PhaseId } from './moon';
import { constellation, capitalised, type ConstellationId, type StarColor } from './sky';
import { shuffle } from './rng';
import type { Art, Choice, Question, Scene } from './questions';

type Rng = () => number;
export interface Entry { key: string; make: (rng: Rng) => Question }
export interface Notion { title: string; lines: string[]; art: Art }
export interface Level { lesson: number; title: string; notion: Notion; bank: Entry[] }
export interface Lesson { title: string; hue: number; levels: Level[] }

/* ---------- small builders ---------- */

const tf = (key: string, statement: string, truth: boolean, explain: string, art?: Art): Entry => ({
    key, make: () => ({ type: 'choice', key, prompt: `Vrai ou faux ? ${statement}`, explain, art, answer: truth ? 'vrai' : 'faux', choices: [{ id: 'vrai', label: 'Vrai' }, { id: 'faux', label: 'Faux' }] })
});

const qcm = (key: string, prompt: string, right: string, wrongs: string[], explain: string, art?: Art): Entry => ({
    key, make: rng => ({ type: 'choice', key, prompt, explain, art, answer: 'c0', choices: shuffle([right, ...wrongs].map((text, i) => ({ id: `c${i}`, label: text })), rng) })
});

/** Choose among pictured answers. */
const qcmArt = (key: string, prompt: string, right: Choice, wrongs: Choice[], explain: string, art?: Art): Entry => ({
    key, make: rng => ({ type: 'choice', key, prompt, explain, art, answer: right.id, choices: shuffle([right, ...wrongs], rng) })
});

const planetChoice = (id: PlanetId): Choice => ({ id, label: label(id), art: { t: 'planet', id } });
const phaseChoice = (id: PhaseId): Choice => ({ id, label: phase(id).name, art: { t: 'moon', phase: id } });

/** Distractors drawn from a pool, never the answer. */
const others = <T>(pool: readonly T[], right: T, n: number, rng: Rng): T[] => shuffle(pool.filter(x => x !== right), rng).slice(0, n);

const spot = (key: string, prompt: string, scene: Scene, answer: string, explain: string): Entry => ({
    key, make: () => ({ type: 'spot', key, prompt, scene, answer, explain })
});

const order = (key: string, prompt: string, answer: Choice[], explain: string, art?: Art): Entry => ({
    key, make: rng => {
        let items = shuffle(answer, rng);
        // Never hand the child a list that is already in order.
        if (items.every((c, i) => c.id === answer[i]!.id)) items = [...items.slice(1), items[0]!];
        return { type: 'order', key, prompt, explain, art, items, answer: answer.map(c => c.id) };
    }
});

const draw = (key: string, id: ConstellationId, guide: boolean): Entry => {
    const c = constellation(id);
    return {
        key, make: () => ({
            type: 'draw', key, constellation: id, guide,
            prompt: guide ? `Relie les étoiles pour dessiner ${c.name}.` : `Dessine ${c.name} de mémoire : relie les bonnes étoiles.`,
            explain: `${capitalised(c.name)} : on y voit ${c.picture}. On l’observe en France ${c.season === 'toute l’année' ? c.season : `surtout ${c.season}`}.`
        })
    };
};

const name = (id: PlanetId): string => label(id);

/* ---------- planet-based entries ---------- */

function recognise(ids: PlanetId[], pool: PlanetId[], n: number): Entry[] {
    return ids.flatMap(id => [
        {
            key: `voir-${id}`, make: (rng: Rng): Question => ({
                type: 'choice', key: `voir-${id}`, prompt: 'Quelle est cette planète ?', art: { t: 'planet', id }, answer: id,
                explain: `C’est ${planet(id).name} : ${planet(id).clue}.`,
                choices: shuffle([id, ...others(pool, id, n - 1, rng)], rng).map(p => ({ id: p, label: name(p) }))
            })
        },
        {
            key: `trouver-${id}`, make: (rng: Rng): Question => ({
                type: 'choice', key: `trouver-${id}`, prompt: `Touche ${planet(id).name}.`, answer: id,
                explain: `${name(id)} : ${planet(id).clue}.`,
                choices: shuffle([id, ...others(pool, id, n - 1, rng)], rng).map(planetChoice)
            })
        }
    ]);
}

const next = (id: PlanetId): PlanetId => planetIds[rank(id)]!;
const before = (id: PlanetId): PlanetId => planetIds[rank(id) - 2]!;

function neighbours(ids: PlanetId[]): Entry[] {
    const all = planetIds;
    return [
        ...ids.filter(id => id !== 'neptune').map(id => ({
            key: `apres-${id}`, make: (rng: Rng): Question => {
                const right = next(id);
                return { type: 'choice' as const, key: `apres-${id}`, prompt: `En partant du Soleil, quelle planète vient juste après ${planet(id).name} ?`, answer: right,
                    explain: `Après ${planet(id).name} vient ${planet(right).name}, la ${rank(right)}${rank(right) === 1 ? 're' : 'e'} planète.`,
                    choices: shuffle([right, ...others(all.filter(p => p !== id), right, 2, rng)], rng).map(planetChoice) };
            }
        })),
        ...ids.filter(id => id !== 'mercure').map(id => ({
            key: `avant-${id}`, make: (rng: Rng): Question => {
                const right = before(id);
                return { type: 'choice' as const, key: `avant-${id}`, prompt: `Quelle planète est juste avant ${planet(id).name}, plus près du Soleil ?`, answer: right,
                    explain: `Juste avant ${planet(id).name}, il y a ${planet(right).name}.`,
                    choices: shuffle([right, ...others(all.filter(p => p !== id), right, 2, rng)], rng).map(planetChoice) };
            }
        }))
    ];
}

const ordinal = (n: number): string => n === 1 ? '1re' : `${n}e`;

function biggerPairs(): Entry[] {
    // Pairs a child can judge by eye (at least 30 % wider), drawn at true scale side by side.
    const pairs: [PlanetId, PlanetId][] = [['jupiter', 'terre'], ['saturne', 'mars'], ['terre', 'mercure'], ['venus', 'mars'], ['jupiter', 'neptune'], ['uranus', 'terre'],
        ['saturne', 'uranus'], ['neptune', 'venus'], ['mars', 'mercure'], ['terre', 'mars'], ['neptune', 'mars'], ['saturne', 'terre']];
    return pairs.map(([big, small]) => ({
        key: `gros-${big}-${small}`, make: (rng: Rng): Question => {
            const ids = shuffle([big, small], rng);
            const ratio = planet(big).radiusKm / planet(small).radiusKm;
            return { type: 'spot', key: `gros-${big}-${small}`, prompt: 'Touche la planète la plus grosse.', scene: { t: 'sizes', ids }, answer: big,
                explain: `${name(big)} est ${ratio >= 2 ? `environ ${Math.round(ratio)} fois` : 'nettement'} plus large que ${planet(small).name}. Ici, les deux sont dessinées à la même échelle.` };
        }
    }));
}

function farPairs(): Entry[] {
    const list: [PlanetId, PlanetId][] = [['mars', 'venus'], ['jupiter', 'terre'], ['neptune', 'saturne'], ['uranus', 'jupiter'], ['saturne', 'mars'], ['terre', 'mercure'], ['venus', 'mercure'], ['neptune', 'uranus'], ['mars', 'terre'], ['saturne', 'jupiter']];
    return list.map(([far, near]) => ({
        key: `loin-${far}-${near}`, make: (rng: Rng): Question => ({
            type: 'choice', key: `loin-${far}-${near}`, prompt: 'Laquelle est la plus loin du Soleil ?', answer: far,
            explain: `${name(far)} est la ${ordinal(rank(far))} planète, ${planet(near).name} la ${ordinal(rank(near))}. Plus on est loin du Soleil, plus il fait froid et plus l’année est longue.`,
            choices: shuffle([far, near], rng).map(planetChoice)
        })
    }));
}

/* ---------- moon ---------- */

function phaseNames(ids: PhaseId[], pool: PhaseId[]): Entry[] {
    return ids.map(id => ({
        key: `phase-${id}`, make: (rng: Rng): Question => ({
            type: 'choice', key: `phase-${id}`, prompt: 'Comment s’appelle cette Lune ?', art: { t: 'moon', phase: id }, answer: id,
            explain: phaseExplain(id),
            choices: shuffle([id, ...others(pool, id, Math.min(3, pool.length - 1), rng)], rng).map(p => ({ id: p, label: phase(p).name }))
        })
    }));
}

function phaseExplain(id: PhaseId): string {
    if (id === 'nouvelle') return 'Nouvelle lune : la Lune est entre la Terre et le Soleil, son côté éclairé nous tourne le dos. On ne la voit presque pas.';
    if (id === 'pleine') return 'Pleine lune : la Terre est entre le Soleil et la Lune, on voit toute sa face éclairée.';
    const p = phase(id);
    return `${p.name} : ${waxing(p.age) ? 'elle grandit, éclairée à droite, comme la panse d’un D' : 'elle diminue, éclairée à gauche, comme un C'}.`;
}

function growing(ids: PhaseId[]): Entry[] {
    return ids.map(id => ({
        key: `grandit-${id}`, make: (): Question => ({
            type: 'choice', key: `grandit-${id}`, prompt: 'Cette Lune grandit-elle ou diminue-t-elle ?', art: { t: 'moon', phase: id }, answer: waxing(phase(id).age) ? 'grandit' : 'diminue',
            explain: waxing(phase(id).age) ? 'Elle a la forme d’un D (bossue à droite) : elle grandit, elle croît. La Lune est menteuse !' : 'Elle a la forme d’un C : elle diminue, elle décroît. La Lune est menteuse !',
            choices: [{ id: 'grandit', label: 'Elle grandit' }, { id: 'diminue', label: 'Elle diminue' }]
        })
    }));
}

function phaseAfter(): Entry[] {
    return phaseIds.map((id, i) => ({
        key: `phase-apres-${id}`, make: (rng: Rng): Question => {
            const right = phaseIds[(i + 1) % 8]!;
            return {
                type: 'choice', key: `phase-apres-${id}`, prompt: `Voici ${phase(id).name.toLowerCase()}. Quelle forme verras-tu quelques jours plus tard ?`, art: { t: 'moon', phase: id }, answer: right,
                explain: `Après ${phase(id).name.toLowerCase()} vient ${phase(right).name.toLowerCase()}. Le cycle complet dure environ 29 jours et demi.`,
                choices: shuffle([right, ...others(phaseIds.filter(p => p !== id), right, 2, rng)], rng).map(phaseChoice)
            };
        }
    }));
}

/* ---------- stars ---------- */

function hotter(): Entry[] {
    const pairs: [StarColor, StarColor][] = [['bleue', 'rouge'], ['blanche', 'rouge'], ['jaune', 'rouge'], ['bleue', 'jaune'], ['bleue', 'orange'], ['blanche', 'orange'], ['jaune', 'orange'], ['bleue', 'blanche']];
    return pairs.map(([hot, cool]) => ({
        key: `chaude-${hot}-${cool}`, make: (rng: Rng): Question => {
            const colors = shuffle([hot, cool], rng);
            return { type: 'spot', key: `chaude-${hot}-${cool}`, prompt: 'Touche l’étoile la plus chaude.', scene: { t: 'stars', colors }, answer: `etoile-${colors.indexOf(hot)}`,
                explain: `Une étoile ${hot} est plus chaude qu’une étoile ${cool}. Du plus froid au plus chaud : rouge, orange, jaune, blanche, bleue.` };
        }
    }));
}

function recogniseConstellation(ids: ConstellationId[]): Entry[] {
    return ids.map(id => ({
        key: `forme-${id}`, make: (rng: Rng): Question => ({
            type: 'choice', key: `forme-${id}`, prompt: 'Quelle est cette constellation ?', art: { t: 'constellation', id, lines: true }, answer: id,
            explain: `${capitalised(constellation(id).name)} : ${constellation(id).picture}.`,
            choices: shuffle([id, ...others(ids, id, 2, rng)], rng).map(c => ({ id: c, label: capitalised(constellation(c).name) }))
        })
    }));
}

/* ---------- the lessons ---------- */

const sun: Art = { t: 'sun' };

export const lessons: Lesson[] = [
    {
        title: 'Le Soleil et la Terre', hue: 42, levels: [
            {
                lesson: 1, title: 'Le Soleil, notre étoile', notion: { title: 'Le Soleil est une étoile', art: sun, lines: ['Le Soleil est une énorme boule de gaz très chaud.', 'C’est une étoile, la plus proche de nous. Il nous donne lumière et chaleur.', 'Ne le regarde jamais en face : ça abîme les yeux.'] },
                bank: [
                    qcm('soleil-quoi', 'Le Soleil est…', 'une étoile', ['une planète', 'une lune'], 'Le Soleil est une étoile : il fabrique sa propre lumière.', sun),
                    qcm('soleil-donne', 'Que nous donne le Soleil ?', 'La lumière et la chaleur', ['La pluie', 'Le vent froid'], 'Sans le Soleil, la Terre serait noire et glacée.', sun),
                    qcm('soleil-yeux', 'Peut-on regarder le Soleil en face ?', 'Non, jamais', ['Oui, avec des lunettes de soleil', 'Oui, le matin'], 'Même avec des lunettes de soleil, sa lumière abîme les yeux. Les astronomes utilisent des filtres spéciaux.'),
                    qcm('soleil-fait', 'De quoi est fait le Soleil ?', 'De gaz très chaud', ['De roche', 'De glace'], 'Le Soleil est une boule de gaz si chaud qu’il brille.', sun),
                    tf('soleil-proche', 'Le Soleil est l’étoile la plus proche de la Terre.', true, 'Oui ! Les autres étoiles sont des soleils beaucoup plus lointains.'),
                    tf('soleil-planete', 'Le Soleil est une planète.', false, 'Non : le Soleil est une étoile. Les planètes tournent autour de lui.', sun),
                    qcm('soleil-centre', 'Qui tourne autour du Soleil ?', 'Les planètes', ['Personne', 'Les étoiles de la nuit'], 'Les huit planètes, dont la Terre, tournent autour du Soleil.', { t: 'system' }),
                    tf('soleil-lumiere', 'Le Soleil fabrique sa propre lumière.', true, 'Oui, comme toutes les étoiles. Les planètes et la Lune, elles, sont seulement éclairées.', sun),
                    qcm('soleil-nuit', 'Les étoiles qu’on voit la nuit sont…', 'd’autres soleils, très loin', ['des lampes dans le ciel', 'des petits cailloux'], 'Chaque étoile est un soleil. Elles paraissent petites parce qu’elles sont très, très loin.')
                ]
            },
            {
                lesson: 1, title: 'Le jour et la nuit', notion: { title: 'La Terre tourne sur elle-même', art: { t: 'daynight', sun: 'left' }, lines: ['La Terre tourne sur elle-même comme une toupie : un tour par jour.', 'Le côté tourné vers le Soleil est dans le jour.', 'L’autre côté est dans la nuit.'] },
                bank: [
                    spot('jour-gauche', 'Touche le côté de la Terre où il fait jour.', { t: 'daynight', sun: 'left' }, 'jour', 'Il fait jour du côté qui regarde le Soleil.'),
                    spot('nuit-gauche', 'Touche le côté de la Terre où il fait nuit.', { t: 'daynight', sun: 'left' }, 'nuit', 'Il fait nuit du côté qui tourne le dos au Soleil.'),
                    spot('jour-droite', 'Le Soleil est à droite. Touche le côté où il fait jour.', { t: 'daynight', sun: 'right' }, 'jour', 'Le jour est toujours du côté du Soleil.'),
                    spot('nuit-droite', 'Le Soleil est à droite. Touche le côté où il fait nuit.', { t: 'daynight', sun: 'right' }, 'nuit', 'La nuit est du côté opposé au Soleil.'),
                    qcm('nuit-pourquoi', 'Pourquoi fait-il nuit ?', 'La Terre tourne sur elle-même', ['Le Soleil s’éteint', 'La Lune cache le Soleil'], 'Le Soleil brille toujours : c’est notre côté de la Terre qui lui tourne le dos.'),
                    qcm('jour-duree', 'Combien de temps faut-il à la Terre pour faire un tour sur elle-même ?', 'Un jour', ['Une heure', 'Un an'], 'Un tour sur elle-même : un jour et une nuit, environ 24 heures.'),
                    qcm('lever-est', 'De quel côté le Soleil se lève-t-il ?', 'À l’est', ['À l’ouest', 'Au nord'], 'Le Soleil se lève à l’est et se couche à l’ouest.'),
                    qcm('coucher-ouest', 'De quel côté le Soleil se couche-t-il ?', 'À l’ouest', ['À l’est', 'Au sud'], 'Le Soleil se couche à l’ouest. Ce n’est pas lui qui bouge : c’est la Terre qui tourne.'),
                    tf('nuit-partout', 'Quand il fait nuit en France, il fait jour de l’autre côté de la Terre.', true, 'Oui : la moitié de la Terre est toujours éclairée.')
                ]
            },
            {
                lesson: 1, title: 'Une année, un tour', notion: { title: 'La Terre tourne autour du Soleil', art: { t: 'year' }, lines: ['La Terre fait le tour du Soleil en un an : 365 jours.', 'Elle est penchée : c’est ce qui fait les saisons.', 'Quand tu fêtes ton anniversaire, la Terre a fait un tour de plus !'] },
                bank: [
                    qcm('an-tour', 'Combien de temps la Terre met-elle pour faire le tour du Soleil ?', 'Un an', ['Un jour', 'Un mois'], 'Un tour du Soleil, c’est une année.', { t: 'year' }),
                    qcm('an-jours', 'Combien de jours dans une année ?', '365 jours', ['30 jours', '100 jours'], 'Une année dure 365 jours, et 366 les années bissextiles.'),
                    qcm('an-anniv', 'Entre deux anniversaires, la Terre a fait…', 'un tour du Soleil', ['un tour sur elle-même', 'un tour de la Lune'], 'Un an = un tour du Soleil. Si tu as 6 ans, tu as fait 6 fois le tour du Soleil !'),
                    qcm('saisons', 'Pourquoi y a-t-il des saisons ?', 'La Terre est penchée', ['Le Soleil s’éloigne l’hiver', 'Les nuages cachent le Soleil'], 'La Terre est penchée : l’été, notre côté reçoit le Soleil plus haut et plus longtemps.'),
                    qcm('ete-jours', 'En été, en France, les journées sont…', 'plus longues', ['plus courtes', 'pareilles qu’en hiver'], 'En été, le Soleil monte haut et reste longtemps dans le ciel.'),
                    tf('ete-loin', 'En hiver, il fait froid parce que la Terre est loin du Soleil.', false, 'Non ! Début janvier, la Terre est même au plus près du Soleil. C’est son inclinaison qui fait l’hiver.'),
                    qcm('saisons-nombre', 'Combien y a-t-il de saisons dans une année ?', '4', ['2', '12'], 'Printemps, été, automne, hiver : quatre saisons pendant un tour du Soleil.'),
                    tf('an-tourne', 'Pendant une année, la Terre tourne aussi sur elle-même chaque jour.', true, 'Oui : 365 tours sur elle-même pendant un tour du Soleil.', { t: 'year' })
                ]
            },
            {
                lesson: 1, title: 'La famille du Soleil', notion: { title: 'Le système solaire', art: { t: 'system' }, lines: ['Huit planètes tournent autour du Soleil.', 'La Terre est la troisième en partant du Soleil.', 'Le dessin n’est pas à l’échelle : en vrai, les planètes sont bien plus loin les unes des autres.'] },
                bank: [
                    spot('sys-soleil', 'Touche le Soleil.', { t: 'system' }, 'soleil', 'Le Soleil est au centre ; les planètes tournent autour de lui.'),
                    spot('sys-terre', 'Touche la Terre, notre planète.', { t: 'system' }, 'terre', 'La Terre est la troisième planète en partant du Soleil.'),
                    spot('sys-jupiter', 'Touche la plus grosse planète.', { t: 'system' }, 'jupiter', 'Jupiter est la plus grosse : on pourrait y mettre plus de 1 000 Terres.'),
                    spot('sys-saturne', 'Touche la planète aux grands anneaux.', { t: 'system' }, 'saturne', 'Saturne a les anneaux les plus brillants, faits de glace et de cailloux.'),
                    spot('sys-mercure', 'Touche la planète la plus proche du Soleil.', { t: 'system' }, 'mercure', 'Mercure est la plus proche du Soleil.'),
                    spot('sys-neptune', 'Touche la planète la plus loin du Soleil.', { t: 'system' }, 'neptune', 'Neptune est la plus lointaine des huit planètes.'),
                    qcm('sys-combien', 'Combien de planètes tournent autour du Soleil ?', '8', ['3', '20'], 'Il y a huit planètes : Mercure, Vénus, la Terre, Mars, Jupiter, Saturne, Uranus et Neptune.', { t: 'system' }),
                    qcm('sys-rang', 'La Terre est la combientième planète en partant du Soleil ?', 'La 3e', ['La 1re', 'La 8e'], 'Mercure, Vénus, puis la Terre : la troisième.', { t: 'system' }),
                    tf('sys-pluton', 'Pluton est une planète naine, plus petite que la Lune.', true, 'Oui ! Depuis 2006, Pluton est rangée parmi les planètes naines.')
                ]
            },
            {
                lesson: 1, title: 'Rocheuses et géantes', notion: { title: 'Deux familles de planètes', art: { t: 'sizes', ids: ['terre', 'jupiter'] }, lines: ['Les quatre premières planètes sont petites et rocheuses : on pourrait y poser le pied.', 'Les quatre suivantes sont des géantes faites surtout de gaz et de glaces.', 'Jupiter et la Terre sont dessinées ici à la même échelle.'] },
                bank: [
                    ...planetIds.map(id => qcmArt(`famille-${id}`, `${name(id)} est une planète…`, { id: planet(id).family, label: planet(id).family === 'rocheuse' ? 'rocheuse' : 'géante' }, [{ id: planet(id).family === 'rocheuse' ? 'géante' : 'rocheuse', label: planet(id).family === 'rocheuse' ? 'géante' : 'rocheuse' }],
                        planet(id).family === 'rocheuse' ? `${name(id)} est rocheuse, comme la Terre : un sol de pierre.` : `${name(id)} est une géante : pas de sol où marcher, surtout du gaz.`, { t: 'planet', id })),
                    qcmArt('marcher', 'Sur laquelle pourrait-on poser le pied ?', planetChoice('mars'), [planetChoice('jupiter'), planetChoice('neptune')], 'Mars est rocheuse : des robots y roulent déjà. Jupiter et Neptune n’ont pas de sol.'),
                    tf('geantes-anneaux', 'Les quatre planètes géantes ont toutes des anneaux.', true, 'Oui ! Ceux de Saturne sont les plus beaux, ceux des autres sont fins et sombres.')
                ]
            }
        ]
    },
    {
        title: 'Reconnaître les planètes', hue: 205, levels: [
            { lesson: 2, title: 'Quatre planètes faciles', notion: { title: 'Chaque planète a son visage', art: { t: 'planet', id: 'saturne' }, lines: ['La Terre est bleue avec des nuages blancs.', 'Mars est rouge. Jupiter a des bandes et une tache rouge.', 'Saturne a de grands anneaux.'] }, bank: recognise(['terre', 'mars', 'jupiter', 'saturne'], ['terre', 'mars', 'jupiter', 'saturne'], 3) },
            { lesson: 2, title: 'Quatre autres planètes', notion: { title: 'Mercure, Vénus, Uranus, Neptune', art: { t: 'planet', id: 'neptune' }, lines: ['Mercure est grise et pleine de cratères, comme la Lune.', 'Vénus est jaune pâle, couverte de nuages.', 'Uranus est bleu-vert pâle, Neptune bleu profond.'] }, bank: recognise(['mercure', 'venus', 'uranus', 'neptune'], ['mercure', 'venus', 'uranus', 'neptune'], 3) },
            { lesson: 2, title: 'Les huit planètes', notion: { title: 'Toute la famille', art: { t: 'system' }, lines: ['Maintenant, les huit planètes sont mélangées.', 'Regarde bien la couleur, les bandes, les anneaux.'] }, bank: recognise(planetIds, planetIds, 4) },
            {
                lesson: 2, title: 'Devinettes', notion: { title: 'Qui suis-je ?', art: { t: 'planet', id: 'mars' }, lines: ['Chaque planète a quelque chose de spécial.', 'Écoute bien l’indice, puis trouve la planète.'] },
                bank: ([
                    ['dev-rouge', 'Je suis la planète rouge.', 'mars', 'Mars est rouge à cause de sa poussière pleine de rouille.'],
                    ['dev-anneaux', 'J’ai les plus beaux anneaux.', 'saturne', 'Les anneaux de Saturne sont faits de milliards de morceaux de glace.'],
                    ['dev-grosse', 'Je suis la plus grosse planète.', 'jupiter', 'Jupiter est la plus grosse planète du système solaire.'],
                    ['dev-tempete', 'J’ai une tempête plus grande que la Terre.', 'jupiter', 'La Grande Tache rouge de Jupiter est une tempête qui dure depuis des siècles.'],
                    ['dev-vie', 'Je suis la seule planète où l’on connaît la vie.', 'terre', 'La Terre a de l’eau liquide, de l’air… et toi !'],
                    ['dev-proche', 'Je suis la plus proche du Soleil.', 'mercure', 'Mercure fait le tour du Soleil en 88 jours seulement.'],
                    ['dev-chaude', 'Je suis la planète la plus chaude.', 'venus', 'Vénus est encore plus chaude que Mercure : ses nuages gardent la chaleur, plus de 450 °C.'],
                    ['dev-couchee', 'Je tourne couchée sur le côté.', 'uranus', 'Uranus est si penchée qu’elle roule presque sur son orbite.'],
                    ['dev-loin', 'Je suis la plus loin du Soleil.', 'neptune', 'Neptune est 30 fois plus loin du Soleil que la Terre.'],
                    ['dev-berger', 'On m’appelle l’étoile du Berger, mais je suis une planète.', 'venus', 'Vénus brille très fort le soir ou le matin : ce n’est pas une étoile.'],
                    ['dev-vents', 'Mes vents sont les plus rapides.', 'neptune', 'Sur Neptune, le vent souffle à plus de 2 000 km/h.'],
                    ['dev-petite', 'Je suis la plus petite planète.', 'mercure', 'Mercure est à peine plus grande que notre Lune.']
                ] as const).map(([key, clue, id, explain]) => ({
                    key, make: (rng: Rng): Question => ({ type: 'choice', key, prompt: clue, explain, answer: id, choices: shuffle([id, ...others(planetIds, id, 3, rng)], rng).map(planetChoice) })
                }))
            },
            {
                lesson: 2, title: 'Vrai ou faux ?', notion: { title: 'Des idées à vérifier', art: { t: 'planet', id: 'jupiter' }, lines: ['Un astronome vérifie toujours ce qu’il entend.', 'À toi de dire si c’est vrai ou faux !'] },
                bank: [
                    tf('vf-anneaux', 'Saturne est la seule planète qui a des anneaux.', false, 'Faux : Jupiter, Uranus et Neptune en ont aussi, mais très fins.', { t: 'planet', id: 'saturne' }),
                    tf('vf-mars-lunes', 'Mars a deux petites lunes.', true, 'Vrai : elles s’appellent Phobos et Déimos.', { t: 'planet', id: 'mars' }),
                    tf('vf-jupiter-terre', 'Jupiter est plus grosse que la Terre.', true, 'Vrai : Jupiter est environ 11 fois plus large que la Terre.', { t: 'sizes', ids: ['terre', 'jupiter'] }),
                    tf('vf-venus-chaude', 'Vénus est plus chaude que Mercure.', true, 'Vrai, alors qu’elle est plus loin du Soleil : son épaisse atmosphère garde la chaleur.', { t: 'planet', id: 'venus' }),
                    tf('vf-respirer', 'On peut respirer sans casque sur Mars.', false, 'Faux : l’air de Mars est très léger et sans oxygène à respirer.', { t: 'planet', id: 'mars' }),
                    tf('vf-terre-grosse', 'La Terre est la plus grosse planète.', false, 'Faux : Jupiter, Saturne, Uranus et Neptune sont bien plus grosses.', { t: 'planet', id: 'terre' }),
                    tf('vf-mercure-lune', 'Mercure a une lune.', false, 'Faux : ni Mercure ni Vénus n’ont de lune.', { t: 'planet', id: 'mercure' }),
                    tf('vf-neptune-bleue', 'Neptune est bleue.', true, 'Vrai : un gaz de son atmosphère, le méthane, lui donne sa couleur bleue.', { t: 'planet', id: 'neptune' }),
                    tf('vf-uranus', 'Uranus tourne couchée sur le côté.', true, 'Vrai : son axe est presque à plat.', { t: 'planet', id: 'uranus' }),
                    tf('vf-gaz', 'On peut atterrir sur Jupiter comme sur la Lune.', false, 'Faux : Jupiter est une géante de gaz, il n’y a pas de sol pour se poser.', { t: 'planet', id: 'jupiter' })
                ]
            }
        ]
    },
    {
        title: 'L’ordre des planètes', hue: 160, levels: [
            {
                lesson: 3, title: 'Les quatre rocheuses', notion: { title: 'Mercure, Vénus, Terre, Mars', art: { t: 'system' }, lines: ['En partant du Soleil : Mercure, Vénus, la Terre, puis Mars.', 'Touche-les dans l’ordre pour les ranger.'] },
                bank: [
                    order('ordre-rocheuses', 'Range ces planètes en partant du Soleil.', (['mercure', 'venus', 'terre', 'mars'] as PlanetId[]).map(planetChoice), 'Mercure, Vénus, la Terre, Mars : les quatre planètes rocheuses.'),
                    order('ordre-rocheuses-3', 'Range ces trois planètes en partant du Soleil.', (['venus', 'terre', 'mars'] as PlanetId[]).map(planetChoice), 'Vénus est la 2e, la Terre la 3e, Mars la 4e.'),
                    ...neighbours(['mercure', 'venus', 'terre', 'mars']).filter(e => !['avant-mercure', 'apres-mars'].includes(e.key))
                ]
            },
            {
                lesson: 3, title: 'Les quatre géantes', notion: { title: 'Jupiter, Saturne, Uranus, Neptune', art: { t: 'system' }, lines: ['Après Mars viennent les géantes : Jupiter, Saturne, Uranus et Neptune.', 'Neptune est la plus lointaine.'] },
                bank: [
                    order('ordre-geantes', 'Range ces planètes en partant du Soleil.', (['jupiter', 'saturne', 'uranus', 'neptune'] as PlanetId[]).map(planetChoice), 'Jupiter, Saturne, Uranus, Neptune : les quatre géantes.'),
                    order('ordre-geantes-3', 'Range ces trois planètes en partant du Soleil.', (['saturne', 'uranus', 'neptune'] as PlanetId[]).map(planetChoice), 'Saturne est la 6e, Uranus la 7e, Neptune la 8e.'),
                    ...neighbours(['mars', 'jupiter', 'saturne', 'uranus', 'neptune']).filter(e => !['avant-mars', 'apres-mars'].includes(e.key))
                ]
            },
            {
                lesson: 3, title: 'Une phrase pour s’en souvenir', notion: { title: '« Me Voici Toute Mouillée, J’ai Suivi Un Nuage »', art: { t: 'system' }, lines: ['Chaque mot commence comme une planète :', 'Me → Mercure, Voici → Vénus, Toute → Terre, Mouillée → Mars,', 'J’ai → Jupiter, Suivi → Saturne, Un → Uranus, Nuage → Neptune.'] },
                bank: [
                    ...planetIds.map((id, i) => ({
                        key: `phrase-${id}`, make: (rng: Rng): Question => ({
                            type: 'choice' as const, key: `phrase-${id}`, prompt: `Dans « Me Voici Toute Mouillée, J’ai Suivi Un Nuage », quelle planète donne le mot « ${MNEMONIC[i]!.replace(',', '')} » ?`, answer: id,
                            explain: `« ${MNEMONIC[i]!.replace(',', '')} » est le ${ordinal(i + 1).replace('1re', '1er')} mot : c’est ${planet(id).name}, la ${ordinal(i + 1)} planète.`,
                            choices: shuffle([id, ...others(planetIds, id, 2, rng)], rng).map(planetChoice)
                        })
                    })),
                    order('ordre-tout-phrase', 'Avec la phrase, range les huit planètes en partant du Soleil.', planetIds.map(planetChoice), 'Me Voici Toute Mouillée, J’ai Suivi Un Nuage !')
                ]
            },
            {
                lesson: 3, title: 'Quelle place ?', notion: { title: 'Compter depuis le Soleil', art: { t: 'system' }, lines: ['Mercure est la 1re, Neptune la 8e.', 'Compte sur tes doigts en partant du Soleil.'] },
                bank: planetIds.map(id => ({
                    key: `place-${id}`, make: (rng: Rng): Question => rng() < 0.5
                        ? { type: 'spot' as const, key: `place-${id}`, prompt: `Touche la ${ordinal(rank(id))} planète en partant du Soleil.`, scene: { t: 'system' as const }, answer: id, explain: `La ${ordinal(rank(id))} planète, c’est ${planet(id).name}.` }
                        : { type: 'choice' as const, key: `place-${id}`, prompt: `${name(id)} est la combientième planète en partant du Soleil ?`, art: { t: 'planet' as const, id }, answer: `r${rank(id)}`,
                            explain: `${name(id)} est la ${ordinal(rank(id))} planète.`,
                            choices: shuffle([rank(id), ...others([1, 2, 3, 4, 5, 6, 7, 8], rank(id), 2, rng)], rng).map(n => ({ id: `r${n}`, label: `La ${ordinal(n)}` })) }
                }))
            },
            {
                lesson: 3, title: 'Le grand rangement', notion: { title: 'Les huit dans l’ordre', art: { t: 'system' }, lines: ['Dernier défi : range toutes les planètes.', 'Tu peux te redire la phrase dans ta tête.'] },
                bank: [
                    order('grand-8', 'Range les huit planètes en partant du Soleil.', planetIds.map(planetChoice), 'Mercure, Vénus, Terre, Mars, Jupiter, Saturne, Uranus, Neptune.'),
                    order('grand-8-inverse', 'Range les huit planètes de la plus lointaine à la plus proche du Soleil.', [...planetIds].reverse().map(planetChoice), 'Neptune, Uranus, Saturne, Jupiter, Mars, Terre, Vénus, Mercure.'),
                    order('grand-5', 'Range ces planètes en partant du Soleil.', (['venus', 'mars', 'jupiter', 'uranus', 'neptune'] as PlanetId[]).map(planetChoice), 'Vénus (2e), Mars (4e), Jupiter (5e), Uranus (7e), Neptune (8e).'),
                    order('grand-5b', 'Range ces planètes en partant du Soleil.', (['mercure', 'terre', 'jupiter', 'saturne', 'neptune'] as PlanetId[]).map(planetChoice), 'Mercure (1re), Terre (3e), Jupiter (5e), Saturne (6e), Neptune (8e).'),
                    order('grand-4a', 'Range ces planètes en partant du Soleil.', (['venus', 'terre', 'saturne', 'uranus'] as PlanetId[]).map(planetChoice), 'Vénus (2e), Terre (3e), Saturne (6e), Uranus (7e).'),
                    order('grand-4b', 'Range ces planètes en partant du Soleil.', (['mercure', 'mars', 'jupiter', 'neptune'] as PlanetId[]).map(planetChoice), 'Mercure (1re), Mars (4e), Jupiter (5e), Neptune (8e).'),
                    ...neighbours(['venus', 'jupiter', 'uranus']).slice(0, 4)
                ]
            }
        ]
    },
    {
        title: 'Tailles et distances', hue: 280, levels: [
            { lesson: 4, title: 'Grosse ou petite ?', notion: { title: 'À la même échelle', art: { t: 'sizes', ids: ['mercure', 'venus', 'terre', 'mars'] }, lines: ['Ici, les planètes sont dessinées à leur vraie taille les unes par rapport aux autres.', 'Vénus et la Terre sont presque jumelles. Mercure est la plus petite.'] }, bank: biggerPairs() },
            {
                lesson: 4, title: 'Range par taille', notion: { title: 'Des petites aux géantes', art: { t: 'sizes', ids: ['mars', 'terre', 'neptune', 'saturne', 'jupiter'] }, lines: ['De la plus petite à la plus grosse : Mercure, Mars, Vénus, la Terre, Neptune, Uranus, Saturne, Jupiter.'] },
                bank: ([
                    ['mercure', 'terre', 'jupiter'], ['mars', 'uranus', 'saturne'], ['mercure', 'venus', 'neptune'], ['mars', 'terre', 'jupiter'],
                    ['venus', 'uranus', 'jupiter'], ['mercure', 'mars', 'terre', 'saturne'], ['mars', 'neptune', 'saturne', 'jupiter'], ['mercure', 'terre', 'uranus', 'jupiter']
                ] as PlanetId[][]).map(ids => order(`taille-${ids.join('-')}`, 'Range de la plus petite à la plus grosse.', ids.map(planetChoice), `${ids.map(name).join(' < ')}.`, { t: 'sizes', ids }))
            },
            {
                lesson: 4, title: 'Le Soleil géant', notion: { title: 'Le Soleil est immense', art: { t: 'sun-earth' }, lines: ['Il faudrait aligner 109 Terres pour traverser le Soleil.', 'Il paraît petit parce qu’il est très loin : 150 millions de kilomètres.', 'La Lune est 4 fois plus petite que la Terre.'] },
                bank: [
                    qcm('soleil-terres', 'Combien de Terres faudrait-il aligner pour traverser le Soleil ?', 'Environ 100', ['Environ 2', 'Environ 10'], 'Le Soleil est 109 fois plus large que la Terre.', { t: 'sun-earth' }),
                    qcm('soleil-petit', 'Pourquoi le Soleil paraît-il petit dans le ciel ?', 'Il est très loin', ['Il est vraiment petit', 'Il est derrière les nuages'], 'Le Soleil est à 150 millions de kilomètres : il faudrait 170 ans en voiture pour y aller !'),
                    tf('soleil-jupiter', 'Le Soleil est plus gros que Jupiter.', true, 'Vrai : le Soleil est environ 10 fois plus large que Jupiter.', { t: 'sun-earth' }),
                    qcm('lune-taille', 'La Lune, par rapport à la Terre, est…', '4 fois plus petite', ['aussi grande', '4 fois plus grande'], 'La Lune est environ 4 fois moins large que la Terre.', { t: 'earth-moon' }),
                    qcm('lumiere-8', 'Combien de temps met la lumière du Soleil pour arriver jusqu’à nous ?', 'Environ 8 minutes', ['Un jour', 'Une seconde'], 'La lumière est la chose la plus rapide qui existe, et il lui faut quand même 8 minutes.'),
                    tf('soleil-moyen', 'Le Soleil est une étoile de taille moyenne : il existe des étoiles bien plus grosses.', true, 'Vrai : Bételgeuse, dans Orion, est des centaines de fois plus large que le Soleil.'),
                    qcm('lune-distance', 'Qu’est-ce qui est le plus près de la Terre ?', 'La Lune', ['Le Soleil', 'Mars'], 'La Lune est à 384 000 km : c’est notre plus proche voisine.', { t: 'earth-moon' }),
                    tf('terre-lune-30', 'On pourrait aligner environ 30 Terres entre la Terre et la Lune.', true, 'Vrai : la Lune est à environ 30 fois la largeur de la Terre.', { t: 'earth-moon' })
                ]
            },
            { lesson: 4, title: 'Près ou loin ?', notion: { title: 'Les distances au Soleil', art: { t: 'system' }, lines: ['Plus une planète est loin du Soleil, plus il y fait froid.', 'Et plus son année est longue : Neptune met 165 de nos années pour faire un tour !'] }, bank: farPairs() },
            {
                lesson: 4, title: 'Les records', notion: { title: 'Les champions du système solaire', art: { t: 'planet', id: 'jupiter' }, lines: ['La plus grosse : Jupiter. La plus petite : Mercure.', 'La plus chaude : Vénus. La plus lointaine : Neptune.'] },
                bank: ([
                    ['rec-grosse', 'Quelle est la plus grosse planète ?', 'jupiter', 'Jupiter : 11 fois plus large que la Terre.'],
                    ['rec-petite', 'Quelle est la plus petite planète ?', 'mercure', 'Mercure : un peu plus grande que la Lune.'],
                    ['rec-chaude', 'Quelle est la planète la plus chaude ?', 'venus', 'Vénus : plus de 450 °C sous ses nuages, assez pour faire fondre du plomb.'],
                    ['rec-loin', 'Quelle est la planète la plus lointaine ?', 'neptune', 'Neptune, 30 fois plus loin du Soleil que la Terre.'],
                    ['rec-annee-courte', 'Quelle planète a l’année la plus courte ?', 'mercure', 'Mercure fait le tour du Soleil en 88 jours.'],
                    ['rec-annee-longue', 'Quelle planète a l’année la plus longue ?', 'neptune', 'Neptune met 165 ans pour faire le tour du Soleil.'],
                    ['rec-jour-court', 'Sur quelle planète la journée est-elle la plus courte ?', 'jupiter', 'Jupiter tourne sur elle-même en moins de 10 heures.'],
                    ['rec-proche', 'Quelle planète passe le plus près de la Terre ?', 'venus', 'Vénus peut s’approcher à 40 millions de kilomètres de nous.']
                ] as const).map(([key, prompt, id, explain]) => ({
                    key, make: (rng: Rng): Question => ({ type: 'choice', key, prompt, explain, answer: id, choices: shuffle([id, ...others(planetIds, id, 3, rng)], rng).map(planetChoice) })
                }))
            }
        ]
    },
    {
        title: 'La Lune', hue: 225, levels: [
            {
                lesson: 5, title: 'Notre voisine', notion: { title: 'La Lune tourne autour de la Terre', art: { t: 'earth-moon' }, lines: ['La Lune tourne autour de la Terre en environ un mois.', 'Elle ne brille pas toute seule : c’est le Soleil qui l’éclaire.', 'En 1969, des astronautes ont marché sur la Lune.'] },
                bank: [
                    qcm('lune-tourne', 'La Lune tourne autour…', 'de la Terre', ['du Soleil seulement', 'de Mars'], 'La Lune tourne autour de la Terre, et toutes les deux tournent autour du Soleil.', { t: 'earth-moon' }),
                    qcm('lune-brille', 'Pourquoi voit-on la Lune briller ?', 'Le Soleil l’éclaire', ['Elle a des lampes', 'Elle est en feu'], 'La Lune renvoie la lumière du Soleil, comme un miroir un peu gris.'),
                    qcm('lune-combien', 'Combien de lunes la Terre a-t-elle ?', 'Une', ['Deux', 'Aucune'], 'La Terre a une seule lune naturelle : la Lune.'),
                    qcm('lune-sol', 'Qu’y a-t-il sur la Lune ?', 'Des cratères et de la poussière', ['Des forêts', 'Des océans'], 'Des cailloux venus de l’espace ont creusé des milliers de cratères.', { t: 'moon', phase: 'pleine' }),
                    qcm('lune-1969', 'En quelle année des humains ont-ils marché sur la Lune pour la première fois ?', '1969', ['1492', '2020'], 'Le 21 juillet 1969. Leurs traces de pas y sont encore : il n’y a pas de vent pour les effacer.', { t: 'footprint' }),
                    tf('lune-air', 'Il y a de l’air sur la Lune.', false, 'Faux : pas d’air, donc les astronautes portent un scaphandre.'),
                    tf('lune-face', 'On voit toujours la même face de la Lune.', true, 'Vrai : elle tourne sur elle-même pendant qu’elle fait le tour de la Terre, au même rythme.'),
                    qcm('lune-mois', 'Combien de temps la Lune met-elle pour faire le tour de la Terre ?', 'Environ un mois', ['Un jour', 'Un an'], 'Environ 27 jours, et 29 jours et demi pour revoir la même forme.'),
                    tf('lune-jour', 'On peut parfois voir la Lune en plein jour.', true, 'Vrai ! Regarde le ciel l’après-midi quelques jours avant la pleine lune.')
                ]
            },
            {
                lesson: 5, title: 'Pleine ou nouvelle ?', notion: { title: 'Les formes de la Lune', art: { t: 'moon', phase: 'pleine' }, lines: ['Pleine lune : un disque tout rond et lumineux.', 'Nouvelle lune : on ne la voit presque pas.', 'Entre les deux : des croissants et des quartiers.'] },
                bank: [
                    ...phaseNames(['pleine', 'nouvelle', 'premier-quartier', 'premier-croissant'], ['pleine', 'nouvelle', 'premier-quartier', 'premier-croissant']),
                    ...(['pleine', 'nouvelle', 'premier-quartier', 'dernier-croissant'] as PhaseId[]).map(id => qcmArt(`montre-${id}`, `Touche ${id === 'nouvelle' ? 'la nouvelle lune' : id === 'pleine' ? 'la pleine lune' : phase(id).name.toLowerCase()}.`, phaseChoice(id), (['pleine', 'nouvelle', 'premier-quartier', 'dernier-croissant'] as PhaseId[]).filter(p => p !== id).slice(0, 2).map(phaseChoice), phaseExplain(id)))
                ]
            },
            {
                lesson: 5, title: 'Croissants et quartiers', notion: { title: 'Huit formes à connaître', art: { t: 'moon', phase: 'premier-quartier' }, lines: ['Croissant : une fine tranche. Quartier : une moitié.', 'Gibbeuse : presque pleine, comme une bosse.', 'Premier quand elle grandit, dernier quand elle diminue.'] },
                bank: phaseNames(phaseIds, phaseIds)
            },
            {
                lesson: 5, title: 'La Lune menteuse', notion: { title: 'C ou D ?', art: { t: 'moon', phase: 'dernier-croissant' }, lines: ['En France, quand la Lune forme un C, elle décroît : elle diminue.', 'Quand elle forme un D, elle croît : elle grandit.', 'Elle dit le contraire de ce qu’elle montre : c’est la Lune menteuse !'] },
                bank: growing(phaseIds.filter(p => p !== 'nouvelle' && p !== 'pleine')).concat([
                    qcm('menteuse-c', 'La Lune a la forme d’un C. Que fait-elle ?', 'Elle diminue', ['Elle grandit'], 'Un C : elle décroît. La Lune est menteuse !', { t: 'moon', phase: 'dernier-croissant' }),
                    qcm('menteuse-d', 'La Lune a la forme d’un D. Que fait-elle ?', 'Elle grandit', ['Elle diminue'], 'Un D : elle croît. La Lune est menteuse !', { t: 'moon', phase: 'premier-quartier' })
                ])
            },
            {
                lesson: 5, title: 'Le cycle de la Lune', notion: { title: 'Un mois de Lune', art: { t: 'moon', phase: 'gibbeuse-croissante' }, lines: ['Nouvelle lune, croissant, quartier, gibbeuse, pleine lune…', '… puis tout recommence à l’envers jusqu’à la nouvelle lune.', 'Un tour complet dure environ 29 jours et demi.'] },
                bank: [
                    ...phaseAfter(),
                    order('cycle-croit', 'Range ces Lunes de la nouvelle lune à la pleine lune.', (['nouvelle', 'premier-croissant', 'premier-quartier', 'gibbeuse-croissante', 'pleine'] as PhaseId[]).map(phaseChoice), 'Elle grandit jour après jour, éclairée par la droite.'),
                    order('cycle-decroit', 'Range ces Lunes de la pleine lune à la nouvelle lune.', (['pleine', 'gibbeuse-decroissante', 'dernier-quartier', 'dernier-croissant', 'nouvelle'] as PhaseId[]).map(phaseChoice), 'Après la pleine lune, elle diminue, éclairée par la gauche.')
                ]
            },
            {
                lesson: 5, title: 'Pourquoi elle change', notion: { title: 'Soleil, Terre et Lune', art: { t: 'moon-orbit' }, lines: ['Le Soleil éclaire toujours une moitié de la Lune.', 'Selon l’endroit où elle est autour de la Terre, on voit une plus ou moins grande partie de cette moitié.', 'Vu d’en haut, la Lune tourne dans le sens de la flèche.'] },
                bank: [
                    spot('orbite-pleine', 'Où est la Lune quand elle est pleine ?', { t: 'moon-orbit' }, 'pleine', 'Pleine lune : la Lune est de l’autre côté de la Terre, face au Soleil. On voit toute sa moitié éclairée.'),
                    spot('orbite-nouvelle', 'Où est la Lune quand c’est la nouvelle lune ?', { t: 'moon-orbit' }, 'nouvelle', 'Nouvelle lune : la Lune est entre la Terre et le Soleil. Sa moitié éclairée regarde le Soleil, pas nous.'),
                    spot('orbite-premier', 'La Lune vient de quitter la nouvelle lune et avance dans le sens de la flèche. Où est-elle au premier quartier ?', { t: 'moon-orbit' }, 'premier-quartier', 'Un quart de tour après la nouvelle lune : le premier quartier.'),
                    spot('orbite-dernier', 'Où est la Lune au dernier quartier, juste avant de revenir à la nouvelle lune ?', { t: 'moon-orbit' }, 'dernier-quartier', 'Trois quarts de tour après la nouvelle lune : le dernier quartier.'),
                    qcm('phases-pourquoi', 'Pourquoi la Lune change-t-elle de forme ?', 'On voit plus ou moins sa partie éclairée', ['Elle se casse en morceaux', 'Des nuages la cachent'], 'La Lune est toujours ronde. On voit seulement une partie plus ou moins grande de son côté éclairé.', { t: 'moon-orbit' }),
                    qcm('ombre-pas', 'Les formes de la Lune viennent-elles de l’ombre de la Terre ?', 'Non', ['Oui'], 'Non ! L’ombre de la Terre ne touche la Lune que pendant une éclipse de Lune, et seulement à la pleine lune.', { t: 'moon-orbit' }),
                    tf('eclipse', 'Une éclipse de Soleil arrive quand la Lune passe devant le Soleil.', true, 'Vrai : la Lune cache le Soleil pendant quelques minutes. C’est toujours à la nouvelle lune.'),
                    tf('moitie', 'Le Soleil éclaire toujours une moitié de la Lune.', true, 'Vrai, comme la Terre : une moitié dans le jour, l’autre dans la nuit.', { t: 'moon-orbit' })
                ]
            }
        ]
    },
    {
        title: 'Les étoiles', hue: 320, levels: [
            {
                lesson: 6, title: 'C’est quoi, une étoile ?', notion: { title: 'Des soleils lointains', art: { t: 'star', color: 'jaune' }, lines: ['Une étoile est une boule de gaz très chaud qui brille, comme le Soleil.', 'Elles sont si loin qu’elles ressemblent à des points.', 'Le jour, elles sont toujours là : le Soleil les cache.'] },
                bank: [
                    qcm('etoile-quoi', 'Une étoile, c’est…', 'une boule de gaz très chaud qui brille', ['un trou dans le ciel', 'une planète qui brille'], 'Chaque étoile est un soleil, souvent bien plus loin que tout ce qu’on imagine.', { t: 'star', color: 'blanche' }),
                    qcm('etoile-jour', 'Où sont les étoiles pendant la journée ?', 'Toujours là, cachées par la lumière du Soleil', ['Elles dorment', 'Elles tombent'], 'Le ciel bleu du jour est si lumineux qu’on ne voit plus les étoiles.'),
                    qcm('filante', 'Une étoile filante, c’est…', 'un petit caillou qui brûle dans l’air', ['une étoile qui tombe', 'un avion'], 'Une poussière venue de l’espace s’échauffe en entrant dans l’air et laisse un trait de lumière.', { t: 'meteor' }),
                    qcm('etoile-petite', 'Pourquoi les étoiles paraissent-elles si petites ?', 'Elles sont très loin', ['Elles sont minuscules', 'Elles sont derrière la Lune'], 'Beaucoup sont plus grosses que le Soleil, mais terriblement loin.'),
                    qcm('scintille', 'Pourquoi les étoiles scintillent-elles ?', 'L’air de la Terre bouge', ['Elles clignotent', 'Elles s’allument et s’éteignent'], 'L’air qui bouge au-dessus de nous fait trembler leur lumière.'),
                    tf('compter', 'On peut compter toutes les étoiles du ciel en une nuit.', false, 'Faux : à l’œil nu on en voit quelques milliers, mais l’Univers en contient bien plus que de grains de sable sur Terre.'),
                    qcm('voie-lactee', 'Notre Soleil fait partie d’une immense famille d’étoiles. Comment s’appelle-t-elle ?', 'La Voie lactée', ['La Grande Ourse', 'Le système solaire'], 'La Voie lactée est notre galaxie : plus de 100 milliards d’étoiles !', { t: 'galaxy' }),
                    tf('etoile-ville', 'On voit mieux les étoiles loin des lumières de la ville.', true, 'Vrai : à la campagne, on peut même voir la Voie lactée.')
                ]
            },
            {
                lesson: 6, title: 'Les couleurs des étoiles', notion: { title: 'Rouges, jaunes ou bleues', art: { t: 'star', color: 'bleue' }, lines: ['Les étoiles n’ont pas toutes la même couleur.', 'Les rouges sont les moins chaudes, les bleues les plus chaudes.', 'Notre Soleil est jaune-blanc, entre les deux.'] },
                bank: [
                    ...hotter(),
                    qcm('couleur-chaude', 'Quelles étoiles sont les plus chaudes ?', 'Les bleues', ['Les rouges', 'Les orange'], 'C’est le contraire des robinets : en étoile, le bleu est le plus chaud !'),
                    qcm('betelgeuse-couleur', 'Bételgeuse, dans Orion, est rouge. Rigel est bleue. Laquelle est la plus chaude ?', 'Rigel', ['Bételgeuse'], 'Rigel la bleue est bien plus chaude que Bételgeuse la rouge.', { t: 'constellation', id: 'orion', lines: true })
                ]
            },
            {
                lesson: 6, title: 'L’étoile Polaire', notion: { title: 'Trouver le nord', art: { t: 'north' }, lines: ['Prolonge cinq fois le bord de la casserole de la Grande Ourse : tu arrives sur l’étoile Polaire.', 'Elle est au bout de la queue de la Petite Ourse.', 'Elle montre le nord, et elle ne bouge presque pas : tout le ciel tourne autour d’elle.'] },
                bank: [
                    spot('polaire-trouve', 'Touche l’étoile Polaire.', { t: 'north' }, 'polaris', 'L’étoile Polaire est au bout de la queue de la Petite Ourse.'),
                    spot('polaire-dubhe', 'Touche l’étoile du bord de la casserole la plus proche de l’étoile Polaire.', { t: 'north' }, 'dubhe', 'C’est Dubhé. Avec Mérak, elle montre le chemin vers l’étoile Polaire.'),
                    spot('polaire-merak', 'Touche Mérak, en bas du bord de la casserole, à l’opposé de la queue… et de l’étoile Polaire.', { t: 'north' }, 'merak', 'Mérak et Dubhé forment le bord de la casserole : on les appelle les « gardes ».'),
                    spot('polaire-queue', 'Touche la dernière étoile de la queue de la Grande Ourse.', { t: 'north' }, 'alkaid', 'C’est Alkaïd, au bout du manche de la Grande Casserole.'),
                    qcm('polaire-nord', 'L’étoile Polaire montre…', 'le nord', ['le sud', 'l’est'], 'Face à l’étoile Polaire, tu regardes vers le nord. Les marins s’en servaient pour se diriger.', { t: 'north' }),
                    qcm('polaire-bouge', 'Pendant la nuit, l’étoile Polaire…', 'ne bouge presque pas', ['se lève et se couche', 'traverse tout le ciel'], 'Elle est presque dans l’axe de la Terre : le ciel semble tourner autour d’elle.', { t: 'north' }),
                    qcm('polaire-ourse', 'L’étoile Polaire est au bout de la queue de…', 'la Petite Ourse', ['la Grande Ourse', 'Cassiopée'], 'Elle termine la queue de la Petite Ourse.', { t: 'north' }),
                    tf('polaire-brillante', 'L’étoile Polaire est l’étoile la plus brillante du ciel.', false, 'Faux ! Elle est moyennement brillante. On la reconnaît à sa place, pas à son éclat.', { t: 'north' })
                ]
            },
            {
                lesson: 6, title: 'Le ciel tourne', notion: { title: 'Le ciel de la nuit', art: { t: 'north' }, lines: ['Comme le Soleil le jour, les étoiles se lèvent à l’est et se couchent à l’ouest.', 'C’est la Terre qui tourne, pas le ciel.', 'Autour de l’étoile Polaire, certaines étoiles ne se couchent jamais.'] },
                bank: [
                    qcm('ciel-tourne', 'Pourquoi les étoiles bougent-elles pendant la nuit ?', 'La Terre tourne sur elle-même', ['Les étoiles se promènent', 'Le vent les pousse'], 'Comme sur un manège : c’est nous qui tournons.'),
                    qcm('ciel-lever', 'De quel côté les étoiles se lèvent-elles ?', 'À l’est', ['À l’ouest', 'Au nord'], 'Comme le Soleil : elles se lèvent à l’est.'),
                    tf('ciel-grande-ourse', 'En France, la Grande Ourse se voit toute l’année.', true, 'Vrai : elle tourne autour de l’étoile Polaire sans jamais se coucher.', { t: 'north' }),
                    tf('ciel-cassiopee', 'Cassiopée est de l’autre côté de l’étoile Polaire par rapport à la Grande Ourse.', true, 'Vrai : l’étoile Polaire est entre les deux.', { t: 'north' }),
                    qcm('ciel-orion-saison', 'En France, en quelle saison voit-on le mieux Orion le soir ?', 'En hiver', ['En été', 'Jamais'], 'Orion brille les soirs d’hiver, au sud.', { t: 'constellation', id: 'orion', lines: true }),
                    qcm('ciel-triangle', 'Les soirs d’été, trois étoiles brillantes forment…', 'le Triangle d’été', ['la Grande Ourse', 'Orion'], 'Véga, Deneb et Altaïr : le Triangle d’été.', { t: 'constellation', id: 'triangle-ete', lines: true }),
                    spot('ciel-centre', 'Toutes ces étoiles tournent autour d’une seule. Touche-la.', { t: 'north' }, 'polaris', 'Tout le ciel tourne autour de l’étoile Polaire.'),
                    tf('ciel-planetes', 'Certaines « étoiles » très brillantes sont en fait des planètes.', true, 'Vrai : Vénus, Jupiter ou Mars brillent comme des étoiles, sans scintiller.')
                ]
            }
        ]
    },
    {
        title: 'Les constellations', hue: 260, levels: [
            {
                lesson: 7, title: 'Relier les étoiles', notion: { title: 'Des dessins dans le ciel', art: { t: 'constellation', id: 'cassiopee', lines: true }, lines: ['Depuis très longtemps, on relie les étoiles pour dessiner des figures : les constellations.', 'Pose ton doigt sur une étoile et glisse jusqu’à la suivante.', 'Tu peux aussi toucher une étoile, puis l’autre.'] },
                bank: [
                    draw('dessin-cassiopee', 'cassiopee', true),
                    draw('dessin-triangle', 'triangle-ete', true),
                    qcm('const-quoi', 'Une constellation, c’est…', 'un dessin imaginé avec des étoiles', ['une planète', 'un nuage'], 'Les étoiles d’une constellation sont souvent très loin les unes des autres : le dessin, c’est nous qui l’imaginons.', { t: 'constellation', id: 'cassiopee', lines: true }),
                    tf('const-88', 'Les astronomes ont partagé tout le ciel en 88 constellations.', true, 'Vrai : 88 constellations couvrent tout le ciel.'),
                    qcm('cassiopee-forme', 'Cassiopée a la forme…', 'd’un W', ['d’un rond', 'd’un carré'], 'Un grand W, ou un M selon l’heure.', { t: 'constellation', id: 'cassiopee', lines: true }),
                    qcm('triangle-forme', 'Combien d’étoiles forment le Triangle d’été ?', '3', ['5', '7'], 'Véga, Deneb et Altaïr.', { t: 'constellation', id: 'triangle-ete', lines: true }),
                    tf('const-memes', 'Toutes les étoiles d’une constellation sont à la même distance de nous.', false, 'Faux : certaines sont bien plus loin que d’autres, on les voit seulement dans la même direction.')
                ]
            },
            {
                lesson: 7, title: 'La Grande Ourse', notion: { title: 'La Grande Casserole', art: { t: 'constellation', id: 'grande-ourse', lines: true }, lines: ['Ses sept étoiles les plus brillantes dessinent une casserole.', 'Quatre pour le récipient, trois pour le manche.', 'Elle fait partie d’une grande ourse imaginée par les Grecs.'] },
                bank: [
                    draw('dessin-grande-ourse', 'grande-ourse', true),
                    draw('dessin-grande-ourse-b', 'grande-ourse', true),
                    qcm('go-etoiles', 'Combien d’étoiles brillantes forment la Grande Casserole ?', '7', ['3', '12'], 'Sept étoiles : quatre pour la casserole, trois pour le manche.', { t: 'constellation', id: 'grande-ourse', lines: true }),
                    qcm('go-forme', 'À quoi ressemble la Grande Ourse ?', 'À une casserole', ['À un W', 'À un triangle'], 'Une grande casserole… ou la queue d’une ourse.', { t: 'constellation', id: 'grande-ourse', lines: true }),
                    tf('go-mizar', 'Avec de bons yeux, on voit une petite étoile collée à Mizar, au milieu du manche.', true, 'Vrai : c’est Alcor. Autrefois, la voir servait de test pour les yeux.'),
                    qcm('go-gardes', 'Quelles étoiles de la Grande Ourse montrent l’étoile Polaire ?', 'Les deux du bord de la casserole', ['Les trois du manche', 'Aucune'], 'Dubhé et Mérak : prolonge leur ligne cinq fois.', { t: 'north' })
                ]
            },
            {
                lesson: 7, title: 'Orion le chasseur', notion: { title: 'Orion et sa ceinture', art: { t: 'constellation', id: 'orion', lines: true }, lines: ['Orion est un chasseur. Trois étoiles alignées forment sa ceinture.', 'Bételgeuse, rouge, est son épaule. Rigel, bleue, est son pied.', 'On la voit les soirs d’hiver.'] },
                bank: [
                    draw('dessin-orion', 'orion', true),
                    draw('dessin-orion-b', 'orion', true),
                    qcm('orion-ceinture', 'Les trois étoiles alignées au milieu d’Orion forment…', 'sa ceinture', ['son chapeau', 'son épée'], 'Mintaka, Alnilam et Alnitak : la ceinture d’Orion.', { t: 'constellation', id: 'orion', lines: true }),
                    qcm('orion-rouge', 'Comment s’appelle l’étoile rouge d’Orion ?', 'Bételgeuse', ['Rigel', 'Véga'], 'Bételgeuse est une supergéante rouge, immense.', { t: 'constellation', id: 'orion', lines: true }),
                    qcm('orion-qui', 'Orion est…', 'un chasseur', ['un poisson', 'une reine'], 'Dans les histoires grecques, Orion était un grand chasseur.'),
                    qcm('orion-saison', 'Quand voit-on Orion le soir en France ?', 'En hiver', ['En été'], 'Orion brille au sud les soirs d’hiver.')
                ]
            },
            {
                lesson: 7, title: 'Le Cygne et le Lion', notion: { title: 'Un oiseau et un fauve', art: { t: 'constellation', id: 'cygne', lines: true }, lines: ['Le Cygne vole les soirs d’été : une grande croix, Deneb au bout de la queue.', 'Le Lion est couché dans le ciel du printemps, Régulus sur son cœur.'] },
                bank: [
                    draw('dessin-cygne', 'cygne', true),
                    draw('dessin-lion', 'lion', true),
                    qcm('cygne-forme', 'Le Cygne ressemble aussi à…', 'une grande croix', ['un W', 'une casserole'], 'On l’appelle aussi la Croix du Nord.', { t: 'constellation', id: 'cygne', lines: true }),
                    qcm('cygne-deneb', 'Quelle étoile brillante est au bout de la queue du Cygne ?', 'Deneb', ['Bételgeuse', 'Polaire'], 'Deneb, qui fait aussi partie du Triangle d’été.', { t: 'constellation', id: 'cygne', lines: true }),
                    qcm('lion-saison', 'Quand voit-on le Lion le soir ?', 'Au printemps', ['En hiver'], 'Le Lion arrive dans le ciel du soir au printemps.', { t: 'constellation', id: 'lion', lines: true }),
                    qcm('lion-coeur', 'Comment s’appelle l’étoile brillante du cœur du Lion ?', 'Régulus', ['Rigel', 'Deneb'], 'Régulus veut dire « petit roi ».', { t: 'constellation', id: 'lion', lines: true })
                ]
            },
            { lesson: 7, title: 'Quelle constellation ?', notion: { title: 'Reconnaître les formes', art: { t: 'constellation', id: 'petite-ourse', lines: true }, lines: ['Casserole, W, chasseur, croix, lion, triangle…', 'Regarde la forme et retrouve son nom.'] }, bank: recogniseConstellation(['grande-ourse', 'petite-ourse', 'cassiopee', 'orion', 'cygne', 'lion', 'triangle-ete']) },
            {
                lesson: 7, title: 'Sans modèle', notion: { title: 'Dessine de mémoire', art: { t: 'constellation', id: 'orion', lines: false }, lines: ['Cette fois, pas de pointillés pour t’aider.', 'Souviens-toi de la forme, et relie les étoiles.'] },
                bank: [
                    draw('memoire-cassiopee', 'cassiopee', false), draw('memoire-grande-ourse', 'grande-ourse', false), draw('memoire-orion', 'orion', false),
                    draw('memoire-cygne', 'cygne', false), draw('memoire-triangle', 'triangle-ete', false), draw('memoire-petite-ourse', 'petite-ourse', false),
                    draw('memoire-lion', 'lion', false)
                ]
            },
            {
                lesson: 7, title: 'Le grand quiz du ciel', notion: { title: 'Tu es un petit astronome !', art: { t: 'galaxy' }, lines: ['Un peu de tout : planètes, Lune, étoiles et constellations.', 'Prends ton temps et réfléchis bien.'] },
                bank: [
                    qcm('quiz-soleil', 'Le Soleil est…', 'une étoile', ['une planète', 'une galaxie'], 'Le Soleil est l’étoile la plus proche de nous.', sun),
                    qcm('quiz-terre-rang', 'La Terre est la combientième planète ?', 'La 3e', ['La 2e', 'La 4e'], 'Mercure, Vénus, la Terre.'),
                    qcmArt('quiz-saturne', 'Touche Saturne.', planetChoice('saturne'), [planetChoice('jupiter'), planetChoice('uranus'), planetChoice('neptune')], 'Saturne et ses anneaux brillants.'),
                    qcm('quiz-lune-menteuse', 'La Lune forme un C. Elle…', 'diminue', ['grandit'], 'C comme… décroît : la Lune est menteuse.', { t: 'moon', phase: 'dernier-quartier' }),
                    qcm('quiz-polaire', 'L’étoile Polaire indique…', 'le nord', ['le sud'], 'L’étoile Polaire montre le nord.', { t: 'north' }),
                    qcm('quiz-chaude', 'Quelle étoile est la plus chaude ?', 'Une étoile bleue', ['Une étoile rouge'], 'Les bleues sont les plus chaudes.'),
                    qcm('quiz-ceinture', 'Trois étoiles alignées forment la ceinture…', 'd’Orion', ['du Cygne', 'du Lion'], 'La ceinture d’Orion.', { t: 'constellation', id: 'orion', lines: false }),
                    qcm('quiz-jour', 'Il fait nuit parce que…', 'la Terre tourne', ['le Soleil s’éteint'], 'Notre côté de la Terre tourne le dos au Soleil.', { t: 'daynight', sun: 'left' }),
                    qcm('quiz-annee', 'Un tour de la Terre autour du Soleil dure…', 'un an', ['un jour', 'un mois'], 'Un an, 365 jours.', { t: 'year' }),
                    qcm('quiz-filante', 'Une étoile filante est…', 'une poussière qui brûle dans l’air', ['une étoile qui tombe'], 'Les étoiles ne tombent pas : ce sont des poussières venues de l’espace.', { t: 'meteor' })
                ]
            }
        ]
    }
];

export const levels: Level[] = lessons.flatMap(l => l.levels);
export const levelInfo = (level: number): Level => {
    const info = levels[level - 1];
    if (!info) throw new RangeError(`No level ${level}`);
    return info;
};
/** First level number of each lesson. */
export const lessonStart = (lesson: number): number => levels.findIndex(l => l.lesson === lesson) + 1;
