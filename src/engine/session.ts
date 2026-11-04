import { levelInfo } from './levels';
import { makeRng, shuffle } from './rng';
import { MAX_REVIEWS } from './mastery';
import { SESSION_LENGTH } from './progress';
import { constellation, lineKey } from './sky';
import type { Question } from './questions';

/** Questions missed earlier come back first (at most three), then the rest of the bank in a fresh order. */
export function generateSession(level: number, seed: number, reviews: string[] = [], count = SESSION_LENGTH): Question[] {
    const rng = makeRng(seed);
    const { bank } = levelInfo(level);
    if (!Number.isInteger(count) || count < 1 || count > bank.length) throw new RangeError('Invalid session length');
    const due = [...new Set(reviews)].filter(key => bank.some(e => e.key === key)).slice(0, MAX_REVIEWS);
    const chosen = [...due.map(key => bank.find(e => e.key === key)!), ...shuffle(bank.filter(e => !due.includes(e.key)), rng)].slice(0, count);
    return chosen.map(entry => {
        const question = entry.make(rng);
        return due.includes(entry.key) ? { ...question, review: true } : question;
    });
}

/** Is this tap right? For a sequence, `step` is how many items are already in place. */
export function isRight(question: Question, id: string, step = 0): boolean {
    switch (question.type) {
        case 'choice':
        case 'spot': return id === question.answer;
        case 'order': return question.answer[step] === id;
        case 'draw': return figureLines(question).has(id);
    }
}

/** The segments of a constellation figure, as unordered pairs. */
export function figureLines(question: Question): Set<string> {
    if (question.type !== 'draw') return new Set();
    return new Set(constellation(question.constellation).lines.map(([a, b]) => lineKey(a, b)));
}
