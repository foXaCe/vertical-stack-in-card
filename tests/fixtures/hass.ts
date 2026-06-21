import { vi } from 'vitest';
import type { HomeAssistant, LovelaceCardConfig } from 'custom-card-helpers';

/** A minimal stand-in for a child Lovelace card element. */
export interface MockCard extends HTMLElement {
  _config?: LovelaceCardConfig;
  hass?: HomeAssistant;
  getCardSize(): number;
}

export function createMockHass(states: Record<string, unknown> = {}): HomeAssistant {
  return { states } as unknown as HomeAssistant;
}

export interface HelperSpies {
  createCardElement: ReturnType<typeof vi.fn>;
  createRowElement: ReturnType<typeof vi.fn>;
}

function makeMockCard(config: LovelaceCardConfig): MockCard {
  const element = document.createElement('div') as unknown as MockCard;
  element._config = config;
  const size = (config as LovelaceCardConfig & { size?: number }).size;
  element.getCardSize = (): number => size ?? 1;
  return element;
}

/**
 * Installs a mocked `window.loadCardHelpers` returning spy-able element
 * factories. Returns the spies so tests can assert routing (card vs row).
 */
export function installCardHelpers(): HelperSpies {
  const createCardElement = vi.fn((config: LovelaceCardConfig) => makeMockCard(config));
  const createRowElement = vi.fn((config: LovelaceCardConfig) => makeMockCard(config));
  (window as unknown as { loadCardHelpers: unknown }).loadCardHelpers = vi.fn(async () => ({
    createCardElement,
    createRowElement,
  }));
  return { createCardElement, createRowElement };
}

/** A detached child whose shadow root holds an `ha-card` (the strip target). */
export function childWithHaCard(): MockCard {
  const element = document.createElement('div') as unknown as MockCard;
  const shadow = element.attachShadow({ mode: 'open' });
  shadow.appendChild(document.createElement('ha-card'));
  element.getCardSize = (): number => 1;
  return element;
}
