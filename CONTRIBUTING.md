# Contributing

Merci de votre intérêt pour **Vertical Stack In Card** !

## Signaler un bug

Utilisez le [template de bug report](.github/ISSUE_TEMPLATE/bug_report.yml). Indiquez votre version de Home Assistant, votre navigateur et une configuration minimale qui reproduit le problème.

## Proposer une fonctionnalité

Utilisez le [template de feature request](.github/ISSUE_TEMPLATE/feature_request.yml).

## Pull requests

1. Créez une branche dédiée : `git checkout -b feat/ma-feature`
2. Installez les hooks : `prek install` (ou `pre-commit install`)
3. Vérifiez la syntaxe du fichier : `node --check vertical-stack-in-card.js`
4. Validez `hacs.json` : `jq empty hacs.json`
5. Commit en [Conventional Commits](https://www.conventionalcommits.org/) : `feat: …`, `fix: …`, `docs: …`
6. Ouvrez une PR vers `master`

Les commits conventionnels alimentent automatiquement le changelog et le bump de version via release-please.

## Style de code

Ce dépôt distribue un unique fichier JavaScript (`vertical-stack-in-card.js`) chargé tel quel par Home Assistant — pas d'étape de build. Conservez l'indentation à 2 espaces et la fin de ligne LF (cf. `.editorconfig`).

## Gestion des dépendances

Ce dépôt utilise **Renovate** (pas Dependabot). Les mises à jour des GitHub Actions et des hooks pre-commit sont ouvertes par `@renovate[bot]`. Voir le dashboard Renovate dans les [issues](../../issues?q=is%3Aissue+author%3Aapp%2Frenovate).
