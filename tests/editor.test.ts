import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LovelaceCardConfig } from 'custom-card-helpers';

import { VerticalStackInCard } from '../src/vertical-stack-in-card';

/** Stand-in for HA's built-in vertical-stack editor element. */
class FakeStackEditor extends HTMLElement {
  public lastConfig?: LovelaceCardConfig;
  public setConfig(config: LovelaceCardConfig): void {
    this.lastConfig = config;
  }
  public static async getConfigElement(): Promise<FakeStackEditor> {
    return new FakeStackEditor();
  }
}

beforeEach(() => {
  // Mirror Home Assistant: the built-in stack editor is registered lazily, the
  // first time a stack card element is created. This exercises getConfigElement's
  // "editor not yet defined" branch on the first call.
  (window as unknown as { loadCardHelpers: unknown }).loadCardHelpers = vi.fn(async () => ({
    createCardElement: () => {
      if (!customElements.get('hui-vertical-stack-card')) {
        customElements.define('hui-vertical-stack-card', FakeStackEditor);
      }
      return document.createElement('div');
    },
    createRowElement: () => document.createElement('div'),
  }));
});

describe('getConfigElement (delegated built-in editor)', () => {
  it('returns the built-in editor and feeds it only type/title/cards', async () => {
    const editor = (await VerticalStackInCard.getConfigElement()) as unknown as FakeStackEditor;
    editor.setConfig({
      type: 'custom:vertical-stack-in-card',
      title: 'Salon',
      horizontal: true,
      styles: { '--ha-card-background': 'transparent' },
      cards: [{ type: 'entities', entities: [] }],
    } as LovelaceCardConfig);

    expect(editor.lastConfig).toMatchObject({
      type: 'custom:vertical-stack-in-card',
      title: 'Salon',
      cards: [{ type: 'entities', entities: [] }],
    });
    // The stock editor never receives the VSIC-only options.
    expect(editor.lastConfig).not.toHaveProperty('horizontal');
    expect(editor.lastConfig).not.toHaveProperty('styles');
  });

  it('re-injects horizontal/styles into emitted configs so they survive edits', async () => {
    const editor = await VerticalStackInCard.getConfigElement();
    editor.setConfig({
      type: 'custom:vertical-stack-in-card',
      title: 'Salon',
      horizontal: true,
      styles: { '--ha-card-background': 'transparent' },
      cards: [],
    } as LovelaceCardConfig);

    const emitted: LovelaceCardConfig[] = [];
    editor.addEventListener('config-changed', (ev: Event) => {
      emitted.push((ev as CustomEvent<{ config: LovelaceCardConfig }>).detail.config);
    });

    // Simulate the built-in editor emitting a config WITHOUT the extras.
    editor.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: {
          config: {
            type: 'custom:vertical-stack-in-card',
            title: 'Salon (édité)',
            cards: [{ type: 'markdown', content: 'x' }],
          },
        },
        bubbles: true,
        composed: true,
      }),
    );

    const merged = emitted.find((c) => (c as Record<string, unknown>).horizontal === true) as
      | Record<string, unknown>
      | undefined;
    expect(merged).toBeTruthy();
    expect(merged?.styles).toEqual({ '--ha-card-background': 'transparent' });
    // The user's card edits are preserved alongside the re-injected options.
    expect(merged?.title).toBe('Salon (édité)');
    expect(merged?.cards).toEqual([{ type: 'markdown', content: 'x' }]);
  });

  it('does not intercept when there are no extras to preserve', async () => {
    const editor = await VerticalStackInCard.getConfigElement();
    editor.setConfig({
      type: 'custom:vertical-stack-in-card',
      title: 'Salon',
      cards: [],
    } as LovelaceCardConfig);

    const emitted: LovelaceCardConfig[] = [];
    editor.addEventListener('config-changed', (ev: Event) => {
      emitted.push((ev as CustomEvent<{ config: LovelaceCardConfig }>).detail.config);
    });

    editor.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: { type: 'custom:vertical-stack-in-card', title: 'T', cards: [] } },
        bubbles: true,
        composed: true,
      }),
    );

    // Exactly one event — the original — no re-dispatch.
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).not.toHaveProperty('horizontal');
  });
});
