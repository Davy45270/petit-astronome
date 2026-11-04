import { lessons, levels, levelInfo } from '../engine/levels';
import { generateSession, isRight, figureLines } from '../engine/session';
import { questionOutcome, sessionValidates, recordSession, localDay, RAPID_MS, MAX_REVIEWS, STEP_GUESS, type Outcome, type Submission } from '../engine/mastery';
import { answer, stars, recordBest, unlocked, best, type Attempt } from '../engine/progress';
import { constellation, lineKey, type Point } from '../engine/sky';
import type { Choice, DrawQuestion, Question } from '../engine/questions';
import { readSave, writeSave, browserStorage } from '../shell/storage';
import { artSvg, sceneSvg, drawBoardSvg, constellationLayout, skyLines } from './art';
import { mascotSvg, type Mood } from './mascot';
import { parentsHtml, gateHtml, makeGate, type Gate } from './parents';
import { otherGamesHtml } from './other-games';
import { canSpeak, speak, onVoices } from './speech';

type Screen = 'home' | 'notion' | 'exercise' | 'result' | 'parents' | 'gate' | 'games';

const root = document.querySelector<HTMLElement>('#app')!;
const storage = browserStorage();
const save = readSave(storage);
const persist = (): void => writeSave(storage, save);
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const motion = (): 'full' | 'reduce' => motionQuery.matches ? 'reduce' : 'full';

let screen: Screen = 'home';
let level = 1;
let serial = 0;
let session: Question[] = [];
let attempt: Attempt = { score: 0, index: 0, missed: false };
let submissions: Submission[] = [];
let outcomes: Outcome[] = [];
let validated = true;
let solved = false;
let tried = new Set<string>();
let placed: string[] = [];
let drawn = new Set<string>();
let selected: string | null = null;
let mistakes = 0;
let mood: Mood = 'calme';
let message = '';
let gate: Gate | null = null;
let confirmErase = false;

const current = (): Question | undefined => session[attempt.index];
const levelKey = (): string => String(level);
const reviews = (): string[] => save.reviews[levelKey()] ?? [];
function setReviews(keys: string[]): void {
    const next = [...new Set(keys)].slice(-MAX_REVIEWS);
    save.reviews = Object.fromEntries(Object.entries({ ...save.reviews, [levelKey()]: next }).filter(([, list]) => list.length));
    persist();
}

const esc = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const icon = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="currentColor"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2h1v10H6V10zm2 0h6V8a3 3 0 0 0-6 0z" fill="currentColor"/></svg>'
};

function starsHtml(count: number): string {
    return `<span class="stars" aria-label="${count} étoile${count > 1 ? 's' : ''}">${[0, 1, 2].map(i => `<i class="${i < count ? 'on' : ''}"></i>`).join('')}</span>`;
}

function guideHtml(): string {
    return `<aside class="guide" data-mood="${mood}">${mascotSvg(mood, motion())}<p id="message" role="status" aria-live="polite">${esc(message || 'Prends ton temps, regarde bien !')}</p></aside>`;
}

/* ---------- home ---------- */

function homeHtml(): string {
    let number = 0;
    const blocks = lessons.map((lesson, li) => {
        const buttons = lesson.levels.map(info => {
            const n = ++number;
            const open = unlocked(save.records, n);
            return `<button class="level" data-level="${n}" ${open ? '' : 'aria-disabled="true"'} aria-label="Niveau ${n} : ${esc(info.title)}${open ? '' : ', fermé'}">
                <span class="num">${open ? n : icon.lock}</span><span class="name">${esc(info.title)}</span>${starsHtml(stars(best(save.records, n)))}</button>`;
        }).join('');
        return `<section class="lesson" style="--hue:${lesson.hue}"><h2><span>Leçon ${li + 1}</span>${esc(lesson.title)}</h2><div class="levels">${buttons}</div></section>`;
    }).join('');
    const earned = levels.reduce((sum, _, i) => sum + stars(best(save.records, i + 1)), 0);
    return `<header class="hero">${mascotSvg('joie', motion())}<div><h1>Petit Astronome</h1><p>Planètes, Lune, étoiles et constellations</p><p class="total">${starsHtml(Math.min(3, earned))}<span>${earned} / ${levels.length * 3} étoiles</span></p></div></header>
        ${blocks}
        <footer class="home-foot"><label class="toggle"><input id="voice" type="checkbox" ${save.voice ? 'checked' : ''}> Lire les questions à voix haute</label><span class="foot-links"><button id="other-games" class="ghost">Mes autres jeux</button><button id="parents" class="ghost">Espace parents</button></span></footer>`;
}

