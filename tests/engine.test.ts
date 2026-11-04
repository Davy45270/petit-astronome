import { describe, expect, it } from 'vitest';
import { generateSession, isRight, figureLines } from '../src/engine/session';
import { questionOutcome, sessionValidates, recordSession, masteryState, guessThreshold, validMastery, RAPID_MS, WINDOW } from '../src/engine/mastery';
import { stars, unlocked, answer, recordBest } from '../src/engine/progress';
import { levels, levelInfo, lessonStart } from '../src/engine/levels';
import { readSave, writeSave, SAVE_KEY, fresh } from '../src/shell/storage';
import { lineKey } from '../src/engine/sky';
import type { Question } from '../src/engine/questions';

const memory = (value?: string) => { const m = new Map<string, string>(value ? [[SAVE_KEY, value]] : []); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m }; };

describe('session', () => {
    it('is deterministic for a seed and holds six distinct questions', () => {
        const a = generateSession(4, 99), b = generateSession(4, 99);
        expect(a.map(q => q.key)).toEqual(b.map(q => q.key));
        expect(a).toHaveLength(6);
        expect(new Set(a.map(q => q.key)).size).toBe(6);
    });
    it('brings missed questions back first, at most three, ignoring unknown keys', () => {
        const bank = levelInfo(2).bank.map(e => e.key);
        const s = generateSession(2, 1, ['inconnu', bank[5]!, bank[7]!, bank[1]!, bank[0]!]);
        expect(s.slice(0, 3).map(q => q.key)).toEqual([bank[5], bank[7], bank[1]]);
        expect(s.slice(0, 3).every(q => q.review)).toBe(true);
        expect(s.slice(3).some(q => q.review)).toBe(false);
    });
    it('judges each kind of answer', () => {
        const order: Question = { type: 'order', key: 'k', prompt: 'p', explain: 'e', items: [], answer: ['a', 'b'] };
        expect(isRight(order, 'a', 0)).toBe(true);
        expect(isRight(order, 'b', 0)).toBe(false);
        expect(isRight(order, 'b', 1)).toBe(true);
        const draw: Question = { type: 'draw', key: 'k', prompt: 'p', explain: 'e', constellation: 'cassiopee', guide: true };
        expect(figureLines(draw).size).toBe(4);
        expect(isRight(draw, lineKey('schedar', 'caph'))).toBe(true);
        expect(isRight(draw, lineKey('caph', 'segin'))).toBe(false);
    });
});

describe('mastery', () => {
    const choice4: Question = { type: 'choice', key: 'k', prompt: 'p', explain: 'e', answer: 'a', choices: ['a', 'b', 'c', 'd'].map(id => ({ id, label: id })) };
    const tf: Question = { ...choice4, choices: [{ id: 'a', label: 'Vrai' }, { id: 'b', label: 'Faux' }] };
    const draw: Question = { type: 'draw', key: 'k', prompt: 'p', explain: 'e', constellation: 'orion', guide: true };
    it('tells sure, retry and guess apart', () => {
        expect(questionOutcome([{ at: 0, correct: true }], choice4)).toBe('sure');
        expect(questionOutcome([{ at: 0, correct: false }, { at: 3000, correct: true }], choice4)).toBe('retry');
        expect(questionOutcome([{ at: 0, correct: false }, { at: RAPID_MS - 1, correct: true }], choice4)).toBe('guess');
        expect(questionOutcome([{ at: 0, correct: false }, { at: 2000, correct: false }, { at: 4000, correct: false }, { at: 6000, correct: true }], choice4)).toBe('guess');
        expect(questionOutcome([{ at: 0, correct: false }, { at: 5000, correct: true }], tf)).toBe('retry');
        expect(guessThreshold(tf)).toBe(Infinity);
        expect(questionOutcome([{ at: 0, correct: true }, { at: 3000, correct: false }, { at: 6000, correct: false }, { at: 9000, correct: true }], draw)).toBe('retry');
        expect(questionOutcome([{ at: 0, correct: false }, { at: 3000, correct: false }, { at: 6000, correct: false }, { at: 9000, correct: true }], draw)).toBe('guess');
        expect(() => questionOutcome([], choice4)).toThrow();
    });
    it('two guesses spoil the stars of a session', () => {
        expect(sessionValidates(['sure', 'guess', 'retry'])).toBe(true);
        expect(sessionValidates(['guess', 'sure', 'guess'])).toBe(false);
    });
    it('needs two strong sessions, no guess and nothing to review', () => {
        let m = recordSession(undefined, Array<'sure'>(6).fill('sure'), '2026-11-04');
        expect(masteryState(m)).toBe('learning');
        m = recordSession(m, ['sure', 'sure', 'sure', 'retry', 'sure', 'sure'], '2026-11-05');
        expect(m.recent).toHaveLength(WINDOW);
        expect(masteryState(m)).toBe('mastered');
        expect(masteryState(m, 1)).toBe('learning');
        expect(masteryState(recordSession(m, ['guess'], '2026-11-06'))).toBe('learning');
        expect(masteryState(undefined)).toBe('new');
        expect(validMastery(m)).toBe(true);
        expect(validMastery({ ...m, recent: 'sx' })).toBe(false);
    });
});

describe('progress', () => {
    it('gives stars for 4, 5 and 6 right on the first try', () => {
        expect([3, 4, 5, 6].map(stars)).toEqual([0, 1, 2, 3]);
    });
    it('counts a question only when solved without mistake', () => {
        let a = { score: 0, index: 0, missed: false };
        a = answer(a, false);
        a = answer(a, true, true);
        expect(a).toEqual({ score: 0, index: 1, missed: false });
        a = answer(a, true, false);
        a = answer(a, true, true);
        expect(a).toEqual({ score: 1, index: 2, missed: false });
    });
    it('opens the next level at two stars, and the next lesson from its first level', () => {
        expect(unlocked({}, 1)).toBe(true);
        expect(unlocked({}, 2)).toBe(false);
        expect(unlocked(recordBest({}, 1, 5), 2)).toBe(true);
        expect(unlocked(recordBest({}, 1, 4), 2)).toBe(false);
        const l2 = lessonStart(2), l3 = lessonStart(3);
        expect(unlocked(recordBest({}, 1, 5), l2)).toBe(true);
        expect(unlocked(recordBest({}, 1, 5), l3)).toBe(false);
        expect(unlocked(recordBest({}, l2, 6), l3)).toBe(true);
        expect(unlocked({}, levels.length + 1)).toBe(false);
    });
});

describe('storage', () => {
    it('starts fresh on missing, broken or foreign data', () => {
        expect(readSave(undefined)).toEqual(fresh());
        expect(readSave(memory('{oops'))).toEqual(fresh());
        expect(readSave(memory('{"version":2,"records":{}}'))).toEqual(fresh());
    });
    it('keeps valid entries only and round-trips', () => {
        const store = memory(JSON.stringify({ version: 1, voice: true, records: { 1: 6, 2: 9, 99: 3, x: 1 }, mastery: { 1: { recent: 'ssr', sessions: 1, last: '2026-11-04' }, 2: { recent: 'zz', sessions: 1, last: 'x' } }, reviews: { 1: ['soleil-quoi', 'soleil-quoi', 'Bad Key', 'a', 'b', 'c'] } }));
        const save = readSave(store);
        expect(save.records).toEqual({ 1: 6 });
        expect(Object.keys(save.mastery)).toEqual(['1']);
        expect(save.reviews).toEqual({ 1: ['soleil-quoi', 'a', 'b'] });
        expect(save.voice).toBe(true);
        writeSave(store, save);
        expect(readSave(store)).toEqual(save);
    });
});
