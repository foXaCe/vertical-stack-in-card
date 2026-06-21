import { css, html, LitElement, nothing } from 'lit';
import type { CSSResultGroup, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import type {
  HomeAssistant,
  LovelaceCard,
  LovelaceCardConfig,
  LovelaceCardEditor,
  VerticalStackInCardConfig,
} from './types';

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
}

function deferred(): Deferred {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

@customElement('vertical-stack-in-card')
export class VerticalStackInCard extends LitElement {
  @state() private _config?: VerticalStackInCardConfig;

  private _hass?: HomeAssistant;
  private _refCards: LovelaceCard[] = [];
  private _cardSize: Deferred = deferred();
  private _buildGeneration = 0;

  public setConfig(config: VerticalStackInCardConfig): void {
    if (!config || !Array.isArray(config.cards)) {
      throw new Error('Card config incorrect');
    }
    this._config = config;
    this._cardSize = deferred();
    void this._buildCards();
  }

  // A stack forwards `hass` to every child and never renders entity state
  // itself, so there is nothing to filter — just pass the object down. The
  // host deliberately does NOT request its own re-render here.
  public set hass(hass: HomeAssistant) {
    this._hass = hass;
    for (const card of this._refCards) {
      card.hass = hass;
    }
  }

  public get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  private async _buildCards(): Promise<void> {
    const config = this._config;
    if (!config) {
      return;
    }
    const generation = ++this._buildGeneration;
    const cards = await Promise.all(
      config.cards.map((cardConfig) => this._createCardElement(cardConfig)),
    );
    // A newer setConfig started another build while we awaited — discard ours.
    if (generation !== this._buildGeneration) {
      return;
    }
    this._refCards = cards;
    this.requestUpdate();
    this._cardSize.resolve();
  }

  private async _createCardElement(cardConfig: LovelaceCardConfig): Promise<LovelaceCard> {
    const helpers = await window.loadCardHelpers!();
    const element =
      cardConfig.type === 'divider'
        ? helpers.createRowElement(cardConfig)
        : helpers.createCardElement(cardConfig);

    if (this._hass) {
      element.hass = this._hass;
    }

    element.addEventListener(
      'll-rebuild',
      (ev: Event) => {
        ev.stopPropagation();
        void this._rebuildCard(element, cardConfig);
      },
      { once: true },
    );

    return element;
  }

  private async _rebuildCard(
    existing: LovelaceCard,
    cardConfig: LovelaceCardConfig,
  ): Promise<void> {
    const replacement = await this._createCardElement(cardConfig);
    const index = this._refCards.indexOf(existing);
    if (index >= 0) {
      this._refCards[index] = replacement;
    }
    this.requestUpdate();
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config) {
      return nothing;
    }
    return html`
      <ha-card .header=${this._config.title}>
        <div id="root" class=${classMap({ horizontal: Boolean(this._config.horizontal) })}>
          ${this._refCards}
        </div>
      </ha-card>
    `;
  }

  protected updated(): void {
    for (const card of this._refCards) {
      const updateComplete = (card as LovelaceCard & { updateComplete?: Promise<unknown> })
        .updateComplete;
      if (updateComplete) {
        void updateComplete.then(() => this._styleCard(card));
      } else {
        this._styleCard(card);
      }
    }
  }

  private _applyStrip(haCard: HTMLElement): void {
    haCard.style.boxShadow = 'none';
    haCard.style.borderRadius = '0';
    haCard.style.border = 'none';
    const styles = this._config?.styles;
    if (styles) {
      for (const [key, value] of Object.entries(styles)) {
        haCard.style.setProperty(key, value);
      }
    }
  }

  /**
   * Recursively strips borders/shadows/margins off the inner cards so the
   * stack reads as a single unified card. Reaches into nested shadow roots —
   * this is the card's entire purpose and cannot be done with CSS alone.
   */
  private _styleCard(node: Node | null): void {
    if (!node) {
      return;
    }
    const element = node as HTMLElement;
    const root = element.shadowRoot;

    if (root) {
      const haCard = root.querySelector<HTMLElement>('ha-card');
      if (haCard) {
        this._applyStrip(haCard);
        return;
      }
      const container = root.getElementById('root') ?? root.getElementById('card');
      if (!container) {
        return;
      }
      for (const child of Array.from(container.childNodes)) {
        const childEl = child as HTMLElement;
        if (childEl.style) {
          childEl.style.margin = '0px';
        }
        this._styleCard(child);
      }
      return;
    }

    if (typeof element.querySelector === 'function') {
      const haCard = element.querySelector<HTMLElement>('ha-card');
      if (haCard) {
        this._applyStrip(haCard);
      }
    }
    for (const child of Array.from(element.childNodes ?? [])) {
      const childEl = child as HTMLElement;
      if (childEl.style) {
        childEl.style.margin = '0px';
      }
      this._styleCard(child);
    }
  }

  private async _computeCardSize(card: LovelaceCard, retried = false): Promise<number> {
    if (typeof card.getCardSize === 'function') {
      return card.getCardSize();
    }
    // The element is not upgraded yet: wait for its definition once, then retry.
    // The `retried` guard prevents an infinite loop if a custom element never
    // exposes getCardSize even after being defined.
    if (retried) {
      return 1;
    }
    try {
      await customElements.whenDefined(card.localName);
    } catch {
      return 1;
    }
    return this._computeCardSize(card, true);
  }

  public async getCardSize(): Promise<number> {
    await this._cardSize.promise;
    const sizes = await Promise.all(this._refCards.map((card) => this._computeCardSize(card)));
    return sizes.reduce((total, size) => total + size, 0);
  }

  /**
   * Grid options for the Sections view. The stack height equals the sum of its
   * children, so we let Home Assistant auto-size the rows. It defaults to the
   * full 12-column width and may be shrunk to a quarter.
   */
  public getGridOptions(): {
    columns: number | 'full';
    rows: number | 'auto';
    min_columns: number;
    max_columns: number;
  } {
    return {
      columns: 12,
      rows: 'auto',
      min_columns: 3,
      max_columns: 12,
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    // Reuse Home Assistant's built-in vertical-stack editor — it is the right
    // tool for editing nested `cards` (far better than a flat ha-form schema)
    // and it comes fully localised by HA, including French.
    type StackEditorCtor = { getConfigElement(): Promise<LovelaceCardEditor> };
    let cls = customElements.get('hui-vertical-stack-card') as unknown as
      | StackEditorCtor
      | undefined;

    if (!cls) {
      const helpers = await window.loadCardHelpers!();
      helpers.createCardElement({ type: 'vertical-stack', cards: [] });
      await customElements.whenDefined('hui-vertical-stack-card');
      cls = customElements.get('hui-vertical-stack-card') as unknown as StackEditorCtor;
    }

    const editor = await cls.getConfigElement();

    // The stock editor only understands `title` and `cards`. Keep the
    // VSIC-only options (`horizontal`, `styles`) alive across edits: stash them
    // on the way in and merge them back into every emitted config so the visual
    // editor never silently drops a user's YAML-only settings.
    let extras: Partial<VerticalStackInCardConfig> = {};

    const originalSetConfig = editor.setConfig.bind(editor);
    editor.setConfig = (config: LovelaceCardConfig): void => {
      const incoming = config as VerticalStackInCardConfig;
      extras = {};
      if (incoming.horizontal !== undefined) extras.horizontal = incoming.horizontal;
      if (incoming.styles !== undefined) extras.styles = incoming.styles;
      originalSetConfig({
        type: config.type,
        title: config.title,
        cards: config.cards ?? [],
      } as LovelaceCardConfig);
    };

    editor.addEventListener(
      'config-changed',
      (ev: Event): void => {
        const detail = (ev as CustomEvent<{ config?: LovelaceCardConfig }>).detail;
        const current = detail?.config;
        const keys = Object.keys(extras) as (keyof VerticalStackInCardConfig)[];
        if (!current || keys.length === 0) return;
        // Already carries the extras (our own re-dispatch) — let it bubble.
        if (keys.every((key) => current[key] === extras[key])) return;
        ev.stopPropagation();
        editor.dispatchEvent(
          new CustomEvent('config-changed', {
            detail: { config: { ...current, ...extras } },
            bubbles: true,
            composed: true,
          }),
        );
      },
      true,
    );

    return editor;
  }

  public static getStubConfig(): Partial<VerticalStackInCardConfig> {
    return { cards: [] };
  }

  // This card is intentionally theme-neutral: it adds no colours, fonts or
  // animations of its own. The wrapping ha-card inherits the active Home
  // Assistant theme (light, dark or custom) for free, and the children are
  // de-bordered then clipped to the themed corner radius so the whole stack
  // reads as one unified, Material-3-compliant card. Layout is direction-aware
  // (flex), so right-to-left themes work without any extra rules.
  static styles: CSSResultGroup = css`
    :host {
      display: block;
    }

    /* Clip the flush, border-less children to --ha-card-border-radius so the
       unified card keeps correctly rounded corners in every theme. */
    ha-card {
      overflow: hidden;
    }

    #root.horizontal {
      display: flex;
    }

    #root.horizontal > * {
      flex: 1 1 0;
      min-width: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'vertical-stack-in-card': VerticalStackInCard;
  }
}
