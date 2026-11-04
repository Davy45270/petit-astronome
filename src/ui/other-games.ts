/**
 * The author's other games, shown from the home screen. A plain link opens a game in the same tab:
 * this page makes no request, and the icons are local files cached with the rest of the app.
 */
export interface OtherGame { id: string; name: string; url: string; icon: string; text: string }

export const GAMES: readonly OtherGame[] = [
    { id: 'opencade', name: 'Opencade', url: 'https://davy45270.github.io/Opencade/', icon: './autres-jeux/opencade.png', text: 'Des jeux d’arcade originaux, au doigt, à la souris ou au clavier.' },
    { id: 'opencadkid', name: 'Opencadkid', url: 'https://davy45270.github.io/opencadkid/', icon: './autres-jeux/opencadkid.png', text: 'Des petits jeux doux pour les tout-petits, avec Boubou et ses amis.' },
    { id: 'tictac', name: 'TicTac', url: 'https://davy45270.github.io/tictac/', icon: './autres-jeux/tictac.png', text: 'Apprendre à lire l’heure en jouant, à son rythme.' },
    { id: 'petit-astronome', name: 'Petit Astronome', url: 'https://davy45270.github.io/petit-astronome/', icon: './autres-jeux/petit-astronome.png', text: 'Découvrir le Soleil, les planètes, la Lune et les étoiles en jouant.' }
];

export const SELF = 'petit-astronome';
export const otherGames = (self = SELF): OtherGame[] => GAMES.filter(game => game.id !== self);

export const otherGamesHtml = (): string => `<button id="back" class="ghost">Accueil</button>
    <section class="panel other-games" aria-labelledby="other-games-title">
        <h1 id="other-games-title" tabindex="-1">Mes autres jeux</h1>
        <ul>${otherGames().map(game => `
            <li><a class="other-game" href="${game.url}" data-game="${game.id}">
                <img src="${game.icon}" alt="" width="64" height="64">
                <span><b>${game.name}</b><span>${game.text}</span></span>
            </a></li>`).join('')}
        </ul>
    </section>`;
