import { lessons, levels } from '../engine/levels';
import { counts, letters, masteryState, WINDOW, MASTERY_SURE, type MasteryState } from '../engine/mastery';
import { best, stars, SESSION_LENGTH } from '../engine/progress';
import type { Save } from '../shell/storage';

/** A small grown-up question keeps the follow-up away from little fingers. */
export interface Gate { a: number; b: number }
export const makeGate = (random: () => number): Gate => ({ a: 6 + Math.floor(random() * 4), b: 6 + Math.floor(random() * 4) });

export const gateHtml = (gate: Gate): string => `<button id="back" class="ghost">Accueil</button>
    <section class="panel parents-gate">
        <h1>Espace parents</h1>
        <form id="gate">
            <label for="gate-answer">Pour entrer, combien font <b data-a="${gate.a}" data-b="${gate.b}">${gate.a} × ${gate.b}</b> ?</label>
            <input id="gate-answer" type="number" inputmode="numeric" autocomplete="off" required>
            <button id="gate-enter" type="submit">Entrer</button>
            <p id="gate-message" role="status" aria-live="polite"></p>
        </form>
    </section>`;

const label: Record<MasteryState, string> = { new: 'Pas encore joué', learning: 'En cours', mastered: 'Acquis' };

export function parentsHtml(save: Save, confirmErase: boolean): string {
    let number = 0;
    const blocks = lessons.map((lesson, li) => {
        const rows = lesson.levels.map(info => {
            const level = ++number;
            const key = String(level);
            const entry = save.mastery[key];
            const pending = save.reviews[key]?.length ?? 0;
            const state = masteryState(entry, pending);
            if (!entry) return `<li class="follow unplayed" data-level="${level}" data-state="new"><div class="follow-title"><b>${level}. ${info.title}</b><span class="badge badge-new">${label.new}</span></div></li>`;
            const c = counts(entry);
            const s = stars(best(save.records, level));
            return `<li class="follow" data-level="${level}" data-state="${state}">
                <div class="follow-title"><b>${level}. ${info.title}</b><span class="badge badge-${state}">${label[state]}</span><span class="follow-stars" aria-label="${s} étoiles">${'★'.repeat(s)}${'☆'.repeat(3 - s)}</span></div>
                <div class="meter" role="img" aria-label="${c.sure} sur ${c.total} du premier coup">${letters(entry.recent).map(o => `<i class="o-${o}"></i>`).join('')}</div>
                <p class="follow-facts"><span>Du premier coup : <b>${c.sure}/${c.total}</b></span><span>Au hasard : <b>${c.guess}</b></span><span>À revoir : <b>${pending}</b></span><span>Séries : ${entry.sessions} · ${entry.last}</span></p>
            </li>`;
        }).join('');
        return `<h2>Leçon ${li + 1} · ${lesson.title}</h2><ul class="follow-list">${rows}</ul>`;
    }).join('');
    const played = Object.keys(save.mastery).length;
    const mastered = levels.filter((_, i) => masteryState(save.mastery[String(i + 1)], save.reviews[String(i + 1)]?.length ?? 0) === 'mastered').length;
    return `<button id="back" class="ghost">Accueil</button>
        <section class="panel parents">
            <h1 tabindex="-1">Suivi de l’apprentissage</h1>
            <p class="parents-summary">${mastered} niveau${mastered > 1 ? 'x' : ''} acquis · ${played} commencé${played > 1 ? 's' : ''} sur ${levels.length}</p>
            <details class="parents-rule"><summary>Comment c’est mesuré ?</summary>
                <p>Une série compte ${SESSION_LENGTH} questions. Un niveau est <b>acquis</b> quand les ${WINDOW} dernières réponses (deux séries) comptent au moins ${MASTERY_SURE} bonnes réponses du premier coup, aucune réponse au hasard et plus rien à revoir. Les étoiles disent comment une série s’est passée ; la maîtrise dit si la notion tient dans la durée.</p>
                <p>Une réponse au hasard, c’est une réponse donnée moins d’une seconde après une erreur, presque toutes les propositions essayées l’une après l’autre, ou trois erreurs sur un rangement ou un dessin. Deux dans une série et la série ne donne pas d’étoiles. Une question manquée revient au début de la série suivante.</p>
            </details>
            <p class="legend"><span><i class="o-s"></i>du premier coup</span><span><i class="o-r"></i>après une erreur</span><span><i class="o-g"></i>au hasard</span></p>
            ${blocks}
            <p class="privacy">Ce suivi reste sur cet appareil : rien n’est envoyé.</p>
            <button id="erase" class="${confirmErase ? 'confirm' : 'ghost'}">${confirmErase ? 'Confirmer l’effacement du suivi' : 'Effacer le suivi'}</button>
        </section>`;
}
