# Vertical Stack In Card

Group multiple Home Assistant Lovelace cards into a single sleek card, with optional horizontal layout and custom styling.

## Features

- Combine any number of cards into one seamless `ha-card`
- Optional horizontal layout
- Custom CSS via the `styles` option
- Visual editor support

## Usage

```yaml
type: custom:vertical-stack-in-card
title: My Card
cards:
  - type: glance
    entities:
      - sensor.temperature
      - sensor.humidity
  - type: entities
    entities:
      - switch.living_room_tv
      - light.ambient
```