/* ---------- notion card ---------- */

function notionHtml(): string {
    const info = levelInfo(level);
    return `<header class="bar"><button id="home" class="icon" aria-label="Accueil">${icon.home}</button><div class="where"><span>Leçon ${info.lesson} · Niveau ${level}</span><b>${esc(info.title)}</b></div></header>
        <section class="panel notion"><h1>${esc(info.notion.title)}</h1><div class="notion-art">${artSvg(info.notion.art)}</div>
        ${info.notion.lines.map(l => `<p>${esc(l)}</p>`).join('')}
        <div class="notion-actions">${canSpeak() ? `<button id="listen" class="icon" aria-label="Écouter">${icon.sound}</button>` : ''}<button id="start">C’est parti !</button></div></section>`;
}

/* ---------- exercise ---------- */

function choiceButton(choice: Choice): string {
    const state = tried.has(choice.id) ? 'wrong' : solved && choice.id === (current() as { answer?: string }).answer ? 'correct' : '';
    return `<button class="choice ${choice.art ? 'with-art' : 'text'} ${state}" data-answer="${esc(choice.id)}" ${tried.has(choice.id) || solved ? 'aria-disabled="true"' : ''}>${choice.art ? artSvg(choice.art, choice.label) : ''}<span>${esc(choice.label)}</span></button>`;
}

function stageHtml(q: Question): string {
    switch (q.type) {
        case 'choice': return `${q.art ? `<div class="stage">${artSvg(q.art)}</div>` : ''}<div class="answers n${q.choices.length} ${q.choices.some(c => c.art) ? 'arts' : ''}">${q.choices.map(choiceButton).join('')}</div>`;
        case 'spot': return `<div class="stage scene" id="scene">${sceneSvg(q.scene)}</div>`;
        case 'order': {
            const slots = q.answer.map((_, i) => {
                const id = placed[i];
                const item = id ? q.items.find(c => c.id === id)! : undefined;
                return `<li class="slot ${item ? 'filled' : ''}" data-slot="${i}">${item ? `${item.art ? artSvg(item.art, item.label) : ''}<span>${esc(item.label)}</span>` : `<b>${i + 1}</b>`}</li>`;
            }).join('');
            const hint = mistakes >= STEP_GUESS && !solved ? q.answer[placed.length] : undefined;
            const pool = q.items.filter(c => !placed.includes(c.id)).map(c => `<button class="item ${c.id === hint ? 'hint' : ''}" data-item="${esc(c.id)}">${c.art ? artSvg(c.art, c.label) : ''}<span>${esc(c.label)}</span></button>`).join('');
            return `${q.art ? `<div class="stage small">${artSvg(q.art)}</div>` : ''}<ol class="track n${q.answer.length}" aria-label="Ton rangement">${slots}</ol><div class="pool">${pool}</div>`;
        }
        case 'draw': {
            const total = figureLines(q).size;
            return `<div class="stage draw" id="draw-stage">${drawBoardSvg(q.constellation, q.guide || mistakes >= STEP_GUESS, (a, b) => drawn.has(lineKey(a, b)))}</div><p class="count" id="count">Traits : <b>${drawn.size}</b> / ${total}</p>`;
        }
    }
}

