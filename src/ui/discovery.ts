import { constellation, type ConstellationId } from '../engine/sky';
import { planet, type PlanetId } from '../engine/planets';
import type { Art, Scene } from '../engine/questions';
import type { StoragePort } from '../shell/storage';
import { artSvg, constellationLayout, sceneSvg, skyLines } from './art';
import gallery from './planet-gallery.json';

type Pair = [string, string];
type Activity = {
    prompt: string;
    feedback: string;
} & (
    { kind: 'choice'; choices: [Art, Art]; labels: Pair; right: number; model?: Art }
    | { kind: 'spot'; scene: Scene; targets: Pair; right: number }
    | { kind: 'draw'; figure: ConstellationId; lines: Pair[] }
);

const planetArt = (id: PlanetId): Art => ({ t: 'planet', id });
const planetChoice = (prompt: string, feedback: string, a: PlanetId, b: PlanetId, right: number): Activity =>
    ({ kind: 'choice', prompt, feedback, choices: [planetArt(a), planetArt(b)], labels: [planet(a).name, planet(b).name], right });
const light = (sun: 'left' | 'right', day: boolean): Activity => ({
    kind: 'spot', prompt: day ? 'Touche le côté où il fait jour.' : 'Touche le côté où il fait nuit.',
    feedback: day ? 'Le Soleil éclaire ce côté.' : 'Ce côté tourne le dos au Soleil.',
    scene: { t: 'daynight', sun }, targets: ['jour', 'nuit'], right: day ? 0 : 1,
});
const size = (a: PlanetId, b: PlanetId, right: number, small = false): Activity => ({
    kind: 'spot', prompt: small ? 'Touche la plus petite planète.' : 'Touche la plus grosse planète.',
    feedback: small ? 'Tu as trouvé la plus petite !' : 'Tu as trouvé la plus grosse !',
    scene: { t: 'sizes', ids: [a, b] }, targets: [a, b], right,
});
const full: Art = { t: 'moon', phase: 'pleine' };
const crescent: Art = { t: 'moon', phase: 'premier-croissant' };
const moon = (round: boolean, flip: boolean): Activity => ({
    kind: 'choice', prompt: round ? 'Touche la Lune toute ronde.' : 'Touche la Lune en croissant.',
    feedback: round ? 'On voit toute la face éclairée.' : 'On voit une fine partie éclairée.',
    choices: flip ? [crescent, full] : [full, crescent],
    labels: flip ? ['Croissant', 'Pleine lune'] : ['Pleine lune', 'Croissant'],
    right: round === flip ? 1 : 0, model: round ? full : crescent,
});
const draw = (figure: ConstellationId, prompt: string, lines = constellation(figure).lines): Activity =>
    ({ kind: 'draw', prompt, lines, figure, feedback: 'Tu as relié les étoiles !' });
const ringPrompt = 'Montre la planète aux grands anneaux.';
const ringFeedback = 'Bien vu, ce sont les anneaux de Saturne !';
const workshops: { id: string; name: string; intro: string; art: Art; activities: [Activity, Activity, Activity]; photo?: PlanetId }[] = [
    { id: 'anneaux', name: 'Les anneaux de Saturne', intro: 'Saturne a de grands anneaux.', art: planetArt('saturne'), photo: 'saturne', activities: [
        planetChoice(ringPrompt, ringFeedback, 'saturne', 'mars', 0),
        planetChoice(ringPrompt, ringFeedback, 'jupiter', 'saturne', 1),
        planetChoice('Touche la Terre, notre planète.', 'Voici notre planète, la Terre !', 'terre', 'saturne', 0),
    ] },
    { id: 'jour-nuit', name: 'Le jour et la nuit', intro: 'Le Soleil éclaire un côté de la Terre.', art: { t: 'daynight', sun: 'left' }, activities: [light('left', true), light('right', true), light('right', false)] },
    { id: 'tailles', name: 'Petites et grosses planètes', intro: 'Certaines planètes sont bien plus grosses que d’autres.', art: { t: 'sizes', ids: ['terre', 'jupiter'] }, photo: 'jupiter', activities: [size('mars', 'jupiter', 1), size('jupiter', 'terre', 1, true), size('terre', 'mars', 0)] },
    { id: 'lune-formes', name: 'Les formes de la Lune', intro: 'La partie éclairée que tu vois change.', art: crescent, activities: [moon(true, false), moon(false, true), moon(false, false)] },
    { id: 'etoiles-a-relier', name: 'Les étoiles à relier', intro: 'Touche deux étoiles pour tracer un trait.', art: { t: 'constellation', id: 'triangle-ete', lines: true }, activities: [
        draw('triangle-ete', 'Relie les étoiles du triangle.'),
        draw('orion', 'Relie les étoiles de la ceinture.', [['mintaka', 'alnilam'], ['alnilam', 'alnitak']]),
        draw('grande-ourse', 'Relie les étoiles de la casserole.'),
    ] },
];

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const storageKey = 'petit-astronome.discovery.v1';
type Result = 'completed' | 'guided' | 'skipped';
type Screen = 'workshops' | 'intro' | 'activity' | 'summary' | 'gallery' | 'planet';
const media = (path: string): string => `${import.meta.env.BASE_URL}discovery/${path}`;
const clip = (text: string): string => `clips/${text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}.mp3`;
const button = (action: string, label: string, extra = ''): string => `<button data-discovery="${action}" ${extra}>${label}</button>`;

