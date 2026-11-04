/**
 * « Donner mon avis » opens the game's public feedback forms in a new tab.
 * It is a plain link: nothing is sent from this page, and no counter or tracker is involved.
 */
export const FEEDBACK_URL = 'https://github.com/Davy45270/petit-astronome/issues/new/choose';

export const FEEDBACK_LABEL = 'Donner mon avis';

export const feedbackLinkHtml = (): string =>
    `<a id="feedback" class="ghost feedback-link" href="${FEEDBACK_URL}" target="_blank" rel="noopener noreferrer">${FEEDBACK_LABEL}<span class="visually-hidden"> (nouvel onglet)</span></a>`;
