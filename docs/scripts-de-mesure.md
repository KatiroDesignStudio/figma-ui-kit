# Scripts de mesure

Pourquoi : deux lancements sur le même fichier Figma doivent rendre les mêmes chiffres, sur n'importe quel ordinateur. Tant que l'agent Seiri écrit lui-même son code de mesure, ce n'est pas garanti. Le plugin fournit donc ce code, et l'agent le lance tel quel.

Ce document est la spécification des scripts. Les agents, eux, lisent `references/mesures.md`, plus court.

## Principes

1. **Un script = un fichier**, dans `plugins/figma-ui-kit/skills/build/scripts/figma/`. Son contenu est le corps d'un appel `use_figma` : `await` et `return` au premier niveau, aucun `import`.
2. **L'agent ne modifie que les paramètres.** Chaque script commence par :
   ```js
   // figma-ui-kit:script {nom} v{n}
   const PARAMS = /*PARAMS*/{}/*FIN-PARAMS*/;
   ```
   L'agent remplace `{}` par un objet JSON. Tout le reste part tel quel. Le filtre du plugin refuse un code qui porte l'en-tête d'un script mais dont le corps diffère du fichier fourni.
3. **Lecture seule.** Aucun script n'écrit dans Figma : chacun passe le contrôle `ecritureFigma` du filtre. Les objets de résultat n'ont pas de clé au nom d'une propriété de nœud (`nom`, pas `name`).
4. **Un sceau par résultat.** Chaque bloc de mesures porte `sceau` : une empreinte FNV-1a (32 bits, hexadécimal) de son JSON canonique (clés triées). L'agent recopie le résultat dans `.uikit/` ; le script local `compteurs.mjs` recalcule le sceau et refuse un bloc altéré.
5. **Pas de calcul de tête.** Toute agrégation (somme, part, restriction au périmètre) est faite par `scripts/compteurs.mjs`, lancé par Kanshu ou Mitate avec `node`.
6. **Le jugement reste à l'agent**, et il est dit comme tel : rôle des pages, type de produit, inventaire des blocs, familles, formes multiples, règles de contenu. Les scripts ne couvrent que ce qui se compte.
7. **Bloc commun.** Les fonctions partagées (`sceau`, parcours, couleurs) sont dans `_commun.js`. Chaque script en contient une copie conforme, entre les lignes `// --- commun ---` et `// --- fin commun ---` ; un test le vérifie.

## Définitions (reprises de `references/controles.md`)

- **Nœud compté** : visible, lui et tous ses parents ; parcouru depuis chaque enfant de la page. Une instance compte pour 1 et ses enfants ne sont pas parcourus. Une section est traversée sans être comptée.
- **Écran** : cadre de premier niveau (enfant direct d'une page ou d'une section), visible, de type `FRAME`, `COMPONENT`, `COMPONENT_SET` ou `INSTANCE`. Un cadre invisible, ou rangé dans une section invisible, n'est pas un écran.
- **Propriété** : un remplissage visible non image ; une couleur de contour visible ; une épaisseur de contour par côté non nul, quand le nœud a un contour visible ; un côté de padding non nul ; un écart d'auto-layout non nul (hors `SPACE_BETWEEN`) ; un rayon non nul (un seul si les quatre coins sont égaux, sinon un par coin non nul) ; un effet visible ; une opacité différente de 1 ; un segment de texte pour la typo.
- **Propriété reliée** : par une variable (`boundVariables`) ou par un style (`fillStyleId`, `strokeStyleId`, `effectStyleId`, `textStyleId`). Les deux parts sont comptées à part.
- **Instance** : seules ses modifications locales comptent (`overrides`) : chaque champ surchargé qui correspond à une propriété est compté sur le nœud surchargé, s'il est visible, lui et ses parents jusqu'à l'instance.
- **Typo** : les segments de typo se découpent sur la taille, la police, la graisse et le style de texte, jamais sur la couleur.
- **Espacement négatif** (chevauchement en auto-layout) : compté comme une propriété et dans les espacements, mais jamais « hors échelle ».
- **Hors de tous les compteurs de propriétés** : remplissages image, et le cadre d'un component set (remplissage, contour, rayon, padding, écart, effets, opacité). Ce cadre reste compté comme un nœud.

## Scripts

| Script | Paramètres | Rend |
|---|---|---|
| `empreinte.js` | `pageId` | `{page, noeuds, parType, instances, sceau}` : nœuds comptés, par type, instances par composant principal (identifiant, ou clé pour une bibliothèque) |
| `survol.js` | aucun | Par page : cadres de premier niveau, sections, autres nœuds, préfixes, noms en double ; pour le fichier : mots récurrents, versions, styles et collections locaux. Sans rôle de page ni type de produit (jugement) |
| `compteurs.js` | `pageId`, `cadres[]` (facultatif), `pagesKit[]`, `budgetMs` | Par écran : nœuds comptés, propriétés (total, par variable, par style), histogrammes des couleurs, tailles de texte, espacements, rayons, polices, textes sans style, copies détachées, instances (kit, locales, bibliothèques), noms générés par Figma ; composants de la page ; `reste[]` si le budget de temps est dépassé |
| `contrastes.js` | `pageId`, `cadres[]` (facultatif), `budgetMs` | Par écran : textes mesurés, en échec, indéterminés, et 20 exemples au plus |
| `compteurs.mjs` (local, `node`, dans `scripts/`) | dossier `.uikit/`, `--tout` (facultatif) | Vérifie les sceaux, agrège les écrans retenus, écrit `scan/compteurs.json` |

