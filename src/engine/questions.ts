import type { PlanetId } from './planets';
import type { PhaseId } from './moon';
import type { ConstellationId, StarColor } from './sky';

/** A drawing described as data; the interface turns it into SVG. */
export type Art =
    | { t: 'planet'; id: PlanetId }
    | { t: 'sun' }
    | { t: 'moon'; phase: PhaseId }
    | { t: 'earth-moon' }
    | { t: 'system' }
    | { t: 'sizes'; ids: PlanetId[] }
    | { t: 'sun-earth' }
    | { t: 'daynight'; sun: 'left' | 'right' }
    | { t: 'year' }
    | { t: 'star'; color: StarColor }
    | { t: 'constellation'; id: ConstellationId; lines: boolean }
    | { t: 'north' }
    | { t: 'moon-orbit' }
    | { t: 'meteor' }
    | { t: 'galaxy' }
    | { t: 'footprint' };

/** A scene the child taps in: every target has an id. */
export type Scene =
    | { t: 'system' }
    | { t: 'daynight'; sun: 'left' | 'right' }
    | { t: 'north' }
    | { t: 'moon-orbit' }
    | { t: 'sizes'; ids: PlanetId[] }
    | { t: 'stars'; colors: StarColor[] };

export interface Choice {
    id: string;
    label: string;
    art?: Art
}

interface Base {
    /** One fact = one key: a mistake brings this key back in the next session. */
    key: string;
    prompt: string;
    /** The notion behind the answer, shown once the question is solved. */
    explain: string;
    art?: Art;
    review?: boolean
}

export interface ChoiceQuestion extends Base { type: 'choice'; choices: Choice[]; answer: string }
export interface SpotQuestion extends Base { type: 'spot'; scene: Scene; answer: string }
export interface OrderQuestion extends Base { type: 'order'; items: Choice[]; answer: string[] }
export interface DrawQuestion extends Base { type: 'draw'; constellation: ConstellationId; guide: boolean }

export type Question = ChoiceQuestion | SpotQuestion | OrderQuestion | DrawQuestion;

/** Every target of a scene, so the engine knows how many answers a child can try. */
export function spotTargets(scene: Scene): string[] {
    switch (scene.t) {
        case 'system': return ['soleil', 'mercure', 'venus', 'terre', 'mars', 'jupiter', 'saturne', 'uranus', 'neptune'];
        case 'daynight': return ['jour', 'nuit'];
        case 'north': return ['dubhe', 'merak', 'phecda', 'megrez', 'alioth', 'mizar', 'alkaid', 'polaris', 'yildun', 'eps-umi', 'zeta-umi', 'eta-umi', 'pherkad', 'kochab', 'caph', 'schedar', 'navi', 'ruchbah', 'segin'];
        case 'moon-orbit': return ['nouvelle', 'premier-quartier', 'pleine', 'dernier-quartier'];
        case 'sizes': return scene.ids;
        case 'stars': return scene.colors.map((_, i) => `etoile-${i}`);
    }
}

/** How many answers a child could try on this question (used to spot answers given at random). */
export function optionCount(question: Question): number {
    switch (question.type) {
        case 'choice': return question.choices.length;
        case 'spot': return spotTargets(question.scene).length;
        case 'order': return question.items.length;
        case 'draw': return Infinity;
    }
}