function exerciseHtml(): string {
    const q = current()!;
    const info = levelInfo(level);
    const dots = session.map((_, i) => `<i class="${i < attempt.index ? 'done' : i === attempt.index ? 'now' : ''}"></i>`).join('');
    return `<header class="bar"><button id="home" class="icon" aria-label="Accueil">${icon.home}</button><div class="where"><span>Leçon ${info.lesson} · Niveau ${level}</span><b>${esc(info.title)}</b></div><div class="dots" aria-label="Question ${attempt.index + 1} sur ${session.length}">${dots}</div></header>
        <section class="ask panel"><p id="prompt">${q.review ? '<span class="again">À revoir</span> ' : ''}${esc(q.prompt)}</p>${canSpeak() ? `<button id="listen" class="icon" aria-label="Écouter la question">${icon.sound}</button>` : ''}</section>
        <div id="play" data-type="${q.type}">${stageHtml(q)}</div>
        ${guideHtml()}
        <div id="actions">${solved ? '<button id="continue">Continuer</button>' : ''}</div>`;
}

/* ---------- result ---------- */

function resultHtml(): string {
    const s = validated ? stars(attempt.score) : 0;
    const next = level < levels.length && unlocked(save.records, level + 1);
    const text = !validated ? 'Beaucoup de réponses au hasard : prends le temps de regarder, et réessaie !'
        : s === 3 ? 'Parfait ! Tu es un vrai petit astronome.' : s >= 2 ? 'Bravo ! Le niveau suivant est ouvert.' : s === 1 ? 'Bien joué ! Encore un essai pour deux étoiles ?' : 'On réessaie ? Tu vas y arriver.';
    return `<section class="panel result"><h1>${validated ? 'Série terminée !' : 'Série à refaire'}</h1>${mascotSvg(s >= 2 ? 'joie' : 'calme', motion())}
        <p class="score">${attempt.score}/${session.length}</p>${starsHtml(s)}<p class="result-text">${text}</p>
        <div class="result-actions"><button id="again">Rejouer</button>${next ? '<button id="next">Niveau suivant</button>' : ''}<button id="home" class="ghost">Accueil</button></div></section>`;
}

/* ---------- flow ---------- */

function render(): void {
    document.body.dataset.screen = screen;
    if (screen !== 'home' && screen !== 'parents' && screen !== 'gate' && screen !== 'games') document.body.style.setProperty('--hue', String(lessons[levelInfo(level).lesson - 1]!.hue));
    root.innerHTML = screen === 'home' ? homeHtml() : screen === 'notion' ? notionHtml() : screen === 'exercise' ? exerciseHtml()
        : screen === 'result' ? resultHtml() : screen === 'gate' ? gateHtml(gate!) : screen === 'games' ? otherGamesHtml() : parentsHtml(save, confirmErase);
    wire();
}

function openLevel(n: number): void {
    if (!unlocked(save.records, n)) {
        return;
    }
    level = n;
    screen = 'notion';
    render();
    scrollTo(0, 0);
    if (save.voice) speakNotion();
}

function startSession(): void {
    serial++;
    session = generateSession(level, (Date.now() & 0xffff) * 31 + serial * 7919 + level, reviews());
    attempt = { score: 0, index: 0, missed: false };
    outcomes = [];
    validated = true;
    resetQuestion();
    screen = 'exercise';
    render();
    scrollTo(0, 0);
    if (save.voice) speak(current()!.prompt);
}

function resetQuestion(): void {
    submissions = [];
    solved = false;
    tried = new Set();
    placed = [];
    drawn = new Set();
    selected = null;
    mistakes = 0;
    mood = 'calme';
    message = '';
}

function setGuide(next: Mood, text: string): void {
    mood = next;
    message = text;
    const guide = root.querySelector('.guide');
    if (guide) guide.outerHTML = guideHtml();
}

