# Structure du UI Kit dans Figma

Règle fixe du plugin. Seiton la met en place en phase 1 de `katiro-ui-kit-build` ; `Écrans kit` est créée par `katiro-ui-kit-templates` au premier écran qui reçoit le kit.

## Pages, dans cet ordre, en tête du fichier
| Page | Contenu |
|---|---|
| `Revue` | Le compte rendu du chantier, en tête du fichier : il tient lieu de couverture (nom du projet, date, chiffres avant et après, liens vers les pages) |
| `Accessibilité` | Seulement si `katiro-ui-kit-accessibilite` a été lancé : les recommandations RGAA |
| `Arborescence` | Les écrans de référence et leurs parcours |
| `UI Kit · Foundations` | Colors, Typography, Spacing, Radius, Borders, Opacity, Shadows, Grids, Icons |
| `UI Kit · Atoms` | |
| `UI Kit · Molecules` | |
| `UI Kit · Organisms` | |
| `Archives` | Ce qui a été remplacé |
| `Écrans kit` | Les copies des écrans qui ont reçu le kit, sous le nom de l'original, côte à côte dans l'ordre des parcours |
| `---` | Séparateur (page vide nommée de tirets), puis les pages d'écrans existantes, inchangées |

Pas de numéro devant les pages du kit : l'ordre de la liste suffit, et le préfixe `UI Kit · ` les regroupe parmi les pages du fichier. Un kit rangé avant la v0.8.0 (`00 Fondations` à `03 Organismes`, sections empilées) : Seiton renomme les pages et remet les sections sur une ligne au premier lot de la reprise, sans créer de nouvelles pages. Un kit rangé avant la v0.22.0 (`UI Kit · Fondations`, `Atomes`, `Molécules`, `Organismes`) : Seiton passe les noms des pages en anglais au premier lot de la reprise, puis refait la page `UI Kit · Foundations` selon les planches ci-dessous ; l'ancienne présentation part dans `Archives`.

