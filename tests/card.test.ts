import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('getGridOptions stays resizable on both axes (no locked handle)', () => {
    const card = makeCard();
    const opts = card.getGridOptions();
    expect(opts.columns).toBe(12);
    expect(opts.columns % 3).toBe(0);
    expect(opts.min_columns % 3).toBe(0);
    expect(opts.max_columns).toBe(12);
    // `rows` must be a number (not 'auto'), and both dimensions must keep
    // min < max so Home Assistant shows the resize handles.
    expect(typeof opts.rows).toBe('number');
    expect(opts.rows).toBeGreaterThan(0);
    expect(opts.min_columns).toBeLessThan(opts.max_columns);
    expect(opts.min_rows).toBeLessThan(opts.max_rows);
  });

  it('getGridOptions estimates initial rows from the children sizes', async () => {
    const card = makeCard();
    card.setConfig(config({ cards: [{ type: 'a' }, { type: 'b' }] }));
    await card.getCardSize();
    // Two children of size 1 → rows 2 (summed), not the empty-stack fallback (3).
    expect(card.getGridOptions().rows).toBe(2);
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

  it('recurses into a nested #card container (fallback selector)', () => {
    const { strip } = cardWithStyles();
    const stack = document.createElement('div');
    const shadow = stack.attachShadow({ mode: 'open' });
    const card = document.createElement('div');
    card.id = 'card'; // note: #card, not #root
    const inner = childWithHaCard();
    card.appendChild(inner);
    shadow.appendChild(card);

    strip(stack);

    expect((inner as HTMLElement).style.margin).toBe('0px');
    expect((inner.shadowRoot!.querySelector('ha-card') as HTMLElement).style.boxShadow).toBe(
      'none',
    );
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

  it('_computeCardSize returns 1 when whenDefined rejects', async () => {
    installCardHelpers();
    const card = makeCard();
    card.setConfig(config());

    const spy = vi.spyOn(customElements, 'whenDefined').mockRejectedValue(new Error('nope'));
    const child = document.createElement('div'); // no getCardSize → takes the whenDefined path

    const size = await (
      card as unknown as { _computeCardSize(c: HTMLElement): Promise<number> }
    )._computeCardSize(child);

    expect(size).toBe(1);
    spy.mockRestore();
  });

  it('waits for a child updateComplete before styling it', async () => {
    let resolveChild!: () => void;
    const childReady = new Promise<void>((r) => {
      resolveChild = r;
    });
    const child = document.createElement('div') as unknown as {
      getCardSize: () => number;
      updateComplete: Promise<void>;
      shadowRoot: ShadowRoot;
    };
    (child as unknown as HTMLElement)
      .attachShadow({ mode: 'open' })
      .appendChild(document.createElement('ha-card'));
    child.getCardSize = () => 1;
    child.updateComplete = childReady;

    (window as unknown as { loadCardHelpers: unknown }).loadCardHelpers = vi.fn(async () => ({
      createCardElement: () => child,
      createRowElement: () => child,
    }));

    const card = document.createElement('vertical-stack-in-card') as unknown as {
      setConfig: (c: unknown) => void;
      getCardSize: () => Promise<number>;
      updateComplete: Promise<unknown>;
    };
    document.body.appendChild(card as unknown as HTMLElement);
    card.setConfig({ type: 'custom:vertical-stack-in-card', cards: [{ type: 'x' }] });
    await card.getCardSize();
    await card.updateComplete;

    const haCard = child.shadowRoot.querySelector('ha-card') as HTMLElement;
    resolveChild();
    await childReady;
    await Promise.resolve();

    expect(haCard.style.boxShadow).toBe('none');
    (card as unknown as HTMLElement).remove();
  });
});

describe('setConfig race', () => {
  function makeDeferred<T = void>(): { promise: Promise<T>; resolve: (v: T) => void } {
    let resolve!: (v: T) => void;
    const promise = new Promise<T>((r) => {
      resolve = r;
    });
    return { promise, resolve };
  }

  /** Drain the microtask queue thoroughly (Promise chains can be several levels deep). */
  async function flushMicrotasks(rounds = 20): Promise<void> {
    for (let i = 0; i < rounds; i++) {
      await Promise.resolve();
    }
  }

  it('a superseded build does not overwrite the newer config', async () => {
    const gate = makeDeferred();
    let firstCall = true;
    const makeEl = (cfg: { type: string }) => {
      const el = document.createElement('div') as unknown as {
        getCardSize: () => number;
        _type: string;
      };
      el.getCardSize = () => 1;
      el._type = cfg.type;
      return el;
    };
    (window as unknown as { loadCardHelpers: unknown }).loadCardHelpers = vi.fn(async () => {
      if (firstCall) {
        firstCall = false;
        await gate.promise; // gate ONLY the first build's child creation
      }
      return { createCardElement: makeEl, createRowElement: makeEl };
    });

    const card = document.createElement('vertical-stack-in-card') as unknown as {
      setConfig: (c: unknown) => void;
      _refCards: { _type: string }[];
    };

    card.setConfig({ type: 'custom:vertical-stack-in-card', cards: [{ type: 'OLD' }] });
    card.setConfig({ type: 'custom:vertical-stack-in-card', cards: [{ type: 'NEW' }] });

    // Let the NEW build (unblocked) complete before we release the OLD gate.
    await flushMicrotasks();

    gate.resolve();

    // Give the released OLD build enough ticks to reach its _refCards assignment.
    await flushMicrotasks();

    expect(card._refCards.map((c) => c._type)).toEqual(['NEW']);
  });
});

// Exercise the divider type alias used by HA helpers for completeness.
describe('config typing', () => {
  it('treats a divider as a valid card entry', () => {
    const entry: LovelaceCardConfig = { type: 'divider' };
    expect(entry.type).toBe('divider');
  });
});