/** One tap or one stroke has been judged. `finished` closes the question. */
function judge(correct: boolean, finished: boolean): void {
    const q = current()!;
    const now = performance.now();
    const hasty = submissions.length > 0 && !submissions.at(-1)!.correct && now - submissions.at(-1)!.at < RAPID_MS;
    if (!correct && !submissions.some(s => !s.correct) && !reviews().includes(q.key)) setReviews([...reviews(), q.key]);
    submissions.push({ at: now, correct });
    attempt = answer(attempt, correct, finished);
    if (!correct) {
        mistakes++;
        setGuide('oups', hasty ? 'Doucement ! Regarde bien avant de toucher.' : mistakes >= STEP_GUESS && (q.type === 'order' || q.type === 'draw') ? 'Je t’aide : regarde ce qui brille.' : 'Pas tout à fait… Essaie encore !');
        return;
    }
    if (!finished) return;
    const outcome = questionOutcome(submissions, q);
    outcomes.push(outcome);
    if (outcome === 'sure' && reviews().includes(q.key)) setReviews(reviews().filter(k => k !== q.key));
    solved = true;
    mood = 'joie';
    message = `${outcome === 'sure' ? 'Bravo !' : 'Trouvé !'} ${q.explain}`;
    if (attempt.index === session.length) {
        validated = sessionValidates(outcomes);
        if (validated) save.records = recordBest(save.records, level, attempt.score);
        save.mastery[levelKey()] = recordSession(save.mastery[levelKey()], outcomes, localDay(new Date()));
        persist();
    }
    // The question stays on screen with its explanation; the child decides when to go on.
    attempt = { ...attempt, index: attempt.index - 1 };
    render();
    if (save.voice) speak(q.explain);
    root.querySelector<HTMLElement>('#continue')?.focus({ preventScroll: true });
}

function goOn(): void {
    attempt = { ...attempt, index: attempt.index + 1 };
    if (attempt.index >= session.length) {
        screen = 'result';
        render();
        scrollTo(0, 0);
        return;
    }
    resetQuestion();
    render();
    scrollTo(0, 0);
    if (save.voice) speak(current()!.prompt);
}

function speakNotion(): void {
    const info = levelInfo(level);
    speak(`${info.notion.title}. ${info.notion.lines.join(' ')}`);
}

/**
 * Buttons act on the standard click. Repli: if the browser delivered a finger's pointerdown and pointerup
 * on the button but no click within 350 ms (seen intermittently with Chromium after drawing Orion), the
 * action runs once anyway. A click that arrives first cancels the repli. A click that arrives AFTER the
 * repli fired (a slow phone) is the same tap: it is ignored, so the action never runs twice.
 */
let fallbackPresses = 0;
function onPress(el: Element | null, action: () => void): void {
    if (!el) return;
    let down: number | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let fallbackAt = -Infinity;
    el.addEventListener('pointerdown', event => { const e = event as PointerEvent; down = e.pointerType === 'touch' ? e.pointerId : null; });
    el.addEventListener('pointercancel', () => { down = null; });
    el.addEventListener('pointerup', event => {
        const e = event as PointerEvent;
        if (down === null || down !== e.pointerId) return;
        down = null;
        clearTimeout(timer);
        timer = setTimeout(() => { if (el.isConnected) { fallbackPresses++; fallbackAt = performance.now(); action(); } }, 350);
    });
    el.addEventListener('click', () => {
        clearTimeout(timer);
        // The late click of a tap already handled by the repli; the button works again after that.
        if (performance.now() - fallbackAt < 3000) { fallbackAt = -Infinity; return; }
        action();
    });
}

/* ---------- interactions ---------- */

