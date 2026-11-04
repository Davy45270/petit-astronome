import { expect, it } from 'vitest';
import { FEEDBACK_LABEL, FEEDBACK_URL, feedbackLinkHtml } from '../src/ui/feedback';

it('points at the public feedback forms of this game, with no tracking parameter', () => {
    expect(FEEDBACK_URL).toBe('https://github.com/Davy45270/petit-astronome/issues/new/choose');
});

it('renders a new-tab link that cannot reach back into the game', () => {
    const html = feedbackLinkHtml();
    expect(html).toMatch(/^<a id="feedback" class="ghost feedback-link" href="https:\/\/github\.com\/Davy45270\/petit-astronome\/issues\/new\/choose" target="_blank" rel="noopener noreferrer">/);
    expect(FEEDBACK_LABEL).toBe('Donner mon avis');
    expect(html).toContain('Donner mon avis<span class="visually-hidden"> (nouvel onglet)</span>');
});
