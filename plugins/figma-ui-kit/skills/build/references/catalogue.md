# Catalogue de référence

Ce que Seiri cherche dans les écrans, pour ne jamais partir à l'aveugle. C'est une **référence, pas une limite** : on réinvente rarement un composant, on lui donne un style ; mais un fichier a toujours des éléments propres, et tout bloc trouvé hors du catalogue entre dans l'inventaire comme **spécifique**, au même titre que les autres. Un élément du catalogue absent des écrans n'est jamais construit sans décision.

## Reconnaître sans les noms
Beaucoup de fichiers gardent les noms générés par Figma ou ceux d'un kit copié (`Group 13`, `Frame 1022`, `Layer 36400`, `Button copy 4`). **Un nom de calque ne prouve rien.** Chaque élément se reconnaît, dans cet ordre de poids :
1. **Structure** : types des enfants, leur nombre et leur disposition, proportions, taille (tolérance de 4 px), auto-layout, répétition.
2. **Contenu** : le texte affiché (« Ajouter au panier », « Mot de passe », « 12,90 € », « J'aime »), les formes (étoile, chevron, croix, coche), une image ou des initiales.
3. **Contexte** : position dans l'écran (en tête sur toute la largeur, colonne à gauche sur toute la hauteur, centré au-dessus d'un voile), voisins (un libellé au-dessus, un message dessous), répétition dans une rangée ou une colonne.
4. **Nom** : seulement en appoint, quand il est explicite (`button`, `input`, `card`, nom d'un composant d'une bibliothèque connue) ; jamais seul.

Une reconnaissance qui ne tient qu'à un indice a la confiance `faible` : le bloc reste dans l'inventaire, en `a-trancher` si rien d'autre ne le confirme. Les seuils sont des repères, pas des règles : un champ de 64 px de haut reste un champ.

## Le socle, cherché dans tout fichier
### Atomes
| Élément | Reconnaissance (structure · contenu · contexte) |
|---|---|
| `Button` | Cadre court, 24 à 64 px de haut, remplissage ou contour, padding horizontal, un texte d'une ligne (verbe ou action), icône facultative ; souvent en bas d'un formulaire ou d'une carte |
| `IconButton` | Carré ou cercle de 24 à 56 px, une seule icône, remplissage, contour ou rien ; souvent répété dans une barre d'outils ou un en-tête |
| `Link` | Texte seul, d'une couleur d'accent ou souligné, dans un paragraphe, un menu ou un pied de page |
| `Input` | Cadre large, 32 à 64 px de haut, contour ou fond atténué, un texte atténué (exemple ou consigne), parfois une icône à gauche ou à droite ; un libellé au-dessus |
| `Textarea` | Comme `Input`, plus haut (80 px et plus), texte en haut à gauche |
| `Select` | Comme `Input`, avec un chevron vers le bas à droite |
| `Checkbox` | Carré de 14 à 24 px avec contour, coché ou non, suivi d'un texte |
| `Radio` | Cercle de 14 à 24 px avec contour, plein au centre s'il est choisi, en groupe vertical ou horizontal |
| `Switch` | Pilule environ deux fois plus large que haute, un cercle dedans à gauche ou à droite |
| `Slider` | Piste horizontale fine, une partie remplie, une poignée ronde |
| `Badge` | Petite pilule ou cercle, un nombre ou un mot court, posé sur un coin d'icône ou à côté d'un titre |
| `Tag` | Pilule avec un mot ou deux, fond atténué, parfois une croix ; en groupe sur une ligne |
| `Avatar` | Cercle (ou carré arrondi) avec une photo ou des initiales, 24 à 96 px |
| `Logo` | Voir `controles.md`, « Logo de la marque » |
| `Divider` | Trait ou rectangle de 1 ou 2 px d'épaisseur, large ou haut |
| `Tooltip` | Petite bulle sombre ou claire, texte court, souvent une pointe |
| `Spinner` | Cercle ou arc seul, souvent dans un bouton ou un état de chargement |
| `ProgressBar` | Deux pilules superposées : une piste et un remplissage partiel ; parfois un pourcentage |
| `Skeleton` | Rectangles gris arrondis à la place d'un texte ou d'une image |
| Icônes | Vecteurs dans un carré de 12 à 32 px (`controles.md`, « Icônes ») ; rangées dans les Foundations |