function wire(): void {
    root.querySelectorAll<HTMLElement>('#home').forEach(b => onPress(b, () => { screen = 'home'; render(); scrollTo(0, 0); }));
    root.querySelector('#back')?.addEventListener('click', () => { screen = 'home'; confirmErase = false; render(); });
    root.querySelector('#listen')?.addEventListener('click', () => { if (screen === 'notion') speakNotion(); else speak(current()!.prompt); });
    if (screen === 'home') {
        root.querySelectorAll<HTMLElement>('[data-level]').forEach(b => onPress(b, () => {
            const n = Number(b.dataset.level);
            if (unlocked(save.records, n)) openLevel(n);
            else {
                b.classList.remove('shake');
                b.getBoundingClientRect();
                b.classList.add('shake');
            }
        }));
        root.querySelector<HTMLInputElement>('#voice')?.addEventListener('change', event => { save.voice = (event.target as HTMLInputElement).checked; persist(); });
        onPress(root.querySelector('#other-games'), () => { screen = 'games'; render(); scrollTo(0, 0); root.querySelector<HTMLElement>('#other-games-title')?.focus(); });
        root.querySelector('#parents')?.addEventListener('click', () => { gate = makeGate(Math.random); screen = 'gate'; render(); root.querySelector<HTMLInputElement>('#gate-answer')?.focus(); });
    }
    if (screen === 'notion') onPress(root.querySelector('#start'), startSession);
    if (screen === 'result') {
        onPress(root.querySelector('#again'), () => openLevel(level));
        onPress(root.querySelector('#next'), () => openLevel(level + 1));
    }
    if (screen === 'gate') root.querySelector<HTMLFormElement>('#gate')?.addEventListener('submit', event => {
        event.preventDefault();
        const value = Number(root.querySelector<HTMLInputElement>('#gate-answer')!.value);
        if (gate && value === gate.a * gate.b) { screen = 'parents'; render(); root.querySelector<HTMLElement>('h1')?.focus(); }
        else root.querySelector('#gate-message')!.textContent = 'Ce n’est pas la bonne réponse.';
    });
    if (screen === 'parents') root.querySelector('#erase')?.addEventListener('click', () => {
        if (!confirmErase) { confirmErase = true; render(); return; }
        save.mastery = {};
        save.reviews = {};
        save.records = {};
        persist();
        confirmErase = false;
        render();
    });
    if (screen === 'exercise') wireExercise();
}

function wireExercise(): void {
    onPress(root.querySelector('#continue'), goOn);
    const q = current();
    if (q?.type === 'spot' && solved) mark(root.querySelector('#scene')!, q.answer, 'correct');
    if (!q || solved) return;
    if (q.type === 'choice') root.querySelectorAll<HTMLElement>('[data-answer]').forEach(b => onPress(b, () => {
        const id = b.dataset.answer!;
        if (solved || tried.has(id)) return;
        if (isRight(q, id)) judge(true, true);
        else {
            tried.add(id);
            b.classList.add('wrong', 'shake');
            b.setAttribute('aria-disabled', 'true');
            judge(false, false);
        }
    }));
    if (q.type === 'spot') wireSpot();
    if (q.type === 'order') root.querySelectorAll<HTMLElement>('[data-item]').forEach(b => onPress(b, () => {
        const id = b.dataset.item!;
        if (solved || placed.includes(id)) return;
        if (isRight(q, id, placed.length)) {
            placed.push(id);
            const done = placed.length === q.answer.length;
            if (done) judge(true, true);
            else {
                judge(true, false);
                const play = root.querySelector('#play')!;
                play.innerHTML = stageHtml(q);
                wireExercise();
            }
        } else {
            b.classList.remove('shake');
            b.getBoundingClientRect();
            b.classList.add('shake');
            judge(false, false);
            if (mistakes === STEP_GUESS) {
                root.querySelector('#play')!.innerHTML = stageHtml(q);
                wireExercise();
            }
        }
    }));
    if (q.type === 'draw') wireDraw(q);
}

