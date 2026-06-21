# Contributing

Merci de votre intérêt pour **Vertical Stack In Card** !

## Signaler un bug

Utilisez le [template de bug report](.github/ISSUE_TEMPLATE/bug_report.yml). Indiquez votre version de Home Assistant, votre navigateur et une configuration minimale qui reproduit le problème.

## Proposer une fonctionnalité

Utilisez le [template de feature request](.github/ISSUE_TEMPLATE/feature_request.yml).

## Prérequis

- Node.js ≥ 20
- `npm install` pour installer les dépendances

## Pull requests

1. Créez une branche dédiée : `git checkout -b feat/ma-feature`
2. Installez les hooks : `prek install` (ou `pre-commit install`)
3. Développez dans `src/` (TypeScript + Lit). `npm run dev` recompile à la volée.
4. Avant de commiter, faites passer la porte locale :
   ```bash
   npm run lint        # ESLint
   npm run typecheck   # tsc --noEmit
   npm run format:check # Prettier
   npm test            # Vitest
   npm run build        # bundle → dist/
   ```
5. Commit en [Conventional Commits](https://www.conventionalcommits.org/) : `feat: …`, `fix: …`, `docs: …`
6. Ouvrez une PR vers `master`

Les commits conventionnels alimentent automatiquement le changelog et le bump de version via release-please.

## Style de code

La carte est écrite en **TypeScript + [Lit](https://lit.dev)** dans `src/`, puis bundlée par Rollup (cible ES2022) en un unique `dist/vertical-stack-in-card.js` — c'est ce bundle que HACS distribue (attaché à chaque release, jamais committé). Conservez l'indentation à 2 espaces et la fin de ligne LF (cf. `.editorconfig`) ; Prettier et ESLint font foi.

Toute modification doit être couverte par des tests Vitest (`tests/`) et garder une couverture ≥ 80 %.

## Gestion des dépendances

Ce dépôt utilise **Renovate** (pas Dependabot). Les mises à jour des GitHub Actions et des hooks pre-commit sont ouvertes par `@renovate[bot]`. Voir le dashboard Renovate dans les [issues](../../issues?q=is%3Aissue+author%3Aapp%2Frenovate).
