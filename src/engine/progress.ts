import { levels, levelInfo, lessonStart } from './levels';

export type Records = Record<string, number>;
export const SESSION_LENGTH = 6;
/** Six right on the first try: three stars; five: two; four: one. */
export const stars = (score: number): number => score >= 6 ? 3 : score >= 5 ? 2 : score >= 4 ? 1 : 0;
export const recordBest = (records: Records, level: number, score: number): Records => ({ ...records, [String(level)]: Math.max(records[String(level)] ?? 0, score) });
export const best = (records: Records, level: number): number => records[String(level)] ?? 0;

/**
 * A level opens when the previous one earned two stars. The first level of a lesson also opens when the
 * first level of the previous lesson earned two stars, so a curious child can peek at the Moon early.
 */
export function unlocked(records: Records, level: number): boolean {
    if (level === 1) return true;
    if (level < 1 || level > levels.length) return false;
    if (stars(best(records, level - 1)) >= 2) return true;
    const { lesson } = levelInfo(level);
    return lessonStart(lesson) === level && lesson > 1 && stars(best(records, lessonStart(lesson - 1))) >= 2;
}

export interface Attempt { score: number; index: number; missed: boolean }

/** A question counts for the score only when solved without any mistake. */
export function answer(state: Attempt, correct: boolean, finished = correct): Attempt {
    if (!correct) return { ...state, missed: true };
    return finished ? { score: state.score + (state.missed ? 0 : 1), index: state.index + 1, missed: false } : state;
}