### Molécules
| Élément | Reconnaissance |
|---|---|
| `FormField` | Un libellé, un champ (`Input`, `Select`, `Textarea`), et parfois une aide ou une erreur dessous, empilés |
| `SearchBar` | Champ avec une loupe, parfois un bouton ; en en-tête ou en haut d'une liste ; texte « Rechercher » |
| `Tabs` | Rangée de textes courts, l'un marqué (soulignement, fond, gras) ; contenu changeant dessous |
| `SegmentedControl` | Pilule découpée en 2 à 5 parts, une seule remplie |
| `Breadcrumb` | Rangée de liens séparés par des chevrons ou des barres obliques, le dernier non lié |
| `Pagination` | Rangée de nombres dans des carrés, un marqué, des flèches aux bouts |
| `Card` | Conteneur avec rayon, contour ou ombre, qui groupe une image, un titre, un texte et une action ; souvent répété en grille |
| `ListItem` | Rangée répétée : icône ou avatar, un ou deux textes, une action ou un chevron à droite |
| `Alert` | Bandeau coloré (info, succès, alerte, erreur) avec icône, texte et parfois une croix |
| `Toast` | Petite carte flottante en coin d'écran, texte court, parfois une action |
| `Dropdown` | Liste d'options sous un champ ou un bouton, avec ombre ; une option survolée ou cochée |
| `Stepper` | Étapes numérotées ou à pastilles reliées par un trait, l'une active |
| `EmptyState` | Illustration ou icône centrée, un titre, un texte, souvent un bouton, à la place d'une liste |
| `Accordion` | Rangées repliables : titre et chevron, une rangée ouverte avec son texte |
| `StatCard` | Carte avec un grand nombre, un libellé, parfois une variation (+12 %) |

### Organismes
| Élément | Reconnaissance |
|---|---|
| `Header` | Bande pleine largeur en haut : logo, liens de navigation, actions (connexion, panier, avatar) ; identique d'un écran à l'autre |
| `Footer` | Bande pleine largeur en bas : colonnes de liens, logo, mentions, réseaux sociaux |
| `Sidebar` | Colonne pleine hauteur à gauche : logo, liste verticale de liens avec icônes, un lien actif |
| `Modal` | Boîte centrée au-dessus d'un voile sombre, titre, contenu, actions en bas, souvent une croix |
| `Drawer` | Panneau pleine hauteur qui glisse d'un bord, au-dessus d'un voile |
| `DataTable` | Grille de rangées alignées en colonnes, une rangée d'en-tête, parfois cases à cocher, tri, actions par rangée |
| `Form` | Suite de `FormField` et une action de validation, dans un cadre ou une page |

### États, cherchés pour chaque élément interactif
`hover`, `pressed`, `focus`, `disabled`, sélectionné, erreur ; et pour les écrans : vide, chargement, erreur, succès. Un état attendu absent n'est pas un défaut des maquettes : c'est un point à proposer (`controles.md`, conventions).

## Les spécifiques, selon le type de produit
Seiri déduit le ou les types du fichier au survol, d'après le contenu des textes et les structures, jamais d'après les noms (`survol.json`, `typeProduit`). Un fichier peut en avoir plusieurs (un SaaS et son site vitrine). Indices de chaque type, puis ce qu'on y cherche en plus du socle.

