# Mesures par script

Tout ce qui se compte est mesuré par un script du plugin, jamais par un code écrit sur le moment : le même fichier Figma donne ainsi les mêmes chiffres, quel que soit l'agent ou l'ordinateur. Les scripts sont dans `scripts/figma/`, à côté du dossier `references/`.

## Règle
1. Lis le fichier du script (outil Read) et passe son contenu **tel quel** dans le paramètre `code` de `use_figma`.
2. Ne change que les paramètres : remplace `{}` entre `/*PARAMS*/` et `/*FIN-PARAMS*/` par un objet JSON. Rien d'autre. Le filtre du plugin refuse un script dont le corps a changé.
3. Range le résultat **sans le modifier**, à l'endroit indiqué plus bas. Chaque bloc porte un `sceau` : une valeur retapée de travers est détectée.
4. Ne calcule aucun total toi-même. Les totaux, les parts et la restriction au périmètre sont faits par `scripts/compteurs.mjs`, que Kanshu ou Mitate lance (`node`), et qui écrit `.uikit/scan/compteurs.json`.
5. Un chiffre couvert par un script ne se mesure jamais autrement. Si un script échoue, rends l'erreur telle quelle en doute : n'improvise pas un code de remplacement.

## Scripts
| Script | Quand | Paramètres | Où ranger le résultat |
|---|---|---|---|
| `survol.js` | Survol, un seul appel | aucun | `survol.json`, clé `mesures` ; les champs de même nom du survol (`pages`, `motsRecurrents`, `versions`, `nomsEnDouble`, `local`) en sont la copie |
| `empreinte.js` | Scan, reprise, et avant toute écriture d'un lot | `{pageId}` | `scan/index.json`, `pages[].empreinte` (l'objet entier). Deux empreintes sont égales si leurs `sceau` sont égaux |
| `compteurs.js` | Scan et bilan, page par page | `{pageId, pagesKit, cadres}` | `scan/{pageId}.json`, `mesures.compteurs` : `ecrans[]` mis bout à bout, `composants`, `nomsBibliotheques` |
| `contrastes.js` | Scan et bilan, page par page | `{pageId, cadres}` | `scan/{pageId}.json`, `mesures.contrastes.ecrans[]` |

- `pagesKit` : identifiants des pages de rôle `kit` (`survol.json`).
- Si le résultat porte un `reste` non vide, relance le même script avec `cadres` égal à ce `reste`, jusqu'à ce qu'il soit vide. `cadres` absent au premier appel.
- `compteurs.js` et `contrastes.js` se lancent sur les pages d'écrans et sur les pages du kit.

## Ce que les scripts couvrent
Couleurs uniques, tailles de texte, espacements, rayons, familles et graisses de police, composants et variantes, part des propriétés reliées (kit et écrans), instances du kit dans les écrans, textes sans style, copies détachées signalées par Figma, contrastes des textes, noms de calques générés par Figma, valeurs hors échelle.

## Ce qui reste à ton jugement
Rôle des pages et type de produit, inventaire des blocs et familles, formes multiples et doublons par signature, familles d'icônes, grilles, règles de contenu, logo, noms hors nomenclature dans le kit. Ces relevés gardent leurs règles (`controles.md`, `catalogue.md`) et se disent comme tels : un constat tiré d'un script cite `script`, les autres non.

## Lire les chiffres
`scan/compteurs.json` fait foi pour tout chiffre couvert par un script : `ecrans` (écrans retenus), `kit` (pages du kit, `null` sans kit), `composants`, et `invalides`. Un bloc dans `invalides` (`sceau` : résultat altéré en le recopiant ; `absent` : écran retenu sans mesure) se remesure avant d'aller plus loin. `scan/compteurs-avant.json` garde les chiffres du premier scan pour le bilan.