/** The target whose outline is nearest to the finger (inside counts as negative distance). */
function nearestSpot(container: Element, x: number, y: number, reach = 34): string | null {
    let bestId: string | null = null, bestScore = Infinity;
    container.querySelectorAll<SVGGraphicsElement>('[data-spot]').forEach(el => {
        const r = el.getBoundingClientRect();
        const score = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) - Math.max(r.width, r.height) / 2;
        if (score < bestScore) { bestScore = score; bestId = el.dataset.spot ?? null; }
    });
    return bestScore <= reach ? bestId : null;
}

function wireSpot(): void {
    const q = current()!;
    const scene = root.querySelector<HTMLElement>('#scene')!;
    let down: { id: number; x: number; y: number } | null = null;
    scene.addEventListener('pointerdown', event => {
        if (down || solved) return;
        down = { id: event.pointerId, x: event.clientX, y: event.clientY };
    });
    const finish = (event: PointerEvent): void => {
        if (!down || event.pointerId !== down.id) return;
        const start = down;
        down = null;
        if (event.type !== 'pointerup' || solved) return;
        // A tap, not a scroll: the finger stayed close to where it landed.
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 24) return;
        const id = nearestSpot(scene, event.clientX, event.clientY);
        if (!id || tried.has(id)) return;
        mark(scene, id, isRight(q, id) ? 'correct' : 'wrong');
        if (isRight(q, id)) judge(true, true);
        else { tried.add(id); judge(false, false); }
    };
    for (const name of ['pointerup', 'pointercancel'] as const) scene.addEventListener(name, finish);
}

function mark(scene: Element, id: string, state: 'correct' | 'wrong'): void {
    const el = scene.querySelector(`[data-spot="${CSS.escape(id)}"]`);
    if (!el) return;
    const r = (el as SVGGraphicsElement).getBoundingClientRect(), box = scene.getBoundingClientRect();
    scene.insertAdjacentHTML('beforeend', `<span class="ping ${state}" style="left:${r.left - box.left + r.width / 2}px;top:${r.top - box.top + r.height / 2}px"></span>`);
}

