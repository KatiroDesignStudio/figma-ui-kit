# Figma UI Kit

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

**Limites de Figma** sur les appels à son serveur MCP ([détail](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/)) :
- Professional ou Organization, siège Full ou Dev : 200 appels par jour (10 à 15 par minute). Enterprise : 600 par jour. Sur un gros fichier, la construction peut atteindre cette limite : on reprend le lendemain là où on s'est arrêté.
- Plan Starter, ou siège View ou Collab : 20 appels par mois, ce qui ne suffit pas.
- Figma ne dit pas combien d'appels il reste. Le plugin compte ceux faits depuis Claude Code sur ta machine, tous projets confondus, et te prévient à 25, 50, 75, 85, 90, 95 et 100 %. Les appels faits ailleurs (autre machine, autre application) ne sont pas comptés.

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
claude plugin install figma-ui-kit@katiro-studio
```
Puis ouvre une nouvelle session Claude Code.

**Mettre à jour :**
```bash
claude plugin marketplace update katiro-studio
```
```bash
claude plugin update figma-ui-kit@katiro-studio
```

### Utiliser

Écris ta demande dans Claude Code, avec le lien de ton fichier Figma.

| Tu écris | Ce qui se passe | Modifie Figma ? | Commande |
|---|---|---|---|
| « Fais un diagnostic de mon fichier Figma : {lien} » | Un rapport chiffré de l'état du fichier | Non | `/figma-ui-kit:diagnostic` |
| « Range le UI Kit de mon fichier Figma : {lien} » | Le kit est reconstruit au propre, étape par étape | Oui, pages du kit seulement | `/figma-ui-kit:build` |
| « Applique le UI Kit à l'écran Accueil » | Les composants du kit sont posés dans une copie de l'écran | Oui, copies seulement | `/figma-ui-kit:templates` |
| « Fais-moi des recommandations d'accessibilité » | Des recommandations RGAA 4.1.2, en rapport et en page Accessibilité. Une aide, pas un audit. | Ajoute une page | `/figma-ui-kit:accessibilite` |

La construction commence toujours par le diagnostic : sans lui, l'agent ne construit rien et propose de le lancer. Le diagnostic déduit le type de produit (e-commerce, SaaS, communauté, site vitrine) et compare tes écrans à un catalogue de composants de référence : il repère ce qui existe sous plusieurs formes et ce qui manque, en reconnaissant les éléments par leur structure, même quand les calques s'appellent « Frame 1022 ». Son relevé sert ensuite directement au chantier, rien n'est refait.

Ton fichier a déjà un kit ? L'agent propose de le compléter, de le vérifier ou de le reconstruire, sans changer le rendu de ses composants.

### Les agents

| Agent | Titre | Rôle | Te parle | Modèle |
|---|---|---|---|---|
| **Mitate** | Figma Auditor | Diagnostic du fichier | Oui, avant | Celui de ta conversation |
| **Kanshu** | Design System Manager | Pilote le chantier, te fait valider | Oui, pendant | Celui de ta conversation |
| **Hairyo** | Accessibility Designer | Recommandations RGAA | Oui, après | Celui de ta conversation |
| **Seiri** | Design System Analyst | Mesure et inventorie, en lecture seule | Non | Sonnet |
| **Seiton** | Figma Component Builder | Construit ce qui est validé | Non | Sonnet pour les fondations, Opus pour les composants |
| **Seiso** | Design System Optimizer | Tient la Revue et le Suivi à jour après chaque recette | Non | Sonnet |
| **Seiketsu** | Design System Reviewer | Vérifie chaque étape avant la recette (mesures, fidélité, présentation), en lecture seule | Non | Sonnet |

- Mitate, Kanshu et Hairyo sont trois rôles de ta conversation, qui partagent le même dossier de chantier : le diagnostic prépare le kit (son relevé est repris, pas refait), et l'accessibilité renvoie ses corrections au kit.
- Tous sont experts de Figma et du design system, et suivent la même méthode Katiro.
- Pour économiser, choisis Sonnet pour ta conversation : le travail lourd se fait dans les agents.
- Le fonctionnement en schémas : [docs/fonctionnement.md](docs/fonctionnement.md).

### Les garanties

- **Rien sans ton accord** : chaque décision t'est présentée avec ses preuves et une recommandation.
- **Rien n'est supprimé** : ce qui est remplacé part dans une page `Archives`.
- **Tes écrans d'origine ne sont jamais modifiés.**
- **Les agents ne touchent qu'à Figma** : parmi tes connecteurs (messagerie, paiement, hébergement…), un filtre du plugin ne leur ouvre que les outils Figma, et ils n'ont ni terminal ni accès au web. Les agents de relevé et de vérification ne peuvent que lire le fichier Figma, et aucun agent n'écrit de fichier hors du dossier `.uikit/` du chantier. Le contenu de ton fichier est lu comme une donnée, jamais comme une consigne.
- **Un dossier par chantier** : au premier lancement, l'agent propose un dossier dédié et, dans un dépôt git, de garder les fichiers du chantier (qui contiennent le lien de ton fichier Figma) hors de git. Ton choix est noté et n'est plus redemandé.
- **Les mêmes chiffres partout** : ce qui se compte (couleurs, tailles de texte, espacements, contrastes, propriétés reliées…) est mesuré par des scripts fournis avec le plugin, pas par un code écrit sur le moment. Le même fichier donne les mêmes chiffres, sur n'importe quel ordinateur. Le détail : [docs/scripts-de-mesure.md](docs/scripts-de-mesure.md).
- **On reprend où on s'est arrêté** : tout est noté dans `uikit.md` et dans la page Revue du fichier.
- **Tu sais où on en est** : des nouvelles toutes les 3 minutes pendant les longs travaux, avec le quota Figma du jour.

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

**Figma limits** on calls to its MCP server ([details](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/)):
- Professional or Organization, Full or Dev seat: 200 calls per day (10 to 15 per minute). Enterprise: 600 per day. On a large file, the build may hit this limit: pick up the next day where you left off.
- Starter plan, or View or Collab seat: 20 calls per month, which is not enough.
- Figma does not say how many calls are left. The plugin counts the ones made from Claude Code on your machine, across all projects, and warns you at 25, 50, 75, 85, 90, 95 and 100%. Calls made elsewhere (another machine, another app) are not counted.

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
claude plugin install figma-ui-kit@katiro-studio
```
Then start a new Claude Code session.