**E-commerce**. Indices : prix avec devise, « Ajouter au panier », « Commander », « Livraison », « Taille », « Stock ».
- Molécules : `ProductCard` (image, nom, prix, note), `Price` (prix, ancien prix barré, remise), `Rating` (5 étoiles répétées, nombre d'avis), `QuantityStepper` (moins, nombre, plus), `VariantSelector` (pastilles de couleur, boutons de taille), `CartLine`, `PromoBanner`, `FilterGroup`, `SortSelect`, `StockStatus`.
- Organismes : `ProductGallery` (grande image et vignettes), `ProductGrid`, `FilterPanel`, `MiniCart`, `CheckoutSteps`, `OrderSummary`, `ReviewList`.
- États attendus : rupture de stock, panier vide, ajout confirmé.

**SaaS ou outil métier**. Indices : « Tableau de bord », « Paramètres », « Utilisateurs », « Abonnement », « Exporter », barre latérale, tableaux.
- Molécules : `StatCard`, `ChartCard` (titre, légende, zone de graphique), `FilterBar`, `DatePicker`, `FileUpload` (zone de dépôt), `UserMenu`, `NotificationItem`, `PlanCard`, `StatusBadge`.
- Organismes : `Sidebar`, `DataTable`, `SettingsSection`, `PageHeader` (titre, fil d'Ariane, actions), `OnboardingSteps`, `CommandMenu`.
- États attendus : liste vide, chargement, erreur, droits insuffisants.

**Communauté ou réseau**. Indices : « Publier », « Commentaires », « J'aime », « Abonnés », « Suivre », « Message ».
- Molécules : `PostHeader` (avatar, nom, date), `ReactionBar` (j'aime, commentaire, partage, compteurs), `Comment`, `FollowButton`, `AvatarGroup`, `MessageBubble`, `Composer` (zone de saisie et envoi), `NotificationItem`.
- Organismes : `FeedPost`, `Feed`, `ProfileHeader` (couverture, avatar, chiffres, actions), `CommentThread`, `Conversation`.
- États attendus : fil vide, publication supprimée, profil privé.

**Site vitrine, marketing ou contenu**. Indices : grandes sections empilées, « Contact », « Tarifs », « Demander une démo », témoignages, articles.
- Molécules : `FeatureItem` (icône, titre, texte), `Testimonial`, `PricingCard`, `FaqItem`, `ArticleCard`, `LogoTile`, `StatItem`, `StepItem`, `NewsletterForm`.
- Organismes : `Hero`, `FeatureGrid`, `TestimonialList`, `PricingTable`, `Faq`, `CtaBand`, `LogoCloud`, `StatsBand`, `Steps`, `ContactForm`, `ArticleList`.

**Autre** (réservation, éducation, santé, finance…) : le socle seul, puis tout ce qui se répète devient spécifique. Les indices de ces fichiers sont notés dans `typeProduit`, pour enrichir ce catalogue plus tard.

## Un même élément sous plusieurs formes
Pour chaque élément trouvé, Seiri compte ses **formes** : les groupes de blocs de même rôle dont la structure ou le style diffère (`inventaire.json`, `formes`). Chaque forme a ses occurrences, ses écrans, et ce qui la distingue des autres, mesuré (teinte et ΔE 2000, rayon, hauteur, typo, structure).
- **Mutualiser** (harmoniser vers une seule forme) : même structure, écarts de style faibles (ΔE sous 5, rayon ou hauteur à 4 px près, taille de texte à 2 px près), ou une forme dominante (80 % des emplois au moins) avec des formes rares. Presque toujours une incohérence née de copies.
- **En faire une variante** : différence voulue et répétée : autre taille, autre hiérarchie (principal, secondaire), autre structure (avec ou sans icône), autre état, chacune employée sur plusieurs écrans.
- **Garder distincts** : deux rôles différents qui se ressemblent (un `Tag` et un `Badge`, un `Button` et un `Link` en forme de bouton).
La recommandation suit la mesure ; l'utilisateur tranche (récapitulatif). Le diagnostic montre ces formes sans rien trancher : « Bouton principal : 4 formes, dont 1 pour 90 % des emplois ».