Sont exclues de tous les comptages, instances comprises : `Couverture`, `Revue`, `Arborescence`, `Archives`, `Écrans kit`, les séparateurs (page vide, ou nommée uniquement de tirets ou d'astérisques) et les couvertures existantes quel que soit leur nom (« Cover », « Thumbnail »…).

## Kit existant
Selon `kitExistant` (`perimetre-valide.json`) :

| Valeur | Réponse | Pages du kit | Composants existants | Récapitulatifs |
|---|---|---|---|---|
| `complete` | Je le complète | Ses pages restent les pages du kit. Les pages du plugin qui manquent sont créées (Revue, Arborescence, Archives). Renommer ses pages en `UI Kit · …` est un point du récapitulatif | Gardés tels quels. Seuls ajouts : nouvelles familles, variantes et propriétés | Seulement les manques : familles absentes, variantes manquantes, valeurs des écrans sans variable ni style |
| `verifie` | Je le vérifie et je le complète | Idem | Retouchés **sans changer leur rendu** (ci-dessous), plus les ajouts | Les manques, puis les écarts du kit : valeurs non reliées, noms hors nomenclature, contrastes, états et focus manquants |
| `repris` | Je le reconstruis au propre | Pages du plugin ; ses pages passent dans `Archives` une fois vidées | Familles conformes déplacées telles quelles dans leur page de niveau ; les autres reconstruites à partir de copies. Variables et styles gardés, seulement renommés (une nouvelle valeur donne une nouvelle variable) | Tous les points, comme un fichier sans kit |
| `intact` | Je n'y touche pas | Ses pages passent après le séparateur | Ignorés | Comme un fichier sans kit |

**Pages du plugin déjà présentes** (`Couverture`, `Revue`, `Arborescence`, d'un chantier précédent) : jamais réutilisées ni ignorées sans question. Une question individuelle par page, au récapitulatif du périmètre : « La page {page} existe déjà. Qu'est-ce que je fais de cette page ? » Options : `Je la mets à jour (Recommandé)` ; `Je la refais` (l'ancienne part dans `Archives`) ; `Je n'y touche pas`. Une page supprimée depuis est recréée, sauf `Couverture` : le plugin n'en crée plus. Une `Couverture` d'un ancien chantier : options `Je la range dans Archives (Recommandé)` (la Revue en tient lieu) ; `Je n'y touche pas`. Les parcours de l'`Arborescence` existante sont montrés et recommandés au récapitulatif du périmètre, avant tout autre découpage.

**Famille conforme** : toutes ses valeurs reliées à une variable ou un style, nom et propriétés au format de `nomenclature.md`, contrastes réussis, états attendus présents.

**Retouche sans changer le rendu**, seule modification permise sur un composant existant : renommer (composant, propriété, calque) ; relier une valeur à une variable ou un style **de même valeur** ; ajouter une variante ou une propriété dont la valeur par défaut garde le rendu actuel ; déplacer une section ou un component set dans sa page de niveau (ses instances restent liées). Tout ce qui changerait le rendu de ses variantes (valeur, taille, structure) devient une nouvelle variante, ou un doute. Les instances des écrans suivent ces retouches sans changer d'apparence : les maquettes ne sont pas impactées.

## Classement atomique
- **Atome** : n'utilise aucun autre composant du kit (bouton, champ, badge). Seule règle mécanique. Une icône du kit ne compte pas pour ce classement (un bouton à icône reste un atome) ; les icônes elles-mêmes sont rangées dans `UI Kit · Foundations`.
- **Molécule** : assemble des atomes pour une seule fonction (champ avec label et aide, ligne de liste, carte simple).
- **Organisme** : région autonome d'une page (header, footer, formulaire complet, liste de cartes).

Hors atomes, le niveau est un jugement : il est proposé dans le récapitulatif de la phase, avec ces définitions. Une section propre à une seule page n'est pas un composant : elle reste dans l'écran, valeurs reliées seulement.

## Texte et langue des pages du kit
Pages `UI Kit · …` : tout le texte de présentation est **en anglais** (titres, sous-titres, étiquettes, en-têtes de tableau). Revue, Accessibilité, Arborescence et Archives restent en français : elles s'adressent au client.
**Pas d'interprétation.** On ne connaît pas les raisons des choix du designer : aucun paragraphe, aucune description, aucune explication d'usage. Seulement des titres, des sous-titres, des noms et des valeurs mesurées (nombres, px, hex, ratios). Le contenu des composants (textes du projet) n'est pas traduit.

## Mise en page commune
- Chaque page du kit commence par un cadre titre : fil `UI Kit → {page}`, nom de la page, `Updated {date}`. Pas de ligne de description.
- Une **section Figma** par famille (`Button`, `TextField`…), dans l'ordre alphabétique, **sur une seule ligne, de gauche à droite** : toutes alignées en haut, sous le cadre titre, à 160 px les unes des autres. Jamais empilées : une section qui grandit (une variante, un état de plus) s'étend vers le bas, sans recouvrir sa voisine. Les sections ne s'agrandissent pas seules : Seiton les redimensionne, puis recale à 160 px toutes celles qui suivent sur la ligne.
- **Composants interactifs** (Button, Link, Checkbox, Radio, Switch, Input, Textarea, Select…) : le component set est rangé **en tableau**. Colonnes = les états, dans l'ordre de `nomenclature.md` (`default`, `hover`, `pressed`, `focus`, `disabled`), puis `status=error`. Lignes = les variantes (`primary`, `secondary`, `tertiary` ; `checked=false`, `true`, `indeterminate`), regroupées par taille sous un intertitre (`lg`, `md`, `sm`) ; avec une icône, un second bloc de colonnes « avec icône ». Étiquettes des colonnes au-dessus et des lignes à gauche, hors du component set, dans la section, sur les styles du kit (étiquette). Écarts réguliers, cellules alignées.
- Dans chaque section : le component set, et au-dessus son nom seul. Un composant prévu pour fond sombre est présenté sur `color/bg/inverse`.
- Espacements réguliers entre sections. Rien ne se chevauche, rien ne traîne hors section.
- Les cadres de présentation utilisent les variables et styles du kit dès qu'ils existent. Ceux créés avant la phase 2 y passent dans le dernier lot de la phase 2, avant la recette : titres de page sur le style de titre le plus proche de 40, sous-titres sur le style de titre le plus proche de 22, titre de la Revue sur le plus grand style de titre du kit, texte courant sur le style de corps de 16, étiquettes, valeurs et tableaux sur le style d'étiquette ; couleurs sur les rôles de texte (défaut, atténué, accent pour les liens), de fond (défaut, surface) et de contour (discret). Un style ou un rôle absent du kit est un doute ; un changement de taille de plus de 4 px est listé dans le rapport du lot, puis montré à la recette.
- La date (`Updated`, « Mis à jour le » dans la Revue) d'un cadre titre est mise à jour en fin de phase, pour les pages écrites pendant la phase.

## UI Kit · Foundations
Une **planche** par fondation : un cadre en auto-layout sur `color/bg/default`, 1440 px de large (Colors et Grids s'élargissent à leur contenu), côte à côte de gauche à droite, alignées en haut, à 160 px. Dans cet ordre : `Colors`, `Typography`, `Spacing`, `Radius`, `Borders`, `Opacity`, `Shadows`, `Grids`, `Icons`. Une fondation sans variable ni style n'a pas de planche.
- **En-tête** de chaque planche, sur `color/bg/surface` : `Foundations → {planche}` en petit, le titre, puis une ligne de faits comptés (`31 variables · 1 mode`). Puis des blocs, chacun sous un sous-titre (`Primitives`, `Semantic`, `Text styles`…), séparés de 64 px.
- Chaque échantillon est relié à sa variable ou son style, et son calque porte le nom du jeton. Les valeurs écrites (hex, px, ratios) sont celles de la variable ou du style, relues au moment de l'écriture, jamais tapées de mémoire.
- Tri : par valeur croissante (paliers de couleur du plus clair au plus foncé), sauf les tableaux `Semantic`, par ordre alphabétique du jeton (les rôles d'un même état restent ensemble). Tableaux : en-têtes de colonnes en haut, une ligne par jeton, un trait `color/border/default` entre les lignes, colonnes alignées.
- Damier : deux carrés alternés `color/bg/default` et `color/bg/subtle`, 8 px, sous tout échantillon transparent.
- Toute variable ou tout style créé après la phase 2 est ajouté à sa planche dans le même lot.

**Colors**
- `Primitives` : une ligne par teinte, le nom de la teinte à gauche (`Neutral`, `Lime`), neutre d'abord, puis les teintes dans l'ordre des décisions. Une carte par palier : l'échantillon (96 × 56, rayon 8), puis dessous le palier (`500`) et le hex. Dans l'échantillon, le **contraste** du texte posé dessus : texte en `color/text/default` ou `color/text/inverse`, le plus contrasté des deux, marqué `AAA {ratio}` (7 et plus), `AA {ratio}` (4,5 et plus), `AA Large {ratio}` (3 et plus), sinon le ratio seul. Le marquage tient sur une ligne.
- Les paliers avec alpha (`900-a16`) : sur une ligne à part, `{Teinte} · alpha`, chaque échantillon sur damier, avec dessous l'alpha en pourcentage (`16 %`).
- `Semantic` : un tableau par groupe (`text`, `bg`, `border`, `icon`, `status`, `shadow`, `ring`…), colonnes `Token`, `Swatch`, `Alias`, `Value`, et un couple `Swatch` et `Value` par mode.

**Typography**
- `Font families` : une carte par famille (`font/family/*`), toutes à la même échelle (`Ag` 64, alphabet et chiffres en 17, sans retour à la ligne) : son nom, un grand `Ag`, l'alphabet en majuscules, en minuscules, les chiffres et `!@#$%&*()`, et à droite les graisses que les styles emploient (`Aa`, `Regular · 400`).
- `Text styles` : une ligne par style, groupés par rôle (`display`, `heading`, `body`, `label`, puis les autres), du plus grand au plus petit. À gauche le nom du style, au centre son nom court écrit dans le style (`Heading xl`), à droite `Size 46 · Line height 50 · Letter spacing -1 · Bold`. Seulement les styles qui existent : aucune graisse ni taille ajoutée pour remplir.

**Spacing** : un tableau `Name`, `Pixels`, et une barre de la largeur de la valeur, en `color/bg/accent`.

**Radius** : une rangée de cartes 120 × 120, une par rayon, son nom dedans ; puis un tableau `Name`, `Pixels`, et un coin (rectangle 80 × 40, contour haut et droit, rayon appliqué en haut à droite).

**Borders** : un tableau `Name`, `Pixels`, et un trait de cette épaisseur.

**Opacity** : un tableau `Name`, `Value`, et un carré `color/text/default` à cette opacité sur damier.

**Shadows** : une carte 200 × 120 par style d'effet, sur `color/bg/surface`, puis dessous son nom et, par calque, une ligne de mesures (`X 0 · Y 1 · Blur 2 · Spread 0`) et une ligne pour la couleur (`color/shadow/sm-1`), jamais coupée au milieu d'un nom. Un flou d'arrière-plan : sa carte posée sur damier, pour qu'on voie le flou.

**Grids** : un cadre par style de grille, à la largeur du point de rupture, 400 px de haut, le style appliqué, titré `{point de rupture} · {largeur} px`. Les grilles de mise en page ne s'affichent ni en capture ni en export : dans le cadre, chaque colonne de la grille (et chaque zone : barre latérale, contenu) est aussi dessinée en rectangle `color/bg/accent-subtle` (sinon le fond accent le plus clair), marges et gouttières laissées vides. Dessous, les cotes tirées des variables `layout` : `Columns`, `Gutter`, `Margin`, `Content` (et les autres variables du point de rupture).

**Icons**
- En-tête : faits seulement, tirés des décisions et des comptages : `{bibliothèque} · {style} · {n} icons · {tailles} px · stroke {trait}`.
- `Sizes` : la première icône par ordre alphabétique, à chaque taille décidée, avec la taille dessous.
- `All icons` : toutes les icônes du kit, les composants eux-mêmes, en grille de 4 colonnes, l'icône à 24 px et son nom à droite. Groupées sous des sous-titres par catégorie quand la bibliothèque d'origine publie ses catégories (relevées sur sa source officielle, notées dans `ids.json`) ; sinon un seul bloc, par ordre alphabétique.

## Revue
- En tête : nom du projet, nombre d'écrans de référence, chiffres « avant » jusqu'à la clôture, puis « avant → après » (`controles.md`, Compteurs), date du dernier passage, liens vers chaque page du kit. Pas de page Couverture séparée : la Revue en tient lieu.
- Chaque passage de fin de phase met à jour toutes les cartes, celles des phases passées comprises (chiffres, état).
- Trois colonnes : **Fait** (créé), **Ajusté** (corrigé, fusionné, relié), **À décider** (questions reportées ou avec le client).
- Une carte par famille (« Button : 3 doublons fusionnés, 2 états ajoutés »), sans numéro de lot, avec un lien vers la section (la première dans l'ordre de la page si la carte en couvre plusieurs). Le titre peut passer à la ligne.
- Pas de paragraphe.
- **Décisions du kit**, sous les trois colonnes : une ligne par décision, `{thème} · {décision} · {date}`, cadre `section/Décisions du kit`. Seulement les décisions qu'on ne voit pas dans le kit lui-même et qu'une reprise reposerait sinon : périmètre et exclusions, arborescence, police, règles de dérivation des états, exceptions d'échelle, noms gardés hors format, points à trancher en appliquant le kit aux écrans, points reportés. Pas ce qui se voit dans les composants (un état ajouté, un nom corrigé). Environ 10 à 15 lignes. Mis à jour à chaque passage de la Revue. C'est la mémoire du projet qui voyage avec le fichier : `uikit.md` reste le détail, sur la machine du chantier.

## Accessibilité
- En tête, en évidence : l'avertissement de `katiro-ui-kit-accessibilite` (une aide, pas un audit, ni taux ni déclaration de conformité ; audit par un expert pour aller plus loin), puis « RGAA 4.1.2 · {date} · Agent Hairyo (Design Accessibility RGAA) de Katiro Studio ».
- Trois colonnes : **À corriger** (une carte par critère : intitulé court, constat, correction, lien vers un exemple et vers le critère), **À prévoir pour le développement** (une carte par écran ou « Tous les écrans »), **Respecté sur la maquette** (une carte, la liste des critères).
- Une ligne en pied : « {n} critères non évaluables sur maquette, {n} non applicables : voir accessibilite-rgaa.md ».
- Recréée à chaque lancement, l'ancienne version part dans `Archives`. Elle ne touche ni le kit ni les écrans.

## Arborescence
- En tête : « {n} écrans de référence · {e} espaces · relevé du {date} ». Les écrans exclus sont seulement comptés.
- **Une arborescence par espace d'accès** (public, client connecté, administration…), jamais plus : les sous-parties d'un espace (pages légales, demandes, prospection) sont des branches de son arbre, pas des arborescences séparées.
- **Un arbre de profondeur**, tiré de `arbre` (`perimetre-valide.json`) : la racine de chaque espace est son écran d'entrée (accueil du site, connexion, ou tableau de bord sans écran de connexion), puis les écrans qu'il ouvre, puis leurs enfants un niveau plus bas, autant de niveaux que la navigation (un article est sous la page Blog, « Demande · Nouvelle » sous « Demandes »). En auto-layout, traits simples du parent vers ses enfants, recalculés à chaque passage (les connecteurs n'existent pas en Figma Design).
- Chaque écran : son nom et un lien vers l'écran d'origine (et vers sa copie dans `Écrans kit` une fois le kit appliqué), dans une case de texte.
- **Un schéma de noms, jamais d'image** : aucune vignette, capture, copie ni instance d'écran. Les écrans évoluent : une image serait vite fausse.

## Archives
- Un cadre `{écran}` par écran qui a reçu le kit ; l'élément y garde sa taille d'origine (fixée avant le déplacement).
- Chaque élément porte une étiquette : « Remplacé par {nom} · D{n} · {date} », D{n} étant la décision qui fixe ce remplacement.
- Rien n'y est supprimé par l'agent. Le vidage est une décision de l'utilisateur, faite à la main.
