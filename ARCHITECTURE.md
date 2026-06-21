# Architecture

`vertical-stack-in-card` is a single-file custom Lovelace card (vanilla JavaScript, no build step). Home Assistant loads it as a JavaScript module, and it registers a custom element.

## Render flow

```text
setConfig(config)
   └─> renderCard()
         ├─> for each child card config: _createCardElement()
         │      └─> window.loadCardHelpers() → createCardElement / createRowElement
         ├─> _styleCard()  (strip inner card borders/shadows, apply `styles`)
         └─> build <ha-card> → attach to shadow DOM
```

## Key responsibilities

| Method | Role |
| --- | --- |
| `setConfig(config)` | Validates config, stores it, triggers the first render. |
| `renderCard()` | Builds the child cards, styles them, assembles the `ha-card`. |
| `_createCardElement(cardConfig)` | Instantiates a child card via HA card helpers; handles `ll-rebuild`. |
| `set hass(hass)` | Propagates the `hass` object to all child cards. |
| `_styleCard(element)` | Recursively removes inner card chrome and applies custom `styles`. |
| `getCardSize()` | Aggregates the size of child cards for the masonry layout. |
| `getConfigElement()` | Reuses the built-in vertical-stack editor for the visual editor. |
| `getStubConfig()` | Default config when the card is added from the UI. |

## Notes

- The card relies on `window.loadCardHelpers()`, a stable Home Assistant frontend API.
- The version string is annotated with `x-release-please-version`, so release-please keeps it in sync with releases.
- There is no bundler: the file shipped in releases is the file in the repository.
