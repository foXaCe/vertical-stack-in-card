import type {
  HomeAssistant,
  LovelaceCard,
  LovelaceCardConfig,
  LovelaceCardEditor,
} from 'custom-card-helpers';

/**
 * Public configuration of the `vertical-stack-in-card` card.
 *
 * This schema is part of the public API — every user dashboard relies on it,
 * so it MUST stay backwards compatible.
 */
export interface VerticalStackInCardConfig extends LovelaceCardConfig {
  /** Cards to group together (required). A `divider` entry becomes a row element. */
  cards: LovelaceCardConfig[];
  /** Optional header rendered on the wrapping `ha-card`. */
  title?: string;
  /** Lay the cards out horizontally (flex) instead of stacking them. */
  horizontal?: boolean;
  /** Raw CSS custom properties / values applied to every inner `ha-card`. */
  styles?: Record<string, string>;
}

/** Minimal surface of the helpers returned by `window.loadCardHelpers()`. */
export interface CardHelpers {
  createCardElement(config: LovelaceCardConfig): LovelaceCard;
  createRowElement(config: LovelaceCardConfig): LovelaceCard;
}

/** Metadata entry registered in `window.customCards` for the card picker. */
export interface CustomCardEntry {
  type: string;
  name: string;
  description?: string;
  preview?: boolean;
  documentationURL?: string;
}

declare global {
  interface Window {
    loadCardHelpers?: () => Promise<CardHelpers>;
    customCards?: CustomCardEntry[];
  }
}

export type { HomeAssistant, LovelaceCard, LovelaceCardConfig, LovelaceCardEditor };
