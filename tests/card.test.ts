import { beforeEach, describe, expect, it } from 'vitest';
import type { LovelaceCardConfig } from 'custom-card-helpers';

import { VerticalStackInCard } from '../src/vertical-stack-in-card';
import type { VerticalStackInCardConfig } from '../src/types';
import { childWithHaCard, createMockHass, installCardHelpers } from './fixtures/hass';

function makeCard(): VerticalStackInCard {
  return document.createElement('vertical-stack-in-card') as VerticalStackInCard;
}

function config(extra: Partial<VerticalStackInCardConfig> = {}): VerticalStackInCardConfig {
  return { type: 'custom:vertical-stack-in-card', cards: [], ...extra };
}

describe('setConfig validation', () => {
  it('throws when the config is missing', () => {
    const card = makeCard();
    expect(() => card.setConfig(undefined as unknown as VerticalStackInCardConfig)).toThrow();
  });

  it('throws when `cards` is absent', () => {
    const card = makeCard();
    expect(() =>
      card.setConfig({ type: 'custom:vertical-stack-in-card' } as VerticalStackInCardConfig),
    ).toThrow(/config/i);
  });

  it('throws when `cards` is not an array', () => {
    const card = makeCard();
    expect(() =>
      card.setConfig({
        type: 'custom:vertical-stack-in-card',
        cards: 'nope',
      } as unknown as VerticalStackInCardConfig),
    ).toThrow();
  });

  it('accepts a valid (empty) config', () => {
    installCardHelpers();
    const card = makeCard();
    expect(() => card.setConfig(config())).not.toThrow();
  });
});

describe('child building', () => {
  beforeEach(() => installCardHelpers());

  it('routes a `divider` entry through createRowElement and others through createCardElement', async () => {
    const spies = installCardHelpers();
    const card = makeCard();
    card.setConfig(config({ cards: [{ type: 'divider' }, { type: 'entities', entities: [] }] }));
    await card.getCardSize();
    expect(spies.createRowElement).toHaveBeenCalledTimes(1);
    expect(spies.createCardElement).toHaveBeenCalledTimes(1);
  });

  it('forwards hass to every child', async () => {
    const card = makeCard();
    card.setConfig(config({ cards: [{ type: 'a' }, { type: 'b' }] }));
    await card.getCardSize();
    const hass = createMockHass({ 'light.x': { state: 'on' } });
    card.hass = hass;
    const refs = (card as unknown as { _refCards: { hass?: unknown }[] })._refCards;
    expect(refs).toHaveLength(2);
    expect(refs.every((c) => c.hass === hass)).toBe(true);
    expect(card.hass).toBe(hass);
  });

  it('rebuilds a single child on `ll-rebuild` without touching the others', async () => {
    const spies = installCardHelpers();
    const card = makeCard();
    card.setConfig(config({ cards: [{ type: 'a' }, { type: 'b' }] }));
    await card.getCardSize();
    expect(spies.createCardElement).toHaveBeenCalledTimes(2);

    const refs = (card as unknown as { _refCards: HTMLElement[] })._refCards;
    const first = refs[0];
    first.dispatchEvent(new CustomEvent('ll-rebuild'));
    // Let the async rebuild settle.
    await Promise.resolve();
    await Promise.resolve();
    expect(spies.createCardElement).toHaveBeenCalledTimes(3);
  });
});

describe('sizing & grid', () => {
  beforeEach(() => installCardHelpers());

  it('getCardSize sums the children sizes', async () => {
    const card = makeCard();
    card.setConfig(config({ cards: [{ type: 'a' }, { type: 'b' }, { type: 'c' }] }));
    expect(await card.getCardSize()).toBe(3);
  });

  it('getGridOptions returns Sections options with columns multiple of 3', () => {
    const card = makeCard();
    const opts = card.getGridOptions();
    expect(opts.columns).toBe(12);
    expect((opts.columns as number) % 3).toBe(0);
    expect(opts.min_columns % 3).toBe(0);
    expect(opts.max_columns).toBe(12);
    expect(opts.rows).toBe('auto');
  });

  it('getStubConfig returns an empty cards list', () => {
    expect(VerticalStackInCard.getStubConfig()).toEqual({ cards: [] });
  });
});

