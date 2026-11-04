import { validMastery, MAX_REVIEWS, type Mastery } from '../engine/mastery';
import { levels } from '../engine/levels';
import { SESSION_LENGTH, type Records } from '../engine/progress';

export interface StoragePort {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void
}

export interface Save {
    version: 1;
    records: Records;
    /** Learning follow-up per level; never leaves the device. */
    mastery: Record<string, Mastery>;
    /** Question keys to bring back after a mistake, per level. */
    reviews: Record<string, string[]>;
    /** Read the question aloud automatically. */
    voice: boolean
}

export const SAVE_KEY = 'petit-astronome.v1';
const validLevel = (key: string): boolean => /^[1-9]\d*$/.test(key) && Number(key) <= levels.length;
const validReview = (key: unknown): key is string => typeof key === 'string' && /^[a-z0-9-]{1,40}$/.test(key);

export const fresh = (): Save => ({ version: 1, records: {}, mastery: {}, reviews: {}, voice: false });

export function browserStorage(): StoragePort | undefined {
    try {
        return window.localStorage;
    } catch {
        return undefined;
    }
}

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && !!value && !Array.isArray(value);

export function readSave(storage?: StoragePort): Save {
    try {
        const v: unknown = JSON.parse(storage?.getItem(SAVE_KEY) ?? 'null');
        if (!object(v) || v.version !== 1 || !object(v.records)) return fresh();
        const save = fresh();
        for (const [key, score] of Object.entries(v.records)) if (validLevel(key) && typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= SESSION_LENGTH) save.records[key] = score;
        if (object(v.mastery)) for (const [key, value] of Object.entries(v.mastery)) if (validLevel(key) && validMastery(value)) save.mastery[key] = { recent: value.recent, sessions: value.sessions, last: value.last };
        if (object(v.reviews)) for (const [key, value] of Object.entries(v.reviews)) if (validLevel(key) && Array.isArray(value)) {
            const keys = [...new Set(value.filter(validReview))].slice(0, MAX_REVIEWS);
            if (keys.length) save.reviews[key] = keys;
        }
        save.voice = v.voice === true;
        return save;
    } catch {
        return fresh();
    }
}

export function writeSave(storage: StoragePort | undefined, save: Save): void {
    try {
        storage?.setItem(SAVE_KEY, JSON.stringify(save));
    } catch {
        /* Playing remains possible without storage. */
    }
}
