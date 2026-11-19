# Katiro UI Kit

[Français](#français) · [English](#english)

---

## Français

Une équipe d'agents IA pour Claude Code qui **remet au propre le UI Kit d'un fichier Figma**, directement dans Figma.

> **Bêta.** Vos retours sont les bienvenus.

### À quoi ça sert

| Pour qui | Ce qu'il fait | Ce qu'il ne fait pas |
|---|---|---|
| Un fichier sans UI Kit | Diagnostic chiffré du fichier | Créer des écrans ou des parcours |
| Un kit commencé puis laissé en plan | Kit rangé en logique atomique : fondations, atomes, molécules, organismes | Documentation d'usage |
| Un projet mené vite | Kit appliqué à des copies de tes écrans (en option) | Bibliothèque partagée, motion |

C'est un premier palier : il fait le gros du travail, le designer finit.

### Prérequis

| | Ce qu'il faut |
|---|---|
| **Claude Code** | [Installé](https://claude.com/claude-code) |
| **Serveur MCP Figma** | Le serveur officiel de Figma, connecté (voir ci-dessous) |
| **Plan Figma** | Professional, Organization ou Enterprise |
| **Siège Figma** | **Full** pour construire le kit. Un siège Dev suffit pour le diagnostic seul. |
| **Droits sur le fichier** | Droits de modification. Travaille sur une copie (Fichier > Dupliquer). |
| **Polices** | Celles du fichier, disponibles dans Figma (Google Fonts ou polices partagées de l'équipe) |

**Limites de Figma** sur les appels à son serveur MCP :
- Professional ou Organization, siège Full ou Dev : 200 appels par jour. Enterprise : 600. Sur un gros fichier, la construction peut atteindre cette limite : on reprend le lendemain là où on s'est arrêté.
- Plan Starter, ou siège View ou Collab : 6 appels par mois, ce qui ne suffit pas.

**Connecter le serveur MCP Figma**, une seule fois :
```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
```
Puis, dans Claude Code, tape `/mcp`, choisis `figma` et connecte ton compte.

### Installer

```bash
claude plugin marketplace add KatiroDesignStudio/katiro-claude-code-plugins
```
```bash
claude plugin install katiro-ui-kit@katiro-studio
```
Puis ouvre une nouvelle session Claude Code.

**Mettre à jour :**
```bash
claude plugin marketplace update katiro-studio
```
```bash
claude plugin update katiro-ui-kit@katiro-studio
```

### Utiliser

Écris ta demande dans Claude Code, avec le lien de ton fichier Figma.

| Tu écris | Ce qui se passe | Modifie Figma ? | Commande |
|---|---|---|---|
| « Fais un diagnostic de mon fichier Figma : {lien} » | Un rapport chiffré de l'état du fichier | Non | `/katiro-ui-kit-diagnostic` |
| « Range le UI Kit de mon fichier Figma : {lien} » | Le kit est reconstruit au propre, étape par étape | Oui, pages du kit seulement | `/katiro-ui-kit-build` |
| « Applique le UI Kit à l'écran Accueil » | Les composants du kit sont posés dans une copie de l'écran | Oui, copies seulement | `/katiro-ui-kit-templates` |
| « Fais-moi des recommandations d'accessibilité » | Des recommandations RGAA 4.1.2, en rapport et en page Accessibilité. Une aide, pas un audit. | Ajoute une page | `/katiro-ui-kit-accessibilite` |

Ton fichier a déjà un kit ? L'agent propose de le compléter, de le vérifier ou de le reconstruire, sans changer le rendu de ses composants.

### Les agents

| Agent | Titre | Rôle | Te parle | Modèle |
|---|---|---|---|---|
| **Shindan** | Figma Auditor | Diagnostic du fichier | Oui, avant | Celui de ta conversation |
| **Kanshu** | Design System Manager | Pilote le chantier, te fait valider | Oui, pendant | Celui de ta conversation |
| **Hairyo** | Accessibility Designer | Recommandations RGAA | Oui, après | Celui de ta conversation |
| **Seiri** | Design System Analyst | Mesure et inventorie, en lecture seule | Non | Sonnet |
| **Seiton** | Figma Component Builder | Construit ce qui est validé | Non | Opus |
| **Seiso** | Design System Optimizer | Retouches désignées, Revue et Suivi à jour | Non | Sonnet |
| **Seiketsu** | Design System Reviewer | Relit chaque étape, en lecture seule | Non | Opus |

- Tous sont experts de Figma et du design system, et suivent la même méthode Katiro.
- Pour économiser, choisis Sonnet pour ta conversation : le travail lourd se fait dans les agents.
- Le fonctionnement en schémas : [docs/fonctionnement.md](docs/fonctionnement.md).

### Les garanties

- **Rien sans ton accord** : chaque décision t'est présentée avec ses preuves et une recommandation.
- **Rien n'est supprimé** : ce qui est remplacé part dans une page `Archives`.
- **Tes écrans d'origine ne sont jamais modifiés.**
- **On reprend où on s'est arrêté** : tout est noté dans `uikit.md` et dans la page Revue du fichier.
- **Tu sais où on en est** : des nouvelles chaque minute pendant les longs travaux.

### Licence

MIT. Fait par [Katiro Studio](https://www.katiro.studio/).

---

## English

A team of AI agents for Claude Code that **cleans up the UI Kit of a Figma file**, right inside Figma.

> **Beta.** Feedback welcome.

### What it is for

| For | What it does | What it does not do |
|---|---|---|
| A file with no UI Kit | A measured audit of the file | Design screens or flows |
| A kit started and left unfinished | A kit organized with atomic design: foundations, atoms, molecules, organisms | Usage documentation |
| A project built in a rush | The kit applied to copies of your screens (optional) | Shared library, motion |

It is a first step: it does the heavy lifting, the designer finishes.

### Requirements

| | What you need |
|---|---|
| **Claude Code** | [Installed](https://claude.com/claude-code) |
| **Figma MCP server** | Figma's official server, connected (see below) |
| **Figma plan** | Professional, Organization or Enterprise |
| **Figma seat** | **Full** to build the kit. A Dev seat is enough for the audit only. |
| **File access** | Edit access. Work on a copy (File > Duplicate). |
| **Fonts** | The file's fonts, available in Figma (Google Fonts or team shared fonts) |

**Figma limits** on calls to its MCP server:
- Professional or Organization, Full or Dev seat: 200 calls per day. Enterprise: 600. On a large file, the build may hit this limit: pick up the next day where you left off.
- Starter plan, or View or Collab seat: 6 calls per month, which is not enough.

**Connect the Figma MCP server**, once:
```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
```
Then, in Claude Code, type `/mcp`, pick `figma` and sign in.

### Install

```bash
claude plugin marketplace add KatiroDesignStudio/katiro-claude-code-plugins
```
```bash
claude plugin install katiro-ui-kit@katiro-studio
```
Then start a new Claude Code session.

**Update:**
```bash
claude plugin marketplace update katiro-studio
```
```bash
claude plugin update katiro-ui-kit@katiro-studio
```

### Use

Type your request in Claude Code, with your Figma file link. The agents answer in French.

| You type | What happens | Changes Figma? | Command |
|---|---|---|---|
| "Audit my Figma file: {link}" | A measured report on the state of the file | No | `/katiro-ui-kit-diagnostic` |
| "Clean up the UI Kit of my Figma file: {link}" | The kit is rebuilt cleanly, step by step | Yes, kit pages only | `/katiro-ui-kit-build` |
| "Apply the UI Kit to the Home screen" | Kit components are placed in a copy of the screen | Yes, copies only | `/katiro-ui-kit-templates` |
| "Give me accessibility recommendations" | RGAA 4.1.2 recommendations, as a report and an Accessibility page. Guidance, not an audit. | Adds a page | `/katiro-ui-kit-accessibilite` |

Your file already has a kit? The agent offers to complete it, check it or rebuild it, without changing how its components render.

### The agents

| Agent | Title | Role | Talks to you | Model |
|---|---|---|---|---|
| **Shindan** | Figma Auditor | Audits the file | Yes, before | Your conversation's |
| **Kanshu** | Design System Manager | Runs the project, gets your approval | Yes, during | Your conversation's |
| **Hairyo** | Accessibility Designer | RGAA recommendations | Yes, after | Your conversation's |
| **Seiri** | Design System Analyst | Measures and inventories, read-only | No | Sonnet |
| **Seiton** | Figma Component Builder | Builds what you approved | No | Opus |
| **Seiso** | Design System Optimizer | Targeted fixes, keeps Review and Tracking up to date | No | Sonnet |
| **Seiketsu** | Design System Reviewer | Reviews each step, read-only | No | Opus |

- All of them are Figma and design system experts, and follow the same Katiro method.
- To save usage, pick Sonnet for your conversation: the heavy work happens in the agents.
- How it works, in diagrams (in French): [docs/fonctionnement.md](docs/fonctionnement.md).

### Guarantees

- **Nothing without your approval**: every decision comes with its evidence and a recommendation.
- **Nothing is deleted**: whatever is replaced goes to an `Archives` page.
- **Your original screens are never modified.**
- **Pick up where you left off**: everything is logged in `uikit.md` and in the file's Review page.
- **You know where things stand**: updates every minute during long tasks.

### License

MIT. Made by [Katiro Studio](https://www.katiro.studio/).
