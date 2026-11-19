# Comment fonctionne Katiro UI Kit

Trois schémas pour comprendre le plugin : qui fait quoi, le parcours complet avec ce qu'il livre, et la boucle de chaque étape.

## 1. Qui fait quoi

Kanshu est le manager : c'est le seul agent qui te parle de la construction du kit, et il ne fait rien sans ton accord. Il confie le travail à quatre agents spécialisés, qui ne décident jamais. Shindan (diagnostic) et Hairyo (accessibilité) travaillent à part, avant et après le chantier.

```mermaid
flowchart TB
    U(["Toi<br/>designer, lead ou client"])

    subgraph managers["Ceux qui te parlent"]
        direction LR
        SH["<b>Shindan</b><br/>Figma Auditor<br/>mesure l'état du fichier"]
        K["<b>Kanshu</b><br/>Design System Manager<br/>te fait valider, pilote, contrôle"]
        HA["<b>Hairyo</b><br/>Accessibility Designer<br/>recommande, sans rien modifier"]
    end

    subgraph equipe["Les agents de travail, qui ne décident jamais"]
        direction LR
        SI["<b>Seiri</b> · Design System Analyst<br/>Sonnet · lecture seule<br/>survol, inventaire, scan, contrôle"]
        ST["<b>Seiton</b> · Figma Component Builder<br/>Sonnet puis Opus<br/>construit ce qui est validé"]
        SO["<b>Seiso</b> · Design System Optimizer<br/>Sonnet<br/>Revue, Suivi, petites retouches"]
        SK["<b>Seiketsu</b> · Design System Reviewer<br/>Sonnet · lecture seule<br/>relit avant chaque recette"]
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

Chaque étape se lance par une commande, et chacune se termine par une question : c'est toi qui décides de la suite.

```mermaid
flowchart LR
    D["<b>Diagnostic</b><br/>/figma-ui-kit:diagnostic"]
    B["<b>Construction du kit</b><br/>/figma-ui-kit:build<br/>fondations, atomes,<br/>molécules, organismes"]
    S{"Le kit est terminé.<br/>Qu'est-ce que tu veux<br/>faire maintenant ?"}
    R["Regarder le kit<br/>seul ou en équipe"]
    A["<b>Accessibilité</b><br/>/figma-ui-kit:accessibilite"]
    T["<b>Appliquer le kit aux écrans</b><br/>/figma-ui-kit:templates<br/>un écran ou un parcours à la fois"]
    P["Reprendre un point du kit"]

    D -->|"Je lance le chantier ?"| B
    B --> S
    S --> R
    S --> A
    S --> T
    S --> P
    P --> B

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

Le kit se construit par étapes : fondations, puis atomes, puis molécules, puis organismes. Chaque étape suit la même boucle, et tu ne vois une étape qu'une fois contrôlée et relue.

```mermaid
flowchart TB
    I["<b>Inventaire</b> · Seiri<br/>tous les blocs des écrans,<br/>avec leurs variantes observées"]
    IV{{"Tu valides la liste<br/>des composants"}}
    DE{{"Tu valides les décisions<br/>récapitulatif avec recommandations"}}
    C["<b>Construction</b> · Seiton<br/>lot par lot, chaque variante cochée"]
    CT["<b>Contrôle</b> · Seiri<br/>liaisons, nommage, états,<br/>contrastes, couverture"]
    RL["<b>Relecture</b> · Seiketsu<br/>fidélité aux écrans, structure,<br/>variantes, présentation"]
    DO{{"Tu tranches les doutes<br/>qui changent le rendu"}}
    CO["<b>Corrections</b><br/>Seiton ou Seiso"]
    RE{{"<b>Recette</b><br/>Je valide ?"}}
    NX(["Étape suivante<br/>Suivi en Accepted, Revue à jour"])

    I --> IV --> DE --> C --> CT
    CT -->|"écart à une décision"| C
    CT --> RL
    RL -->|"sans changement de rendu"| CO
    RL -->|"change le rendu"| DO --> CO
    CO --> CT
    RL -->|"tout est bon"| RE
    RE -->|"Je valide"| NX
    RE -->|"À reprendre"| DE
```

Pendant tout ce temps, un cadre **Suivi** en tête de chaque page du kit montre où en est chaque composant :

```mermaid
flowchart LR
    TD["To do"] --> IP["In progress"] --> BU["Built"] --> RV["Reviewed"] --> AC["Accepted"]
    BU -.-> OH["On hold<br/>bloqué par une décision"]
```

À la fin du chantier, Seiketsu relit tout le kit une dernière fois, Seiri recompte tout pour le bilan avant → après, et Seiso met la Revue à jour.
