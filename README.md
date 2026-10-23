# lifeplus

En ligne : https://petitdelice.github.io/lifeplus/

Ta todo list devient un jeu. Chaque tâche terminée rapporte de l'XP et des éclats ; l'XP fait monter de niveau, les éclats s'échangent contre de vrais plaisirs dans le shop.

- 5 raretés de tâches (commun → mythique), calculées à partir de la durée et de la flemme
- Tâches normales, récurrentes (jour, semaine, mois) avec bonus de régularité, et projets en étapes avec bonus final
- Niveaux sans maximum, streaks avec multiplicateurs, coffres et gels de streak
- Shop : déblocage puis prix par utilisation, gamble (moitié prix, 20 % de chance), ticket d'or, revente
- Page « Chemin parcouru » : compteurs, badges, calendrier, grands moments
- Gratuit, sans compte : les données restent dans le navigateur (sauvegarde et restauration en JSON)

Les règles complètes sont dans `src/game/rules.ts` et `src/game/engine.ts`.

## Lancer en local

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # règles du jeu
npm run build    # version de production dans dist/
```

Stack : React, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand.

Le lien Buy Me a Coffee se règle dans `src/config.ts`.

## Mise en ligne

Chaque modification de `main` est publiée sur GitHub Pages par `.github/workflows/deploy.yml` (réglage du dépôt : Settings → Pages → Source : GitHub Actions).
