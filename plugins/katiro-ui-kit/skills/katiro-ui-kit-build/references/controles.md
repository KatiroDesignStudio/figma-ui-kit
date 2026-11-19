# Contrôles

Seiri mesure. Kanshu transforme chaque constat en point à valider, sauf quand une décision ou une convention le couvre déjà.
Tous les calculs sont faits par du code dans `use_figma`, jamais à l'œil. Dans une instance, seules les modifications locales comptent : ce qui vient du composant principal est compté une fois, sur le composant.

## Unités de mesure
- **Propriété** : un remplissage visible, une couleur de contour, une épaisseur de contour (côté par côté : `strokeTopWeight`, `strokeRightWeight`, `strokeBottomWeight`, `strokeLeftWeight`, pas `strokeWeight`), un côté de padding, un écart d'auto-layout, un rayon, un effet (ombre, flou), une opacité différente de 100 %, un segment de texte pour la typo.
- **Part reliée** : propriétés reliées à une variable ou un style, divisées par toutes les propriétés. Donne aussi la part par variable et la part par style.
- **Nœud compté** : visible avec visibilité héritée (lui et tous ses parents visibles), parcouru depuis chaque écran ou section ; une instance compte pour 1, ses enfants ne comptent pas. Hors de tous les compteurs et contrôles : les remplissages image, le cadre d'un component set (fond, rayon, contour de présentation) et le décor (conventions plus bas).
- **Motif décoratif massif** : plus de 500 nœuds identiques (même type, même taille, même remplissage) dans un même cadre. Compté à part : la part reliée est donnée avec et sans, et le motif devient un constat.
- **Échelle** : multiples de 4 (2 toléré sous 8) pour les espacements et les rayons, rayon plein exclu. Tailles de texte : présentes dans un style. Épaisseurs de trait non entières : signalées.

