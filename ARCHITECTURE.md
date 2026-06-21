# Architecture

`vertical-stack-in-card` is a custom Lovelace **container card**: it groups any
number of child cards into a single, unified `ha-card`. It is written in
TypeScript with [Lit](https://lit.dev) and bundled with Rollup (ES2022) into a
single `dist/vertical-stack-in-card.js` that Home Assistant loads as a module.

```text
src/
├── index.ts                  entry — console banner + window.customCards registration
├── vertical-stack-in-card.ts the LitElement card
├── types.ts                  public config + helper types
└── const.ts                  CARD_VERSION (kept in sync by release-please)
```

## Render flow

```text
setConfig(config)                      validate, store, then…
   └─> _buildCards()                   async
         ├─> for each child config: _createCardElement()
         │      └─> window.loadCardHelpers() → createCardElement / createRowElement
         │      └─> wires a one-shot `ll-rebuild` listener
         └─> requestUpdate()
                └─> render()           <ha-card><div id="root">${childCards}</div></ha-card>
                      └─> updated()     _styleCard(child) once each child is ready
```

The container is intentionally theme-neutral. `_styleCard()` reaches into each
child's shadow DOM to strip its border, shadow and radius (and apply the
optional `styles`); the outer `ha-card` then clips the flush children to the
themed corner radius so the whole stack reads as one card. This shadow-DOM
mutation is the card's core purpose and cannot be expressed with CSS alone.

## Key responsibilities

| Method | Role |
| --- | --- |
| `setConfig(config)` | Validates the config, stores it, kicks off `_buildCards()`. |
| `_buildCards()` | Instantiates every child card, then requests a render. |
| `_createCardElement(cardConfig)` | Builds one child via HA helpers (`divider` → row element); wires `ll-rebuild`. |
| `_rebuildCard()` | Re-creates a single child in place when it fires `ll-rebuild`. |
| `set hass(hass)` | Forwards `hass` to every child (no own re-render). |
| `render()` / `updated()` | Renders the wrapping `ha-card`; styles the children after they update. |
| `_styleCard(node)` | Recursively de-borders inner cards and applies custom `styles`. |
| `getCardSize()` | Aggregates child sizes for the Masonry layout. |
| `getGridOptions()` | Sections view footprint (full width, auto height, resizable). |
| `getConfigElement()` | Delegates to HA's built-in stack editor; preserves `horizontal`/`styles`. |
| `getStubConfig()` | Default config when the card is added from the UI. |

## Notes

- The card relies on `window.loadCardHelpers()`, a stable HA frontend API, and
  on the built-in `hui-vertical-stack-card` editor (localised by HA for free).
- The version string in `src/const.ts` is annotated with
  `x-release-please-version`, so release-please keeps it in sync with releases.
- `dist/` is **not** committed. The bundle is built in CI and attached to every
  GitHub release; HACS distributes that release asset.
