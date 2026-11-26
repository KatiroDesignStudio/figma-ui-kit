# UI Kit : {Projet}

Fichier Figma : {lien}
Plan et siège : {plan}, siège {siège} · quota Figma : {n} appels par jour
Dossier du chantier : {chemin absolu}
Git : {hors de git, versionné, pas de dépôt}
Fichier de travail : {ce fichier, copie fournie}
Mode : {express (d'une seule traite), fin (phase par phase)}
Démarré le : {date} · Dernière session : {date}
Phase en cours : 0 Périmètre
Prochaine action : {action}

## Avancement
États : à faire, en cours, faite, close avec reports, rien à faire.

| Phase | État | Recette |
|---|---|---|
| 0 Périmètre | à faire | |
| 1 Scan et structure | à faire | |
| 2 Fondations | à faire | |
| 3 Atomes | à faire | |
| 4 Molécules | à faire | |
| 5 Organismes | à faire | |
| 6 Clôture | à faire | |

En mode express, les phases 2 à 5 partagent le récapitulatif et la recette.

## Chiffres
| | Avant | Maintenant |
|---|---|---|
| Couleurs uniques | | |
| Tailles de texte | | |
| Valeurs d'espacement | | |
| Valeurs de rayon | | |
| Familles et graisses de police | | |
| Familles d'icônes | | |
| Composants (variantes) | | |
| Kit : propriétés reliées | | |
| Écrans : propriétés reliées | | |
| Écrans : nœuds instances du kit | | |
| Textes sans style | | |
| Doublons | | |
| Copies détachées | | |
| Contrastes en échec | | |
| Noms hors nomenclature | | |
| Inventaire : blocs, familles, hors kit, à trancher | | |
| Couverture des écrans par les familles du kit | | |

## Périmètre
Règle d'identification : {règle}
Écrans retenus ({n}) : voir `.uikit/perimetre-valide.json`
Exclus ({n}) : {nombre par motif}
Doublons tranchés : {groupes et version retenue}
Kit existant : {complété, vérifié et complété, reconstruit au propre, laissé intact, aucun}
Couverture du client : {gardée, rangée, aucune}
Inventaire validé : {date} · {n} familles, {n} hors kit (voir `.uikit/scan/inventaire.json`)

## Référentiel
Règles fixes du plugin : nomenclature, structure, contrôles (dossier `references/` du plugin).

### Règles (R)
- R0 Périmètre : seuls les écrans retenus servent au kit et peuvent le recevoir. Aucun écran d'origine n'est jamais modifié : figma-ui-kit:templates applique le kit à des copies, dans `Écrans kit`.
- R1 Aucune couleur, typo, espacement, rayon, bordure, opacité, ombre ni grille hors variable ou style dans le kit.

### Décisions (D)
-

## Suivi des familles
Tiré de l'inventaire validé : une ligne par famille, avec son identifiant (`F{nnn}`, `scan/inventaire.json`), qui ne change jamais, même si la famille est renommée. États : à faire, en cours, construit, validé, mis de côté. Le cadre Suivi de chaque page du kit n'en montre que construit, validé et mis de côté (`Built`, `Accepted`, `On hold`) ; à faire et en cours n'y figurent pas.

| Id | Famille | Niveau | Variantes observées | État | Décision |
|---|---|---|---|---|---|

## Lots
États : à faire, en cours, fait.

| Lot | Familles ou écran | État |
|---|---|---|

## Écrans avec le kit
| Écran | Copie | Date | Recette |
|---|---|---|---|

Reportés : {liste}

## Questions
États : ouverte, reportée, avec le client, tranchée.

| Q | Phase | Question | Constats | État |
|---|---|---|---|---|

## Avec le client
Questions à envoyer telles quelles :
-

## Journal
- {date} Démarrage.
