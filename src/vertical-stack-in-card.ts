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
      <ha-card>
        ${this._config.title ? html`<h1 class="card-header">${this._config.title}</h1>` : nothing}
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
    if (!(node instanceof HTMLElement)) {
      return;
    }

    const root = node.shadowRoot;
    if (root) {
      const haCard = root.querySelector<HTMLElement>('ha-card');
      if (haCard) {
        this._applyStrip(haCard);
        return;
      }
      const container = root.getElementById('root') ?? root.getElementById('card');
      if (container) {
        this._zeroMarginsAndRecurse(container.childNodes);
      }
      return;
    }

    const haCard = node.querySelector<HTMLElement>('ha-card');
    if (haCard) {
      this._applyStrip(haCard);
    }
    this._zeroMarginsAndRecurse(node.childNodes);
  }

  private _zeroMarginsAndRecurse(children: NodeListOf<ChildNode>): void {
    for (const child of Array.from(children)) {
      if (child instanceof HTMLElement) {
        child.style.margin = '0px';
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
   * Grid options for the Sections view — mirrors Home Assistant's own stack
   * cards (see `hui-stack-card.ts`). The critical value is `rows: 'auto'`: a
   * stack is a content container whose height is the sum of its children, so the
   * height MUST follow the content, never a fixed pixel count.
   *
   * How HA reads this (verified in `compute-card-grid-size.ts` /
   * `hui-grid-section.ts`): a NUMERIC `rows` adds the `fit-rows` class and forces
   * `height: calc(rows * 64px)` — a fixed height that overflows when the content
   * is taller and disagrees with the content-sized editor preview. A string
   * `rows: 'auto'` skips `fit-rows` and uses `grid-auto-rows: auto` instead, so
   * the card is content-sized in BOTH the live grid and the editor preview.
   *
   * `fixed_rows: true` tells newer HA to lock the row handle (height is
   * content-driven); older versions ignore the key harmlessly. The width stays
   * resizable (`min_columns`/default `max_columns`) and HA persists the chosen
   * `grid_options.columns` on its own.
   */
  public getGridOptions(): {
    columns: number;
    rows: 'auto';
    min_columns: number;
    fixed_rows: boolean;
  } {
    return {
      columns: 12,
      rows: 'auto',
      min_columns: 3,
      fixed_rows: true,
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

    // The stock vertical-stack editor only understands `type`, `title` and
    // `cards`; it re-emits a config stripped of everything else. That includes
    // our own `horizontal`/`styles` AND every layout property Home Assistant
    // injects into the card config — most importantly `grid_options` (the user's
    // Sections resize), plus `view_layout`, `layout_options`, `visibility`, …
    // Dropping `grid_options` is what made the card reset to its default size as
    // soon as the editor was opened. So we stash ALL non-managed keys on the way
    // in and merge them back into every emitted config.
    const MANAGED = new Set(['type', 'title', 'cards']);
    let extras: Record<string, unknown> = {};

    const originalSetConfig = editor.setConfig.bind(editor);
    editor.setConfig = (config: LovelaceCardConfig): void => {
      extras = {};
      for (const [key, value] of Object.entries(config)) {
        if (!MANAGED.has(key)) {
          extras[key] = value;
        }
      }
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
        const current = detail?.config as Record<string, unknown> | undefined;
        const keys = Object.keys(extras);
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

  // Sizing mirrors Home Assistant's built-in stack card so the card behaves
  // exactly as HA's Sections view expects: a full-height flex column whose
  // #root flexes to fill the space below the header. This keeps the card within
  // the grid cell HA allocates instead of overflowing. The card stays
  // theme-neutral (no own colours): the ha-card inherits the active theme and
  // the children are de-bordered then clipped to the themed corner radius.
  static styles: CSSResultGroup = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    /* Header, copied verbatim from HA's built-in stack card. */
    .card-header {
      color: var(--ha-card-header-color, var(--primary-text-color));
      text-align: var(--ha-stack-title-text-align, start);
      font-family: var(--ha-card-header-font-family, inherit);
      font-size: var(--ha-card-header-font-size, var(--ha-font-size-2xl));
      font-weight: var(--ha-font-weight-normal);
      margin-block-start: 0;
      margin-block-end: 0;
      letter-spacing: -0.012em;
      line-height: var(--ha-line-height-condensed);
      display: block;
      padding: 24px 16px 16px;
    }

    /* Fill the allocated grid cell and clip the flush, border-less children to
       --ha-card-border-radius so the stack reads as one unified card. */
    ha-card {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    #root {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    #root.horizontal {
      flex-direction: row;
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
