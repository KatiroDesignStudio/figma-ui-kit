# Comment fonctionne Katiro UI Kit

Trois schémas pour comprendre le plugin : qui fait quoi, le parcours complet avec ce qu'il livre, et la boucle de chaque étape.

## 1. Qui fait quoi

Shindan, Kanshu et Hairyo sont trois rôles de la même conversation, un par commande : ce sont les seuls qui te parlent, et ils ne font rien sans ton accord. Ils partagent un seul état, `uikit.md` et le dossier `.uikit/` du chantier : ce que l'un relève sert à l'autre. Ils confient le travail à quatre agents partagés, un par compétence, qui ne décident jamais. Chaque rôle n'appelle que ceux dont il a besoin.

```mermaid
flowchart TB
    U(["Toi<br/>designer, lead ou client"])

    subgraph managers["Ceux qui te parlent"]
        direction LR
        SH["<b>Shindan</b><br/>Figma Auditor<br/>mesure l'état du fichier"]
        K["<b>Kanshu</b><br/>Design System Manager<br/>te fait valider, pilote, arbitre"]
        HA["<b>Hairyo</b><br/>Accessibility Designer<br/>recommande, sans rien modifier"]
    end

    subgraph equipe["Les agents de travail, qui ne décident jamais"]
        direction LR
        SI["<b>Seiri</b> · Design System Analyst<br/>Sonnet · lecture seule<br/>survol, scan, inventaire, bilan"]
        ST["<b>Seiton</b> · Figma Component Builder<br/>Sonnet puis Opus<br/>construit ce qui est validé"]
        SO["<b>Seiso</b> · Design System Optimizer<br/>Sonnet<br/>Revue et Suivi, après chaque recette"]
        SK["<b>Seiketsu</b> · Design System Reviewer<br/>Sonnet · lecture seule<br/>vérifie avant chaque recette"]
    end

    U <-->|"questions,<br/>validations, recettes"| K
    U <-->|"rapport"| SH
    U <-->|"recommandations"| HA
    K --> SI
    K --> ST
    K --> SO
    K --> SK
    SH --> SI
    HA --> SI
    HA --> SO
```

Les noms suivent les 5S japonais : Seiri (trier), Seiton (ranger), Seiso (nettoyer), Seiketsu (standardiser).

## 2. Le parcours complet et ce qu'il livre

Chaque étape se lance par une commande, et chacune se termine par une question : c'est toi qui décides de la suite. Le diagnostic est obligatoire : la construction refuse de commencer sans lui, puis reprend son relevé au lieu de le refaire. Il compare les écrans à un catalogue de composants de référence, selon le type de produit, et reconnaît les éléments par leur structure et leur contenu, pas par le nom des calques.

```mermaid
flowchart LR
    D["<b>Diagnostic</b> · obligatoire<br/>/figma-ui-kit:diagnostic"]
    B["<b>Construction du kit</b><br/>/figma-ui-kit:build<br/>fondations, atomes,<br/>molécules, organismes"]
    S{"Le kit est terminé.<br/>Qu'est-ce que tu veux<br/>faire maintenant ?"}
    R["Regarder le kit<br/>seul ou en équipe"]
    A["<b>Accessibilité</b><br/>/figma-ui-kit:accessibilite"]
    T["<b>Appliquer le kit aux écrans</b><br/>/figma-ui-kit:templates<br/>un écran ou un parcours à la fois"]
    P["Reprendre un point du kit"]

    D -->|"Je lance le chantier ?<br/>survol et scan repris"| B
    B --> S
    S --> R
    S --> A
    S --> T
    S --> P
    P --> B
    A -.->|"corrections du kit<br/>en questions ouvertes"| B

    LD[/"diagnostic-pre-ui-kit.md<br/>état chiffré du fichier"/]
    LB[/"Pages Figma : Revue, Arborescence,<br/>UI Kit · Foundations, Atoms,<br/>Molecules, Organisms, Archives<br/>+ uikit.md, toutes les décisions"/]
    LA[/"accessibilite-rgaa.md<br/>+ page Accessibilité"/]
    LT[/"page Écrans kit :<br/>copies des écrans avec le kit"/]

    D -.-> LD
    B -.-> LB
    A -.-> LA
    T -.-> LT
```

Tes écrans d'origine ne sont jamais modifiés : le kit est appliqué à des copies. Rien n'est supprimé : ce qui est remplacé part dans la page Archives.

## 3. La boucle de chaque étape

Le kit se construit par étapes : fondations, puis atomes, puis molécules, puis organismes (ou d'une seule traite, avec une seule boucle pour tout le kit). Chaque étape suit la même boucle, et tu ne vois une étape qu'une fois vérifiée.

```mermaid
flowchart TB
    I["<b>Inventaire</b> · Seiri<br/>tous les blocs des écrans,<br/>leurs variantes et les trous"]
    IV{{"Tu valides la liste<br/>des composants"}}
    DE{{"Tu valides les décisions<br/>récapitulatif avec recommandations"}}
    C["<b>Construction</b> · Seiton<br/>lot par lot, chaque variante cochée"]
    VE["<b>Vérification</b> · Seiketsu<br/>mesures, fidélité aux écrans,<br/>structure, présentation"]
    DO{{"Tu tranches les doutes<br/>qui changent le rendu"}}
    RE{{"<b>Recette</b><br/>Je valide ?"}}
    SU["<b>Suivi</b> · Seiso<br/>Revue, cadres Suivi, dates"]
    NX(["Étape suivante"])

    I --> IV --> DE --> C --> VE
    VE -->|"écart sans décision<br/>2 allers-retours au plus"| C
    VE -->|"change le rendu"| DO --> C
    VE -->|"tout est bon"| RE
    RE -->|"Je valide"| SU --> NX
    RE -->|"À reprendre"| DE
```

En tête de chaque page du kit, un cadre **Suivi** montre l'état de chaque composant : `Accepted` (validé à la recette), `On hold` (bloqué par une décision), ou `Built` (construit, en attente de recette). Le détail du travail en cours reste dans `uikit.md`.

À la fin du chantier, Seiri recompte tout pour le bilan avant → après, et Seiso met la Revue à jour. En mode phase par phase, Seiketsu vérifie d'abord la cohérence entre les niveaux.
