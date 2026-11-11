# StatPanel - Prof (Mes Apps EPS)
Panneau de boutons (jusqu'à 12, en 1 à 4 zones, ou terrain de tennis / badminton / tennis de table) pour compter des actions motrices ou d'arbitrage et produire des statistiques.

Dépôt conseillé : `StatPanel_Prof` → https://vinztoc.github.io/StatPanel_Prof/ (même domaine que Mes Apps EPS : enregistrement direct dans la base).

## Fonctionnement
1. **Panneaux** : créer / modifier / dupliquer (libellé, action positive ou négative, valeur, couleur, zone), chrono ou compte à rebours, nom des périodes (Set, Mi-temps…). 5 exemples fournis.
2. **Lancement** : un élève, une équipe ou A contre B (deux panneaux côte à côte). Les élèves sont choisis dans la liste de Mes Apps EPS (bouton « Charger la liste » si l'appareil n'a pas de base).
3. **Comptage** : clic = +1 sur le bouton, score pondéré en direct, ↶ annuler, chrono, périodes, plein écran, écran maintenu allumé. L'observation en cours survit à une fermeture de l'app.
4. **Bilan** : score, actions + / −, % réussite, détail par bouton, zone et période, carte de chaleur des terrains, chronologie.
5. **Enregistrer** : `EPS.addLigne('statpanel', …)` → feuille **statpanel** (mode « lignes ») : une ligne par élève et par observation (une équipe = une ligne par membre), avec la chronologie des clics.
6. **Partager aux élèves** : « 📤 Partager mes panneaux » crée `StatPanel_Panneaux_AAAA-MM-JJ.xlsx` (feuille lisible `StatPanel_Config`, modifiable dans un tableur) ; les élèves l'importent dans StatPanel.

## Fichiers
`index.html`, `statpanel.js` (code commun aux deux versions), `statpanel.css`, `sp-xlsx.js` (lecture/écriture .xlsx sans dépendance), `eps-core.js` v2.3, `version.js`, `sw.js`, `manifest.webmanifest`, `icons/`.

## Mise à jour
Changer `APP_VERSION` dans `version.js` **et** `VERSION` dans `sw.js`.