## Catalogue
| Contrôle | Ce que Seiri cherche | Méthode | Phase |
|---|---|---|---|
| Valeurs en dur | Couleur, espacement, rayon, bordure, opacité, ombre, typo non reliés à une variable ou un style | Parcours propriété par propriété | 2, puis chaque lot |
| Textes sans style | Textes sans style de texte | Parcours des textes | 2 |
| Nuances proches | Couleurs différentes mais presque identiques | ΔE 2000 par paliers : moins de 1, quasi identiques (un seul point) ; de 1 à 3, erreur probable ; de 3 à 5, seulement si même type de propriété et même contexte. Rampes cohérentes exclues, regroupement par grappes | 2 |
| Échelles | Valeurs hors échelle pour espacements, rayons, tailles de texte, épaisseurs | Histogramme, puis la règle d'échelle des unités de mesure | 2 |
| Polices | Familles et graisses, avec leur nombre d'emplois | Comptage | 2 |
| Icônes | Familles mélangées, tailles hétérogènes, contour et plein mélangés, icônes qui ne sont pas des composants | Formes comptées une fois (pas les emplois), nom recoupé avec les noms de calques, tailles, épaisseurs de trait | 2 |
| Grilles | Marges, contenu, colonnes et gouttières, par largeur d'écran et par espace | 1. Conteneur de contenu : décalage et largeur récurrents des blocs de premier niveau. 2. Colonnes : dans ce conteneur, chaque rangée de frères (auto-layout horizontal, ou même y avec écarts égaux) donne ses largeurs et son écart. L'écart le plus fréquent est la gouttière candidate. Pour 12, 8, 6 et 4 colonnes, largeur de colonne = (contenu − gouttière × (n − 1)) / n ; une rangée tombe sur la grille si chaque largeur vaut k colonnes + (k − 1) gouttières, à 1 px près. Grille candidate : celle qui couvre le plus de rangées, avec ce taux (« 9 rangées sur 9 : 12 colonnes de 80, gouttière 16, contenu 1136 »). Rangées hors grille listées. Une grille candidate n'est proposée qu'avec au moins 3 rangées couvertes sur au moins 2 écrans ; sinon, seulement le conteneur. Une rangée qui couvre toute la largeur avec un écart différent de la gouttière (élément de liste, bloc en deux parties) est listée à part, sans faire baisser le taux | 2 |
| Modes | Variable sémantique qui ne pointe pas vers une primitive ; valeur sombre identique à la valeur claire | Lecture des collections | 2 |
| Contraste | Sous WCAG 2.2 AA : 4,5:1 texte courant, 3:1 grand texte, éléments d'interface et anneau de focus | Fond réel : remonter les parents, en composant aussi les frères placés dessous (image ou dégradé en position absolue), jusqu'au premier remplissage opaque, avec les opacités des remplissages et des parents, chaque mode évalué. Dégradé ou flou sur fond plein : ratio par intervalle sur les arrêts du dégradé. Vecteurs : fond pris sous la boîte englobante, résultat marqué approximatif. Exclus : `disabled` et les exemptions des conventions. À part : placeholders. Photo : « indéterminé », donc point à valider | 2 (paires texte et fond des variables), puis lot |
| Règles de contenu | Forme des libellés d'action, casse, ponctuation, langue, mots différents pour la même action (« Valider », « Confirmer », « OK »), coquilles, textes factices | Bouton ou lien : instance d'un composant de bouton, calque ou parent nommé `button`, `btn`, `cta`, `link`, `lien`, ou cadre court à texte d'une ligne avec fond ou contour, ou texte seul dans un menu ou un pied de page. Tags, badges et titres de section ne sont pas des actions. Formes : infinitif (« Envoyer », « Voir le site »), impératif (« Envoyez », « Contactez-nous »), nom (« Contact », « Filtres »), autre (« OK »). Classement incertain : doute de mesure | 2 (règles), lot (kit), katiro-ui-kit-templates (écrans) |
| États | Matrice composant × état : `hover`, `focus`, `disabled`, `selected`, `error` manquants ; état présent mais sans différence visible avec `default` (mêmes remplissages, contours, couleur et décoration de texte, effets, opacité) | Variantes présentes, puis comparaison propriété par propriété avec `default` | 3 à 5 (création selon la règle de dérivation de la phase 2) |
| Focus visible | Composant interactif sans état `focus` ou à l'anneau trop peu contrasté | Variantes, contraste | 3 à 5 |
| Cibles tactiles | Zone cliquable de moins de 24 × 24 (WCAG 2.5.8) ; sur mobile, moins de 44 | Dimensions | 3 à 5 |
| Robustesse | Composant sans auto-layout, redimensionnement incohérent (hug, fill), texte qui ne passe pas à la ligne ; structure qui change d'une variante à l'autre (calques, ordre, sens d'auto-layout) ; hauteur hors de l'échelle de 4 ; composant à une seule valeur figée (barre de progression pleine, sans propriété de valeur) ; deux parties qui doivent se distinguer et ont la même couleur (piste et indicateur) ; icône dessinée en vecteurs dans un composant au lieu d'une instance de l'icône du kit | Propriétés de mise en page, liste des calques par variante | 3 à 5 |
| Débordement | Après un changement de style de texte ou de variable de taille : texte qui dépasse ou se coupe dans une variante à hauteur ou largeur fixe | Pour chaque composant qui emploie le style ou la variable, hauteur du contenu comparée au cadre | Chaque lot qui change une fondation |
| Fondations inutilisées | Variables et styles employés par aucun composant du kit (styles d'effet compris) | Comptage des emplois dans le kit ; recompté quand le kit est appliqué aux écrans | 2 (fin), puis 6 |
| Rôles en double | Rôles `semantic` qui aboutissent à des couleurs presque identiques (ΔE 2000 sous 3) | Résolution des alias, mode par mode | 2 (fin) |
| Interlignes serrés | Style de texte sur plusieurs lignes dont l'interligne est sous 1,1 fois la taille | Lecture des styles, textes à plusieurs lignes dans le kit et les écrans | 2 (fin) |
| Champs de formulaire | Label visible, emplacements pour l'aide et l'erreur, marque d'obligation | Structure, cherchée d'abord au niveau au-dessus : un atome de champ seul est conforme si une molécule porte l'étiquette, l'aide et l'erreur | 3 à 5 |
| Composants hors kit | Composants principaux dans les pages d'écrans | Liste par page | 3 à 5 |
| Bibliothèques externes | Instances de composants venus d'un autre fichier | Comptage par composant (nom, clé) | 2 |
| Même écran sur deux pages | Copie exacte, variante ou itération d'un écran retenu | Retirer les textes communs à tous les écrans retenus, indice de Jaccard sur les textes (ressemblance à partir de 0,15), puis comparaison nœud à nœud ; mesurer depuis la page de l'écran retenu (les autres pages se chargent partiellement) | 0 |
| Doublons | Composants de même rôle et de rendu proche | Signature (types, tailles arrondies, nombre d'enfants, styles) hachée et regroupée. Options : `Fusionner`, `En faire une variante`, `Garder distincts` | 3 à 5 |
| Copies détachées | Groupes qui reproduisent un composant sans en être une instance | D'abord `detachedInfo` (composant d'origine exact), puis signature | 3 à 5, puis katiro-ui-kit-templates |
| Inventaire | Tous les blocs des écrans retenus, avant toute famille, en parcourant cette liste de types un par un pour chaque écran : **actions** (boutons, boutons icônes, liens, menus déroulants, onglets, segments, pagination, fil d'Ariane) ; **saisie** (champs, zones de texte, listes, recherche, cases, boutons radio, interrupteurs, curseurs, dates, téléversement) ; **affichage** (badges, étiquettes, avatars, barres de progression, indicateurs, chiffres clés, info-bulles, notifications, alertes, encadrés) ; **conteneurs** (cartes, lignes de liste, tableaux de données, accordéons, fenêtres, panneaux, listes de cartes) ; **navigation** (en-têtes, barres latérales, pieds de page, menus) ; **états** (vide, chargement, erreur, réussite, désactivé) ; **sections de page** (hero, avantages, étapes, avis, tarifs, questions fréquentes, appel à l'action, logos, chiffres). Un élément interactif compte même présent une seule fois. Un type de la liste absent de tous les écrans est noté « non vu » | Parcours de chaque écran, signature (types, tailles arrondies, nombre d'enfants, styles) regroupée ; pour chaque bloc, ses variantes observées (différences de structure, de taille, de contenu optionnel, d'état visible). Chaque bloc reçoit un statut : relié à une famille, hors kit (motif écrit) ou à trancher. Aucun bloc écarté sans motif | 1 (scan), puis chaque scan delta |
| Couverture de l'inventaire | Famille validée absente du kit ; variante observée absente de sa famille ; bloc sans statut | Comparaison de `scan/inventaire.json` au kit. Taux de couverture : calques des écrans compris dans un bloc relié à une famille construite, sur tous les calques des écrans | Contrôle de fin de niveau ou de tout le kit, et clôture |
| Structures répétées | Blocs répétés sans composant : header, footer, cartes, lignes de liste, modales | Tirées de l'inventaire : signature, position récurrente | 3 à 5 (en tête de chaque scan delta) |
| Nommage | Calques générés par Figma, noms hors nomenclature | `nomenclature.md` | Chaque lot |

## Questions de cadrage de chaque phase
Points du récapitulatif (de phase en mode fin, global en mode express), avant les constats :
- **2 Fondations** : bibliothèques externes (garder la bibliothèque, ses instances restent ; ou reconstruire ses composants dans le kit), correspondances avec le kit existant, noms des primitives (teinte, cran), points de rupture et grille de chaque point de rupture (colonnes, gouttière, marge, contenu : la grille candidate et son taux, ou le seul conteneur), famille et taille des icônes, et leur source (lien officiel de la bibliothèque, version et licence ; Kanshu les relève sur la source officielle, sinon « non relevée »), règles de contenu (forme des actions, casse, vocabulaire), valeurs des effets ; couleur du focus (question individuelle : une couleur d'accent dédiée, différente des composants, recommandée par la mesure du contraste 3:1 contre chaque fond de composant et de page) ; rendu des erreurs (convention ci-dessous, à proposer si les maquettes n'en ont pas) ; règle de dérivation des états pour tous les cas : fond coloré (recommandé : survol un cran plus foncé, appui deux crans), fond blanc et sans fond (recommandé : survol sur le fond atténué, appui sur le fond accentué), lien texte (recommandé : souligné au survol) ; `focus` et `disabled` communs.
- **3 à 5** : en tête, l'**inventaire du niveau** (`structure-figma.md`, « Classement atomique ») : chaque famille proposée avec ses blocs, ses occurrences, ses écrans et toutes ses variantes observées ; puis les blocs hors kit, chacun avec son motif ; puis les blocs à trancher. L'utilisateur valide la liste avant toute construction : une variante observée qu'on ne construit pas est un point du récapitulatif, jamais un oubli. Puis un récapitulatif par lot de familles, avec pour chacune son nom, son niveau (sauf atome mécanique), ses axes de variantes (propriétés et valeurs, correspondance des tailles existantes), son passage en auto-layout, et par variante les couleurs qui n'ont pas encore de rôle (contours, titres, halos par ton) et la variante de référence qui donne le libellé et l'icône par défaut du set. Champs de formulaire : style et couleur du texte d'aide et du texte d'erreur, contour en `focus` + `error`.

## Ce qui n'est pas une question (exécution)
Décisions et règles déjà prises :
- Relier une valeur à la variable qu'une décision a fixée pour elle ; appliquer le format de nommage à un nom décidé ; construire un composant selon son récapitulatif (nom, niveau, axes, auto-layout).
- Ranger dans `UI Kit · Atoms` un composant qui n'utilise aucun autre composant du kit (classement : `structure-figma.md`).
- Mettre en place la structure des pages, de la Revue et de l'Arborescence ; passer les cadres de présentation sur les styles et rôles du kit dans le dernier lot de la phase 2 ; mettre à jour en fin de phase la date des cadres titres des pages écrites.
- Créer un état manquant avec la règle de dérivation décidée en phase 2.
- Structure identique dans toutes les variantes d'un set : mêmes calques, même ordre, même sens d'auto-layout. Un élément propre à certaines variantes (icône d'erreur) existe dans toutes, masqué là où il ne sert pas.

Conventions techniques, qui ne changent pas le rendu, appliquées par défaut :
- Nommage : crans au-delà du dernier, rôles d'état, titre bicolore, vocabulaire de calques (`nomenclature.md`).
- Une seule couleur par rôle : une couleur nouvelle passe par un nouveau rôle. Couleur d'effet : rôle `semantic` qui pointe vers une primitive avec alpha.
- Un style d'effet par calque : le second effet va sur un calque intérieur.
- Focus : un calque `focus-ring`, cadre en position absolue autour du composant, décalé de 2 px (le fond se voit entre le composant et l'anneau), contour de 2 px `color/border/focus`, rayon du composant plus 2. Même rendu avec ou sans fond. Jamais d'ombre portée ni de « rogner le contenu ». `color/border/focus` est une couleur d'accent dédiée, jamais celle d'un composant : 3:1 au moins contre le fond du composant **et** contre chaque fond de page où il s'affiche (WCAG 2.4.11), mesuré sur les composants foncés comme clairs.
- Erreur : jamais signalée par la couleur seule (WCAG 1.4.1) : contour de 2 px `color/border/danger`, icône d'erreur et message sous le champ (`error-message`), contraste 4,5:1 du message. Champs, cases, radios et sélecteurs sans état d'erreur dans les maquettes : l'état est proposé au récapitulatif, pas ignoré.
- Hauteur relevée inatteignable par un padding de l'échelle ((hauteur − texte) / 2 hors échelle) : hauteur fixe sur la valeur relevée, padding vertical sur la variable la plus proche en dessous.
- Conteneur d'un seul atome répété : structure fixe (pagination, flèches de carrousel) = composant ; liste de longueur variable (groupe de tags, filtres, liste à puces) = auto-layout dans le parent.
- Carte cliquable : pas d'état propre, survol et focus portés par le bouton qu'elle contient. Numéro décoratif : exempté du contraste.
- Décor dans un composant (dégradés, lueurs, halos, voiles) : valeurs fixes, listées dans la description du composant, hors compteur de valeurs en dur.
- Un libellé et une icône par défaut par set (Figma partage les propriétés texte et d'échange entre variantes), pris dans la variante de référence.
- Textes factices (lorem ipsum, noms ou chiffres d'exemple) : jamais dans le kit, remplacés par des exemples neutres ; dans les écrans, laissés et listés « avec le client ».

## Compteurs (avant → après)
Calculés par Seiri, sur le kit et sur les écrans du périmètre, **séparément**, et gardés écran par écran dans le scan. Sans kit local, les compteurs du kit sont « sans objet ».

Consolidation : couleurs uniques, tailles de texte, valeurs d'espacement, valeurs de rayon, familles et graisses de police, familles d'icônes, composants. **Composants** : avant, composants principaux et copies détachées ; dans le kit, component sets et composants simples, variantes comptées à part (un composant simple compte pour 1 variante). Partout la même formule : « {n} composants, {v} variantes ».

Qualité :
1. Part des propriétés reliées à une variable ou un style (en %)
2. Textes sans style
3. Doublons
4. Copies détachées
5. Contrastes en échec
6. Noms hors nomenclature
7. Écrans seulement : part des nœuds qui sont des instances du kit (en %)
8. Inventaire : {b} blocs, {f} familles, {h} hors kit, {t} à trancher, couverture des écrans par les familles du kit (en %)

Les questions ouvertes sont suivies par Kanshu dans `uikit.md`, hors compteurs.
Objectif affiché : 100 % de propriétés reliées dans le kit, décor exclu.