function wireDraw(q: DrawQuestion): void {
    const svg = root.querySelector<SVGSVGElement>('#board')!;
    const sky = constellationLayout(q.constellation, 340);
    const lines = figureLines(q);
    const drawnGroup = svg.querySelector('#drawn')!;
    const rubber = svg.querySelector<SVGLineElement>('#rubber')!;
    const toSvg = (x: number, y: number): Point => {
        const m = svg.getScreenCTM();
        if (!m) return { x, y };
        const p = new DOMPoint(x, y).matrixTransform(m.inverse());
        return { x: p.x, y: p.y };
    };
    // Nearest star within reach (in board units, the board is 340 wide).
    const nearest = (x: number, y: number, reach: number): string | null => {
        const p = toSvg(x, y);
        let id: string | null = null, d = reach;
        for (const [sid, sp] of sky.points) {
            const dist = Math.hypot(sp.x - p.x, sp.y - p.y);
            if (dist < d) { d = dist; id = sid; }
        }
        return id;
    };
    const paint = (): void => {
        drawnGroup.innerHTML = skyLines(sky, constellation(q.constellation).lines.filter(([a, b]) => drawn.has(lineKey(a, b))), 'drawn');
        svg.querySelectorAll('.sky-star').forEach(el => el.classList.toggle('picked', (el as SVGElement).dataset.star === selected));
        const count = root.querySelector('#count b');
        if (count) count.textContent = String(drawn.size);
    };
    const link = (a: string, b: string, strict: boolean): boolean => {
        const key = lineKey(a, b);
        if (drawn.has(key)) return true;
        if (lines.has(key)) {
            drawn.add(key);
            paint();
            // The last line closes the question only once the finger is up: re-rendering the board under a
            // captured finger made Chromium swallow the next tap (found by the noisy-finger test).
            if (drawn.size === lines.size) finishing = true;
            else judge(true, false);
            return true;
        }
        if (strict) {
            judge(false, false);
            if (mistakes === STEP_GUESS) svg.querySelector('#guide')!.innerHTML = skyLines(sky, constellation(q.constellation).lines, 'guide-line');
        }
        return false;
    };
    let active: number | null = null;
    let finishing = false;
    let from: string | null = null;
    let moved = false;
    let chained = false;
    let origin = { x: 0, y: 0 };
    svg.addEventListener('pointerdown', event => {
        if (active !== null || solved || finishing) return;
        const star = nearest(event.clientX, event.clientY, 40);
        if (!star) return;
        active = event.pointerId;
        from = star;
        moved = false;
        chained = false;
        origin = { x: event.clientX, y: event.clientY };
        // touch-action: none on the board already stops scrolling; no preventDefault here, it would
        // mark the touch as consumed and disturb Chromium's tap synthesis for the next touches.
        try { svg.setPointerCapture(event.pointerId); } catch { /* synthetic pointers */ }
    });
    svg.addEventListener('pointermove', event => {
        if (event.pointerId !== active || !from || solved || finishing) return;
        if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 12) moved = true;
        if (!moved) return;
        selected = null;
        const a = sky.points.get(from)!, p = toSvg(event.clientX, event.clientY);
        rubber.setAttribute('x1', String(a.x)); rubber.setAttribute('y1', String(a.y));
        rubber.setAttribute('x2', String(p.x)); rubber.setAttribute('y2', String(p.y));
        rubber.setAttribute('visibility', 'visible');
        // Sliding across the right neighbour links it and carries on from there; other stars are ignored.
        const star = nearest(event.clientX, event.clientY, 22);
        if (star && star !== from && lines.has(lineKey(from, star)) && link(from, star, false)) {
            from = star;
            chained = true;
        }
    });
    const settle = (event: PointerEvent): void => {
        rubber.setAttribute('visibility', 'hidden');
        const start = from;
        from = null;
        if (solved || finishing || !start || event.type !== 'pointerup') return;
        if (!moved) {
            // Tap mode: first tap picks a star, the second one links.
            if (selected && selected !== start) { const a = selected; selected = null; link(a, start, true); }
            else selected = selected === start ? null : start;
            return;
        }
        // A stroke that already linked stars is never a mistake; a stroke that linked nothing is judged where it ends.
        const star = nearest(event.clientX, event.clientY, 26);
        if (star && star !== start && !chained) link(start, star, true);
    };
    const end = (event: PointerEvent): void => {
        if (event.pointerId !== active) return;
        active = null;
        if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
        settle(event);
        if (finishing && !solved) setTimeout(() => judge(true, true), 0);
        else paint();
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) svg.addEventListener(name, end as EventListener);
    paint();
}

/* ---------- test hook (read-only view of the game) ---------- */

declare global { interface Window { __astro?: unknown } }
Object.defineProperty(window, '__astro', {
    value: Object.freeze({
        state: () => ({ screen, level, index: attempt.index, score: attempt.score, solved, outcomes: [...outcomes], validated, question: current() ?? null, placed: [...placed], drawn: [...drawn], mistakes, fallbackPresses }),
        /** Client coordinates of a star on the drawing board. */
        star: (id: string): Point | null => {
            const svg = root.querySelector<SVGSVGElement>('#board');
            const q = current();
            if (!svg || q?.type !== 'draw') return null;
            const p = constellationLayout(q.constellation, 340).points.get(id);
            const m = svg.getScreenCTM();
            if (!p || !m) return null;
            const c = new DOMPoint(p.x, p.y).matrixTransform(m);
            return { x: c.x, y: c.y };
        },
        /** Client centre of a tappable target in a scene. */
        spot: (id: string): Point | null => {
            const el = root.querySelector(`[data-spot="${CSS.escape(id)}"]`);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }
    })
});

onVoices(() => { if (screen === 'notion' || screen === 'exercise') { const b = root.querySelector('#listen'); if (!b && canSpeak()) render(); } });
motionQuery.addEventListener('change', () => render());
render();