## Formats de sortie

Les histogrammes sont des objets `{valeur: occurrences}`, clés triées. Chaque écran porte son `sceau`, calculé sur l'écran sans ce champ.

`survol.js` :
```json
{ "version": 1,
  "pages": [{ "id": "1:1", "nom": "Écrans", "vide": false, "cadres": 12, "sections": ["Public"],
              "prefixes": [{ "prefixe": "home", "occurrences": 3 }],
              "autresNoeuds": [{ "id": "5:1", "nom": "Image 3", "type": "RECTANGLE" }],
              "composants": 0 }],
  "motsRecurrents": [{ "mot": "dashboard", "occurrences": 4 }],
  "versions": [{ "nom": "Accueil v2", "page": "1:1" }],
  "nomsEnDouble": [{ "nom": "Accueil", "ids": ["2:1", "7:1"] }],
  "local": { "stylesCouleur": 0, "stylesTexte": 0, "stylesEffet": 0, "stylesGrille": 0,
             "collections": [{ "nom": "primitives", "modes": 1, "variables": 31 }] },
  "sceau": "…" }
```
Règles de `survol.js` (reprises de l'agent Seiri) : préfixe = début de nom commun à 2 cadres au moins de la page, jusqu'au premier séparateur (`_`, `-`, `/`, espace), casse ignorée ; mot récurrent = 3 occurrences au moins dans les noms de cadres du fichier, marqueurs de version exclus, mots de 3 lettres au moins ; version = nom qui contient `v1` à `v99`, `version`, `final`, `old`, `wip`, `draft`, `explo`, `test`, `copy`, `copie`, `backup`, `archive`, `ancien`, `new`, `bis` (mot entier, casse ignorée) ou une date (`2024-05-01`, `01/05/2024`) ; page `vide` = aucun enfant ; `composants` = composants principaux et component sets de la page. Le script change de page pour chaque page (lecture du fichier entier, seul cas admis).

`compteurs.js` :
```json
{ "version": 1, "page": { "id": "1:1", "nom": "Écrans" },
  "ecrans": [{ "id": "2:1", "nom": "Accueil", "largeur": 1440, "noeuds": 312,
               "proprietes": { "total": 840, "parVariable": 120, "parStyle": 60 },
               "couleurs": { "0A0A0A": 40, "FFFFFF80": 2 },
               "taillesTexte": { "14": 30, "16": 12 },
               "espacements": { "8": 40, "13": 1 }, "rayons": { "4": 12 },
               "polices": { "Inter/Regular": 30, "Inter/Bold": 12 },
               "textes": { "total": 42, "sansStyle": 5 },
               "copiesDetachees": 1,
               "instances": { "total": 20, "kit": 12, "locales": 5, "bibliotheques": { "cle-abc": 3 } },
               "nomsGeneres": 18, "sceau": "…" }],
  "composants": { "sets": 4, "simples": 2, "variantes": 31, "sceau": "…" },
  "nomsBibliotheques": { "cle-abc": "Icon / arrow" },
  "reste": [] }
```
- `couleurs` : remplissages et contours pleins visibles, textes compris, en hexadécimal (alpha ajouté s'il est sous 1).
- `polices` : `{famille}/{style}`, une occurrence par segment de texte.
- `instances.kit` : composant principal local, rangé sur une page de `pagesKit` ; `locales` : local, hors de ces pages ; `bibliotheques` : par clé du composant distant.
- `nomsGeneres` : nœuds comptés dont le nom est celui que Figma donne par défaut (`Frame 12`, `Group 3`, `Rectangle 5`, `Ellipse`, `Vector`, `Line`, `Polygon`, `Star`, `Union`, `Subtract`, `Intersect`, `Exclude`, suivi ou non d'un nombre).
- `composants` : sur toute la page ; `variantes` = composants des sets, plus les composants simples. Rendu seulement quand `cadres` est absent des paramètres ou vide.
- `reste` : identifiants des cadres non traités quand `budgetMs` (20 000 par défaut) est dépassé. L'agent relance avec `cadres: reste`.

`contrastes.js` :
```json
{ "version": 1, "page": { "id": "1:1", "nom": "Écrans" },
  "ecrans": [{ "id": "2:1", "nom": "Accueil", "textes": 42, "echecs": 3, "indetermines": 2, "approximatifs": 1,
               "exemples": [{ "noeud": "2:9", "texte": "Envoyer", "couleur": "9AA0A6", "fond": "FFFFFF",
                              "ratio": 2.61, "seuil": 4.5, "etat": "echec" }],
               "sceau": "…" }],
  "reste": [] }
```
`etat` vaut `echec` ou `indetermine`. `ratio` est arrondi à 2 décimales ; l'échec se juge sur le ratio non arrondi. `texte` : 40 caractères au plus. 20 exemples au plus par écran, les échecs d'abord, dans l'ordre du document.

Dans `.uikit/scan/{pageId}.json`, l'agent range ces résultats sous `mesures` : `{ "compteurs": { "ecrans": [], "composants": {} }, "contrastes": { "ecrans": [] } }`, les écrans de plusieurs appels mis bout à bout, sans les modifier.

`compteurs.mjs` (local) : `node compteurs.mjs <dossier .uikit> [--tout]`. Lit `scan/*.json` (clé `mesures`), `survol.json` (pages de rôle `kit`) et `perimetre-valide.json` s'il existe (écrans retenus, sauf avec `--tout`). Vérifie chaque sceau, puis écrit `scan/compteurs.json` :
```json
{ "version": 1, "ecransRetenus": 44, "ecransMesures": 44,
  "ecrans": { "noeuds": 13708, "proprietes": { "total": 0, "parVariable": 0, "parStyle": 0, "partReliee": 12.5 },
              "couleursUniques": 63, "taillesTexte": 17, "espacements": 24, "rayons": 9,
              "familles": 2, "polices": 6, "textes": { "total": 0, "sansStyle": 0 },
              "copiesDetachees": 0, "instances": { "total": 0, "kit": 0, "partKit": 0 },
              "nomsGeneres": 0, "contrastes": { "textes": 0, "echecs": 0, "indetermines": 0 },
              "horsEchelle": { "espacements": ["13"], "rayons": [] },
              "histogrammes": { "couleurs": {}, "taillesTexte": {}, "espacements": {}, "rayons": {}, "polices": {} } },
  "kit": null,
  "composants": { "sets": 0, "simples": 0, "variantes": 0 },
  "invalides": [{ "page": "1:1", "ecran": "2:1", "motif": "sceau" }] }
```
`kit` a la même forme que `ecrans`, calculée sur les écrans des pages de rôle `kit` ; `null` sans page de kit. Les parts sont en pourcentage, à une décimale. Hors échelle : valeur qui n'est pas un multiple de 4 (2 toléré sous 8). Le script sort avec le code 1 et la liste des blocs invalides. Chaque entrée de `invalides` dit son `bloc` (`compteurs`, `contrastes` ou `composants`) et son `motif` : `sceau` (résultat altéré en le recopiant), `absent` (écran retenu sans compteurs), `absent-contraste` (sans contrastes), `non-mesure` (écran laissé dans un `reste`), `doublon` (même écran dans deux fichiers de scan). Un bloc invalide n'entre dans aucun total. `partKit` = instances du kit / nœuds comptés (`controles.md`). Hors échelle : les valeurs négatives ou nulles et les rayons de 100 et plus (rayon plein) sont ignorés. Aucune date dans le fichier : deux lancements donnent deux fichiers identiques.

### Contraste (version 1)
- Textes mesurés : tous les textes visibles de l'écran, ceux des instances compris (le contraste se juge sur ce que l'écran affiche).
- Couleur du texte : le remplissage plein visible du dessus de chaque segment (le dernier de la liste de Figma), avec son opacité et celles du nœud et de ses parents. Un dégradé ou une image au-dessus : « indéterminé ».
- Fond : on remonte les parents jusqu'au premier remplissage plein opaque, en composant les remplissages pleins translucides rencontrés. Un dégradé ou une image avant un fond opaque : « indéterminé ». Aucun fond trouvé : blanc, marqué `fondParDefaut`.
- Un frère placé dessous, qui recouvre le texte et porte un remplissage : résultat marqué `approximatif`.
- Seuils WCAG 2.2 AA : 3:1 pour un grand texte (24 px et plus, ou 18,66 px et plus en graisse 700 et plus), sinon 4,5:1.
- Le ratio se calcule sur les couleurs composées arrondies sur 8 bits, celles que l'exemple affiche : il se retrouve en le recalculant depuis `couleur` et `fond`. Un texte à plusieurs segments prend l'état du pire, et à état égal le ratio le plus bas.

## Tests

`npm test` lance les scripts exacts du plugin contre un faux document Figma (`tests/aide/figma-simule.mjs`). Chaque script a ses cas : comptage, exclusions, sceau, lecture seule.

## Limites connues
- Le sceau détecte une erreur de recopie, pas une falsification : c'est un contrôle d'intégrité.
- L'identifiant de page et les noms de bibliothèques ne sont pas couverts par un sceau.
- Le filtre garantit qu'un code qui se présente comme un script du plugin est bien ce script. Il n'oblige pas un agent à passer par un script : c'est la consigne (`references/mesures.md`) qui le demande.
- `survol.js` lit tout le fichier en un appel, sans reprise : sur un très gros fichier, il peut dépasser le temps d'un appel.
- Non vérifiés sur un vrai fichier à ce jour : les cas « indéterminé » et « approximatif » du contraste, les instances de bibliothèque, la reprise par `reste`.
