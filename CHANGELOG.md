# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.3](https://github.com/foXaCe/vertical-stack-in-card/compare/v1.1.2...v1.1.3) (2026-06-22)


### Fixed

* keep the Sections view grid resizable on both axes ([7ea2d94](https://github.com/foXaCe/vertical-stack-in-card/commit/7ea2d94d326200681be335f9ab110afd8cb6da13))

## [1.1.2](https://github.com/foXaCe/vertical-stack-in-card/compare/v1.1.1...v1.1.2) (2026-06-21)


### Fixed

* ignore superseded card builds when setConfig is called again ([b2fd473](https://github.com/foXaCe/vertical-stack-in-card/commit/b2fd47354722ac21d8f56c2dcb104a0fa5449d96))


### Changed

* dedupe _styleCard traversal and use instanceof guards ([b7ba5eb](https://github.com/foXaCe/vertical-stack-in-card/commit/b7ba5eb19d76fc4fd6396ad8dca5203880bed869))

## [1.1.1](https://github.com/foXaCe/vertical-stack-in-card/compare/v1.1.0...v1.1.1) (2026-06-21)


### Fixed

* guard getCardSize against infinite recursion on un-upgraded children ([de5af78](https://github.com/foXaCe/vertical-stack-in-card/commit/de5af78d8647e3d266dc173a9354aef8b7aeeacb))


### Documentation

* add a Features section and bump the example resource version to 1.1.1 ([0c5941c](https://github.com/foXaCe/vertical-stack-in-card/commit/0c5941ceac0afba2b3abb8331752c450e8d43238))

## [1.1.0](https://github.com/foXaCe/vertical-stack-in-card/compare/v1.0.2...v1.1.0) (2026-06-21)


### Added

* rewrite in TypeScript + Lit 3 with Sections view support ([598d6a9](https://github.com/foXaCe/vertical-stack-in-card/commit/598d6a9008140c217cecf277c683dee4503cd2ae))

## [1.0.2](https://github.com/foXaCe/vertical-stack-in-card/compare/v1.0.1...v1.0.2) (2026-06-21)


### Documentation

* rewrite README and add community docs ([95feeaa](https://github.com/foXaCe/vertical-stack-in-card/commit/95feeaa121f5ee849083571e929ec7da0fdedb06))

## [Unreleased]

## [1.0.1] - 2024-12-13

### Added

- Group multiple Lovelace cards into a single sleek `ha-card`.
- Horizontal layout option (`horizontal: true`).
- Custom CSS through the `styles` option.
- Visual editor support via `getConfigElement`.

[Unreleased]: https://github.com/foXaCe/vertical-stack-in-card/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/foXaCe/vertical-stack-in-card/releases/tag/v1.0.1