describe('rendering', () => {
  beforeEach(() => installCardHelpers());

  it('renders an ha-card and applies the horizontal modifier', async () => {
    const card = makeCard();
    document.body.appendChild(card);
    card.setConfig(config({ horizontal: true, cards: [{ type: 'a' }] }));
    await card.getCardSize();
    await (card as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect(card.shadowRoot?.querySelector('ha-card')).toBeTruthy();
    expect(card.shadowRoot?.querySelector('#root')?.classList.contains('horizontal')).toBe(true);
    card.remove();
  });
});

describe('_styleCard — unifying the inner cards', () => {
  beforeEach(() => installCardHelpers());

  function cardWithStyles(styles?: Record<string, string>): {
    card: VerticalStackInCard;
    strip: (node: Node) => void;
  } {
    const card = makeCard();
    card.setConfig(config({ styles, cards: [] }));
    const strip = (node: Node): void =>
      (card as unknown as { _styleCard(n: Node): void })._styleCard(node);
    return { card, strip };
  }

  it('strips border/shadow/radius off an inner ha-card (shadow DOM)', () => {
    const { strip } = cardWithStyles();
    const child = childWithHaCard();
    strip(child);
    const haCard = child.shadowRoot!.querySelector('ha-card') as HTMLElement;
    expect(haCard.style.boxShadow).toBe('none');
    // Browsers (and happy-dom) normalise the `0` length to `0px`.
    expect(haCard.style.borderRadius).toMatch(/^0/);
    expect(haCard.style.border).toContain('none');
  });

  it('applies custom `styles` to the inner ha-card', () => {
    const { strip } = cardWithStyles({ '--ha-card-background': 'red' });
    const child = childWithHaCard();
    strip(child);
    const haCard = child.shadowRoot!.querySelector('ha-card') as HTMLElement;
    expect(haCard.style.getPropertyValue('--ha-card-background')).toBe('red');
  });

  it('recurses into a nested #root container and zeroes child margins', () => {
    const { strip } = cardWithStyles();
    const stack = document.createElement('div');
    const shadow = stack.attachShadow({ mode: 'open' });
    const root = document.createElement('div');
    root.id = 'root';
    const inner = childWithHaCard();
    root.appendChild(inner);
    shadow.appendChild(root);

    strip(stack);

    expect((inner as HTMLElement).style.margin).toBe('0px');
    expect((inner.shadowRoot!.querySelector('ha-card') as HTMLElement).style.boxShadow).toBe(
      'none',
    );
  });

  it('strips an ha-card found in the light DOM (no shadow root)', () => {
    const { strip } = cardWithStyles();
    const light = document.createElement('div');
    const haCard = document.createElement('ha-card');
    light.appendChild(haCard);
    strip(light);
    expect(haCard.style.boxShadow).toBe('none');
  });

  it('is a no-op for a null node', () => {
    const { strip } = cardWithStyles();
    expect(() => strip(null as unknown as Node)).not.toThrow();
  });
});

describe('edge cases & lifecycle', () => {
  it('renders nothing before setConfig', async () => {
    const card = makeCard();
    document.body.appendChild(card);
    await (card as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect(card.shadowRoot?.querySelector('ha-card')).toBeNull();
    card.remove();
  });

  it('passes hass to children created while hass is already set', async () => {
    installCardHelpers();
    const card = makeCard();
    const hass = createMockHass({ 'sun.sun': { state: 'above_horizon' } });
    card.hass = hass; // hass set BEFORE setConfig
    card.setConfig(config({ cards: [{ type: 'a' }] }));
    await card.getCardSize();
    const refs = (card as unknown as { _refCards: { hass?: unknown }[] })._refCards;
    expect(refs[0].hass).toBe(hass);
  });

  it('ignores a shadow root with no ha-card nor #root/#card container', () => {
    installCardHelpers();
    const card = makeCard();
    card.setConfig(config());
    const el = document.createElement('div');
    el.attachShadow({ mode: 'open' }).appendChild(document.createElement('span'));
    expect(() => (card as unknown as { _styleCard(n: Node): void })._styleCard(el)).not.toThrow();
  });

  it('_computeCardSize waits for the element to define, then sizes it', async () => {
    installCardHelpers();
    const card = makeCard();
    card.setConfig(config());

    let ready = false;
    const child = document.createElement('x-late-card') as unknown as HTMLElement;
    Object.defineProperty(child, 'getCardSize', {
      configurable: true,
      get: () => (ready ? () => 7 : undefined),
    });

    const sizePromise = (
      card as unknown as { _computeCardSize(c: HTMLElement): Promise<number> }
    )._computeCardSize(child);

    ready = true;
    customElements.define('x-late-card', class extends HTMLElement {});

    expect(await sizePromise).toBe(7);
  });

  it('_computeCardSize falls back to 1 when a child never exposes getCardSize', async () => {
    installCardHelpers();
    const card = makeCard();
    card.setConfig(config());

    // The element gets defined but still has no getCardSize: the retry guard
    // must stop after one attempt and return 1 instead of looping forever.
    const child = document.createElement('x-sizeless-card') as unknown as HTMLElement;
    const sizePromise = (
      card as unknown as { _computeCardSize(c: HTMLElement): Promise<number> }
    )._computeCardSize(child);

    customElements.define('x-sizeless-card', class extends HTMLElement {});

    expect(await sizePromise).toBe(1);
  });
});

// Exercise the divider type alias used by HA helpers for completeness.
describe('config typing', () => {
  it('treats a divider as a valid card entry', () => {
    const entry: LovelaceCardConfig = { type: 'divider' };
    expect(entry.type).toBe('divider');
  });
});