export function openDiscovery(root: HTMLElement, storage: StoragePort | undefined, close: () => void, photos = false): void {
    let saved: Record<string, Result[]> = {};
    try {
        const data: unknown = JSON.parse(storage?.getItem(storageKey) ?? 'null');
        if (object(data) && data.version === 1 && object(data.results)) {
            for (const workshop of workshops) {
                const row: unknown = data.results[workshop.id];
                if (!Array.isArray(row)) continue;
                const prefix: Result[] = [];
                for (const found of (row as unknown[]).slice(0, 3)) {
                    if (found !== 'completed' && found !== 'guided' && found !== 'skipped') break;
                    prefix.push(found);
                }
                saved[workshop.id] = prefix;
            }
        }
    } catch { /* Play without storage. */ }

    let screen: Screen = photos ? 'gallery' : 'workshops';
    let workshop = workshops[0]!;
    let results: Result[] = [];
    let errors = 0;
    let guided = false;
    let model = false;
    let result: Result | undefined;
    let selected: string | undefined;
    let drawn = 0;
    let index = 0;
    let fromIntro = false;
    let notice = '';
    let audio: HTMLAudioElement | undefined;
    let drag: { pointer: number; star: Element } | undefined;
    let dragEnd = -Infinity;
    const activity = (): Activity => workshop.activities[results.length]!;
    function stop(): void {
        audio?.pause();
        audio = undefined;
        const control = root.querySelector('[data-discovery="listen"]');
        if (control) control.textContent = '🔊 Écouter';
    }

    function render(focus?: string): void {
        const home = screen === 'gallery' && fromIntro ? 'intro' : screen === 'planet' ? 'gallery'
            : screen === 'intro' || screen === 'summary' ? 'workshops' : screen === 'activity' ? 'quit' : 'home';
        root.innerHTML = `<div class="discovery"><header class="discovery-bar">${button(home, '← Retour', 'class="ghost"')}</header>${content()}</div>`;
        root.querySelector<HTMLElement>(focus ?? 'h1')?.focus({ preventScroll: true });
    }

    function content(): string {
        if (screen === 'workshops') {
            return `<h1 tabindex="-1">Découvrir avec Lumi</h1><div class="discovery-grid">${workshops.map((item, i) =>
                button('workshop', `<span class="discovery-card-art" aria-hidden="true">${artSvg(item.art)}</span><span>${item.name}</span>${saved[item.id]?.length && saved[item.id]?.length !== 3 ? '<small>Reprendre</small>' : ''}`, `data-index="${i}"`)).join('')}</div>`;
        }
        if (screen === 'gallery') {
            return `<h1 tabindex="-1">Photos des planètes</h1><div class="discovery-grid">${gallery.map((card, i) =>
                button('planet', `<img src="${media(card.photo)}" alt=""><span>${card.nom}</span>`, `data-index="${i}"`)).join('')}</div>`;
        }
        if (screen === 'planet') {
            const card = gallery[index]!;
            return `<h1 tabindex="-1">${card.nom}</h1><img class="discovery-photo" src="${media(card.photo)}" alt="${card.alt}"><small>Tailles non comparables</small><p>${card.description}</p>
                <div class="discovery-actions">${button('previous', '←', `aria-label="Précédente" ${index === 0 ? 'disabled' : ''}`)}${listen()}${button('next', '→', `aria-label="Suivante" ${index === gallery.length - 1 ? 'disabled' : ''}`)}</div>
                <details><summary>Crédits photo</summary><p>${card.credit}. ${card.traitement}</p><a href="${card.source}" target="_blank" rel="noopener noreferrer">Source</a></details><p role="status" class="discovery-audio-status"></p>`;
        }
        if (screen === 'intro') {
            return `<h1 tabindex="-1">${workshop.name}</h1><div class="discovery-model">${artSvg(workshop.art)}</div><p>${workshop.intro}</p>
                <div class="discovery-actions">${listen()}${button('start', results.length ? 'Reprendre' : 'Essayer')}${workshop.photo ? button('photo', 'Voir la photo', 'class="ghost"') : ''}</div><p role="status" class="discovery-audio-status"></p>`;
        }
        if (screen === 'summary') {
            const next = workshops[workshops.indexOf(workshop) + 1];
            const count = results.filter(item => item !== 'skipped').length;
            return `<h1 tabindex="-1">Bravo, tu as exploré le ciel !</h1><div class="discovery-model">${artSvg(workshop.art)}</div>
                <p>${count} ${count === 1 ? 'geste réalisé' : 'gestes réalisés'} sur 3.</p><div class="discovery-actions">${button('replay', 'Rejouer')}${next ? button('workshop', 'Atelier suivant', `data-index="${workshops.indexOf(next)}"`) : ''}</div>`;
        }
        const task = activity();
        return `<p class="discovery-count" aria-label="Activité ${results.length + 1} sur 3">${'●'.repeat(results.length + 1)}${'○'.repeat(2 - results.length)}</p>
            <h1 tabindex="-1">${task.prompt}</h1>${stage(task)}
            <p class="discovery-notice" role="status">${notice}</p>
            <div class="discovery-actions">${listen()}${result ? button('continue', 'Continuer') : `${button('model', 'Aide', 'class="ghost"')}${button('skip', 'Passer', 'class="ghost"')}`}</div><p role="status" class="discovery-audio-status"></p>`;
    }

    function listen(): string {
        return button('listen', '🔊 Écouter');
    }

    function stage(task: Activity): string {
        const showRight = guided || model || !!result;
        if (task.kind === 'choice') {
            return `${task.model ? `<div class="discovery-example" aria-label="Modèle">${artSvg(task.model)}</div>` : ''}
                <div class="discovery-grid">${task.choices.map((art, i) => button('answer', artSvg(art), `data-index="${i}" aria-label="${task.labels[i]}" ${showRight && i === task.right ? 'class="discovery-hint"' : ''}`)).join('')}</div>`;
        }
        if (task.kind === 'spot') {
            const svg = sceneSvg(task.scene).replace('role="img"', 'role="group"').replace(/data-spot="([^"]+)"/g, (_, target: string) => {
                const i = task.targets.indexOf(target);
                return `data-discovery="answer" data-index="${i}" tabindex="0" role="button" aria-label="${target}" ${showRight && i === task.right ? 'data-hint="true"' : ''}`;
            });
            return `<div class="discovery-scene">${svg}</div>`;
        }
        const sky = constellationLayout(task.figure);
        const pair = task.lines[drawn];
        const nodes = [...new Set(task.lines.flat())];
        return `<div class="discovery-sky">
            <svg class="art sky" viewBox="0 0 300 300" aria-hidden="true"><rect width="300" height="300" rx="22" class="night"/>
            ${skyLines(sky, task.lines, 'guide-line')}${skyLines(sky, task.lines.slice(0, drawn), 'drawn')}${skyLines(sky, pair ? [pair] : [], 'figure')}</svg>
            ${nodes.map((id, i) => {
                const point = sky.points.get(id)!;
                return button('star', '✦', `data-star-id="${id}" aria-label="Étoile ${i + 1}" style="left:${point.x / 3}%;top:${point.y / 3}%" class="${selected === id || (showRight && pair?.includes(id)) ? 'discovery-hint' : ''}"`);
            }).join('')}</div>`;
    }

    function play(path: string): void {
        stop();
        const player = new Audio(media(path));
        audio = player;
        const control = root.querySelector('[data-discovery="listen"]');
        if (control) control.textContent = '■ Arrêter';
        player.addEventListener('ended', () => { if (audio === player) stop(); }, { once: true });
        player.play().catch(() => {
            if (audio !== player) return;
            stop();
            const status = root.querySelector('.discovery-audio-status');
            if (status) status.textContent = 'Le son est indisponible. Tu peux réessayer.';
        });
    }

    function resetActivity(): void {
        errors = drawn = 0;
        model = guided = false;
        notice = '';
        selected = result = undefined;
    }

    function wrong(): void {
        errors += 1;
        if (errors >= 2) guided = true;
        notice = guided ? 'Regarde le modèle, puis essaie.' : 'Regarde bien, puis essaie encore.';
        render();
        play(clip(notice));
    }

    function finish(): void {
        result = guided ? 'guided' : 'completed';
        notice = activity().feedback;
        render('[data-discovery="continue"]');
        play(clip(notice));
    }

    function advance(status: Result): void {
        results.push(status);
        if (results.length === 3 || saved[workshop.id]?.length !== 3) {
            saved = { ...saved, [workshop.id]: [...results] };
            try { storage?.setItem(storageKey, JSON.stringify({ version: 1, results: saved })); } catch { /* Play continues. */ }
        }
        resetActivity();
        screen = results.length === 3 ? 'summary' : 'activity';
        render();
        if (screen === 'activity') play(clip(activity().prompt));
    }

    function interact(target: Element): void {
        const action = target.getAttribute('data-discovery');
        if (action === 'star' && result) return;
        if (action !== 'listen') stop();
        const value = Number(target.getAttribute('data-index'));
        switch (action) {
            case 'home':
                root.removeEventListener('click', click);
                root.removeEventListener('keydown', key);
                root.removeEventListener('pointerdown', pointerDown);
                root.removeEventListener('pointerup', pointerUp);
                root.removeEventListener('pointercancel', cancelDrag);
                document.removeEventListener('visibilitychange', stopWhenHidden);
                window.removeEventListener('pagehide', stop);
                close();
                return;
            case 'workshops': case 'gallery': case 'intro': screen = action; break;
            case 'quit': screen = 'workshops'; break;
            case 'workshop':
                workshop = workshops[value]!;
                results = [...(saved[workshop.id] ?? [])];
                resetActivity();
                screen = results.length === 3 ? 'summary' : 'intro';
                break;
            case 'replay': results = []; screen = 'intro'; break;
            case 'start': screen = 'activity'; render(); scrollTo(0, 0); play(clip(activity().prompt)); return;
            case 'photo':
                fromIntro = true;
                index = gallery.findIndex(card => card.id === workshop.photo);
                screen = 'planet';
                break;
            case 'planet': index = value; screen = 'planet'; break;
            case 'previous': index -= 1; break;
            case 'next': index += 1; break;
            case 'listen':
                if (audio && !audio.paused) { stop(); return; }
                play(screen === 'planet' ? gallery[index]!.audio : clip(screen === 'intro' ? workshop.intro : notice || activity().prompt));
                return;
            case 'model': model = !model; render('[data-discovery="model"]'); return;
            case 'skip': advance('skipped'); return;
            case 'continue': if (result) advance(result); return;
            case 'answer': {
                if (result) return;
                const task = activity();
                if (task.kind !== 'draw' && task.right === value) finish();
                else wrong();
                return;
            }
            case 'star': {
                if (result) return;
                const task = activity();
                if (task.kind !== 'draw') return;
                const id = target.getAttribute('data-star-id')!;
                const pair = task.lines[drawn]!;
                if (!pair.includes(id)) { selected = undefined; wrong(); return; }
                if (!selected || selected === id) { selected = id; render(`[data-star-id="${id}"]`); return; }
                selected = undefined;
                errors = 0;
                model = false;
                drawn += 1;
                if (drawn === task.lines.length) finish();
                else { notice = ''; render(`[data-star-id="${id}"]`); }
                return;
            }
            default: return;
        }
        render();
        scrollTo(0, 0);
    }

    function click(event: MouseEvent): void {
        const target = (event.target as Element).closest('[data-discovery]');
        if (!target || !root.contains(target)) return;
        if (target.matches('[data-star-id]') && event.detail > 0 && performance.now() - dragEnd < 400) return;
        interact(target);
    }

    function key(event: KeyboardEvent): void {
        const target = event.target as Element;
        if (target.matches('[data-discovery][role="button"]') && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            interact(target);
        }
    }

    function pointerDown(event: PointerEvent): void {
        const star = (event.target as Element).closest('[data-star-id]');
        if (star && !result && event.isPrimary) drag = { pointer: event.pointerId, star };
    }

    function pointerUp(event: PointerEvent): void {
        if (drag?.pointer !== event.pointerId) return;
        const { star } = drag;
        drag = undefined;
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-star-id]');
        if (target && target !== star && root.contains(target)) {
            dragEnd = performance.now();
            selected = star.getAttribute('data-star-id') ?? undefined;
            const task = activity();
            if (task.kind === 'draw' && task.lines[drawn]?.includes(selected ?? '')) interact(target);
            else { selected = undefined; wrong(); }
        }
    }

    function cancelDrag(): void { drag = undefined; }
    function stopWhenHidden(): void { if (document.hidden) stop(); }

    document.body.dataset.screen = 'discovery';
    root.addEventListener('click', click);
    root.addEventListener('keydown', key);
    root.addEventListener('pointerdown', pointerDown);
    root.addEventListener('pointerup', pointerUp);
    root.addEventListener('pointercancel', cancelDrag);
    document.addEventListener('visibilitychange', stopWhenHidden);
    window.addEventListener('pagehide', stop);
    render();
    scrollTo(0, 0);
}
