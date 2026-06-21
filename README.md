# Vertical Stack In Card

[![Release][release-shield]][releases]
[![Downloads][downloads-shield]][releases]
[![Stars][stars-shield]][stars]
[![HACS][hacs-shield]][hacs]
[![CI][ci-shield]][ci]
[![License][license-shield]](LICENSE)

**Vertical Stack In Card** is a custom Lovelace card for Home Assistant, allowing you to group multiple cards into a single sleek card. It offers a clean, organized way to display multiple cards in your Home Assistant dashboard.

![Showcase Card](https://user-images.githubusercontent.com/16443111/220773923-c28009d6-edfc-4ffd-9290-3e0c6e1acf73.png)

## Configuration Options

| Name         | Type    | Default | Description                                        |
| ------------ | ------- | ------- | -------------------------------------------------- |
| `type`       | string  | N/A     | Must be `custom:vertical-stack-in-card`.           |
| `cards`      | list    | N/A     | List of cards to include.                          |
| `title`      | string  | None    | Optional. Title displayed at the top of the card.  |
| `horizontal` | boolean | false   | Optional. Whether to stack cards horizontally.     |
| `styles`     | object  | None    | Optional. Add custom CSS for advanced styling.     |

## Installation

### Via HACS (Home Assistant Community Store)

1. Open HACS in Home Assistant.
2. Search for "Vertical Stack In Card."
3. Install and follow the setup instructions.

### Manual Installation

Download the bundled [`vertical-stack-in-card.js`](https://github.com/foXaCe/vertical-stack-in-card/releases/latest/download/vertical-stack-in-card.js) from the latest release into your `<config directory>/www` directory.

```bash
wget https://github.com/foXaCe/vertical-stack-in-card/releases/latest/download/vertical-stack-in-card.js
mv vertical-stack-in-card.js /config/www/
```

#### Add resource reference

If you configure Lovelace via YAML, add a reference to `vertical-stack-in-card.js` inside your `configuration.yaml`:

```yaml
resources:
  - url: /local/vertical-stack-in-card.js?v=1.0.2
    type: js
```

Alternatively, if you prefer the graphical editor, use the menu to add the resource.

1. Make sure **advanced mode** is enabled in your user profile (click on your user name to get there).

2. Navigate to **Settings** -> **Dashboards** -> **Resources**.

3. Click on **Add resource**, and fill out the form as follows:

   - **Url:** `/local/vertical-stack-in-card.js?v=1.0.2`
   - **Resource type:** `JavaScript Module`

4. Finish by clicking **Create** and refresh your browser.

## Usage

Add the card to your Lovelace UI configuration:

```yaml
type: 'custom:vertical-stack-in-card'
title: My Card
cards:
  - type: glance
    entities:
      - sensor.temperature_sensor
      - sensor.humidity_sensor
      - sensor.motion_sensor
  - type: entities
    entities:
      - switch.livingroom_tv
      - switch.livingroom_ac
      - light.ambient_lights
```

## Theming

The card is intentionally theme-neutral: it adds no colours or fonts of its own and inherits the active Home Assistant theme (light, dark or custom). The inner cards are de-bordered and clipped to the themed corner radius (`--ha-card-border-radius`) so the stack reads as a single, unified `ha-card`.

For advanced tweaks, the `styles` option sets raw CSS on every inner `ha-card`:

```yaml
type: custom:vertical-stack-in-card
styles:
  --ha-card-background: rgba(0, 0, 0, 0.3)
cards:
  - type: weather-forecast
    entity: weather.home
```

## Development

This card is written in TypeScript + [Lit](https://lit.dev) and bundled with Rollup (ES2022).

```bash
npm install        # install dependencies
npm run dev        # watch & rebuild to dist/
npm run build      # production bundle → dist/vertical-stack-in-card.js
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest unit tests
```

The bundle in `dist/vertical-stack-in-card.js` is what HACS distributes; it is rebuilt and attached to every GitHub release automatically.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## Acknowledgements

This project is a fork of the original [vertical-stack-in-card](https://github.com/ofekashery/vertical-stack-in-card) by [@ofekashery](https://github.com/ofekashery).

Thanks to [@ciotlosm](https://github.com/ciotlosm) and [@thomasloven](https://github.com/thomasloven) for their inspiration and contributions in building the foundation of this project.

## License

[MIT](LICENSE)

<!-- Badges -->

[release-shield]: https://img.shields.io/github/v/release/foXaCe/vertical-stack-in-card?style=for-the-badge
[downloads-shield]: https://img.shields.io/github/downloads/foXaCe/vertical-stack-in-card/total?style=for-the-badge
[stars-shield]: https://img.shields.io/github/stars/foXaCe/vertical-stack-in-card?style=for-the-badge
[stars]: https://github.com/foXaCe/vertical-stack-in-card/stargazers
[releases]: https://github.com/foXaCe/vertical-stack-in-card/releases
[hacs-shield]: https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge
[hacs]: https://github.com/hacs/integration
[ci-shield]: https://img.shields.io/github/actions/workflow/status/foXaCe/vertical-stack-in-card/ci.yml?branch=master&style=for-the-badge&label=CI
[ci]: https://github.com/foXaCe/vertical-stack-in-card/actions/workflows/ci.yml
[license-shield]: https://img.shields.io/github/license/foXaCe/vertical-stack-in-card?style=for-the-badge
