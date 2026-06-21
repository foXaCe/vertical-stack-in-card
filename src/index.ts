import { CARD_VERSION } from './const';
import { VerticalStackInCard } from './vertical-stack-in-card';

console.info(
  `%c VERTICAL-STACK-IN-CARD %c v${CARD_VERSION} `,
  'color: white; background: #1976d2; font-weight: 700; border-radius: 4px 0 0 4px;',
  'color: #1976d2; background: white; font-weight: 700; border-radius: 0 4px 4px 0;',
);

window.customCards = window.customCards ?? [];
window.customCards.push({
  type: 'vertical-stack-in-card',
  name: 'Vertical Stack In Card',
  description: 'Group multiple cards into a single sleek card.',
  preview: false,
  documentationURL: 'https://github.com/foXaCe/vertical-stack-in-card',
});

export { VerticalStackInCard };