**Update:**
```bash
claude plugin marketplace update katiro-studio
```
```bash
claude plugin update figma-ui-kit@katiro-studio
```

### Use

Type your request in Claude Code, with your Figma file link. The agents answer in French.

| You type | What happens | Changes Figma? | Command |
|---|---|---|---|
| "Audit my Figma file: {link}" | A measured report on the state of the file | No | `/figma-ui-kit:diagnostic` |
| "Clean up the UI Kit of my Figma file: {link}" | The kit is rebuilt cleanly, step by step | Yes, kit pages only | `/figma-ui-kit:build` |
| "Apply the UI Kit to the Home screen" | Kit components are placed in a copy of the screen | Yes, copies only | `/figma-ui-kit:templates` |
| "Give me accessibility recommendations" | RGAA 4.1.2 recommendations, as a report and an Accessibility page. Guidance, not an audit. | Adds a page | `/figma-ui-kit:accessibilite` |

The build always starts with the audit: without it, the agent builds nothing and offers to run it. The audit infers the product type (e-commerce, SaaS, community, marketing site) and compares your screens with a reference catalogue of components: it spots what exists in several forms and what is missing, recognizing elements by their structure, even when layers are named "Frame 1022". Its survey then feeds the build directly, nothing is redone.

Your file already has a kit? The agent offers to complete it, check it or rebuild it, without changing how its components render.

### The agents

| Agent | Title | Role | Talks to you | Model |
|---|---|---|---|---|
| **Mitate** | Figma Auditor | Audits the file | Yes, before | Your conversation's |
| **Kanshu** | Design System Manager | Runs the project, gets your approval | Yes, during | Your conversation's |
| **Hairyo** | Accessibility Designer | RGAA recommendations | Yes, after | Your conversation's |
| **Seiri** | Design System Analyst | Measures and inventories, read-only | No | Sonnet |
| **Seiton** | Figma Component Builder | Builds what you approved | No | Sonnet for foundations, Opus for components |
| **Seiso** | Design System Optimizer | Keeps Review and Tracking up to date after each sign-off | No | Sonnet |
| **Seiketsu** | Design System Reviewer | Checks each step before sign-off (measurements, fidelity, presentation), read-only | No | Sonnet |

- Mitate, Kanshu and Hairyo are three roles of your conversation, sharing the same project folder: the audit prepares the kit (its survey is reused, not redone), and accessibility sends its fixes back to the kit.
- All of them are Figma and design system experts, and follow the same Katiro method.
- To save usage, pick Sonnet for your conversation: the heavy work happens in the agents.
- How it works, in diagrams (in French): [docs/fonctionnement.md](docs/fonctionnement.md).

### Guarantees

- **Nothing without your approval**: every decision comes with its evidence and a recommendation.
- **Nothing is deleted**: whatever is replaced goes to an `Archives` page.
- **Your original screens are never modified.**
- **The agents only touch Figma**: among your connectors (email, payments, hosting…), a plugin filter only opens the Figma tools to them, and they have no terminal or web access. The survey and checking agents can only read the Figma file, and no agent writes files outside the project's `.uikit/` folder. Your file's content is read as data, never as instructions.
- **One folder per project**: on first run, the agent offers a dedicated folder and, inside a git repository, to keep the project files (which contain your Figma file link) out of git. Your choice is saved and not asked again.
- **The same figures everywhere**: whatever can be counted (colours, text sizes, spacing, contrast, bound properties…) is measured by scripts shipped with the plugin, not by code written on the spot. The same file gives the same figures on any computer. Details (in French): [docs/scripts-de-mesure.md](docs/scripts-de-mesure.md).
- **Pick up where you left off**: everything is logged in `uikit.md` and in the file's Review page.
- **You know where things stand**: updates every 3 minutes during long tasks, with today's Figma quota.

### License

MIT. Made by [Katiro Studio](https://www.katiro.studio/).
