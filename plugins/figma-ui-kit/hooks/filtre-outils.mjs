#!/usr/bin/env node
// Filtre des outils des agents du plugin figma-ui-kit (hooks.json, PreToolUse).
//
// Pour les agents du plugin (seiri, seiton, seiso, seiketsu), trois règles :
// 1. Connecteurs (MCP) : seuls les outils Figma passent, quel que soit le nom
//    que l'utilisateur a donné à son serveur Figma. Tout autre connecteur
//    (messagerie, paiement, hébergement…) est refusé.
// 2. Lecture seule : Seiri et Seiketsu ne lancent dans `use_figma` que du code
//    de lecture. Un code qui écrit dans le fichier (création, suppression,
//    déplacement, réglage d'une propriété) est refusé.
// 3. Fichiers : Write et Edit n'écrivent que dans un dossier `.uikit/`.
// 4. Scripts de mesure : un code `use_figma` qui porte l'en-tête
//    `// figma-ui-kit:script {nom} v{n}` doit être le fichier livré par le plugin,
//    aux paramètres près (le texte entre `/*PARAMS*/` et `/*FIN-PARAMS*/`).
// Hors de ces agents, le filtre ne fait rien : la conversation de
// l'utilisateur garde tous ses outils.
//
// Entrée : le JSON de l'événement sur stdin (`tool_name`, `tool_input`, `agent_type`).
// Sortie : rien (l'appel continue), ou une décision `deny` avec sa raison.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PLUGIN = 'figma-ui-kit';
const AGENTS = new Set(['seiri', 'seiton', 'seiso', 'seiketsu']);
const AGENTS_LECTURE_SEULE = new Set(['seiri', 'seiketsu']);
const OUTILS_FICHIERS = new Set(['Write', 'Edit']);

// Outils du serveur MCP officiel de Figma dont les agents ont besoin.
export const OUTILS_FIGMA = new Set([
  'use_figma',
  'create_session',
  'get_figma_skill',
  'get_screenshot',
  'get_metadata',
  'get_design_context',
  'get_variable_defs',
  'get_libraries',
  'search_design_system',
  'whoami',
]);

// Ce qui écrit dans le fichier Figma depuis l'API Plugin. Une lecture n'en
// emploie aucune : `setCurrentPageAsync` (changer de page) reste permis.
const ECRITURES_FIGMA = [
  /\.remove\s*\(/,
  /\bcreate[A-Z]\w*\s*\(/,
  /\.(appendChild|insertChild|clone|detachInstance|swapComponent|resize|resizeWithoutConstraints|flatten|rescale|createInstance)\s*\(/,
  /\bfigma\.(group|ungroup|flatten|union|subtract|intersect|exclude|combineAsVariants|createComponentFromNode)\s*\(/,
  /\.set(?!CurrentPageAsync\b)[A-Z]\w*\s*\(/,
  /\bimport\w*ByKeyAsync\s*\(/,
  /\.(name|x|y|fills|strokes|effects|characters|visible|locked|opacity|cornerRadius|layoutMode|itemSpacing|paddingLeft|paddingRight|paddingTop|paddingBottom|fontSize|fontName|textStyleId|fillStyleId|strokeStyleId|effectStyleId|gridStyleId|strokeWeight|description|constraints|clipsContent|rotation|layoutSizingHorizontal|layoutSizingVertical|primaryAxisSizingMode|counterAxisSizingMode|layoutPositioning|scopes|hiddenFromPublishing|codeSyntax)\s*=(?![=>])/,
];

const DOSSIER_SCRIPTS = fileURLToPath(new URL('../skills/build/scripts/figma/', import.meta.url));
const MENTION_SCRIPT = 'figma-ui-kit:script';
const LONGUEUR_DEBUT = 300;
const EN_TETE_SCRIPT = /^\/\/ figma-ui-kit:script (\S*) v\d+$/;
const NOM_SCRIPT = /^[a-z][a-z0-9-]*$/;
const SEGMENT_PARAMS = /\/\*PARAMS\*\/([\s\S]*?)\/\*FIN-PARAMS\*\//;
const CONSIGNE_SCRIPT = 'Relis le fichier du script dans skills/build/scripts/figma/ et lance-le tel quel : ne change que les paramètres, entre /*PARAMS*/ et /*FIN-PARAMS*/.';

/** Vrai si le texte est un objet JSON (ni tableau, ni valeur simple). */
function estObjetJson(texte) {
  try {
    const valeur = JSON.parse(texte);
    return valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur);
  } catch {
    return false;
  }
}

/**
 * Texte d'un script livré, ou `null` s'il n'existe pas (nom invalide ou fichier absent).
 * Toute autre erreur de lecture est relancée.
 */
function lireScriptLivre(nom, dossier) {
  if (!NOM_SCRIPT.test(nom)) return null;
  try {
    return readFileSync(join(dossier, `${nom}.js`), 'utf8');
  } catch (erreur) {
    if (erreur.code === 'ENOENT') return null;
    throw erreur;
  }
}

const finsDeLigneUnix = (texte) => texte.replace(/\r\n?/g, '\n');

/**
 * Contrôle d'un code `use_figma` qui porte l'en-tête d'un script du plugin :
 * rend `null` s'il est conforme (ou sans en-tête), sinon la raison du refus.
 * `dossier` ne sert qu'aux tests.
 */
export function scriptConforme(code, dossier = DOSSIER_SCRIPTS) {
  if (typeof code !== 'string') return null;
  const entete = code.split(/\r?\n/, 1)[0].match(EN_TETE_SCRIPT);
  if (!entete) {
    if (!code.slice(0, LONGUEUR_DEBUT).includes(MENTION_SCRIPT)) return null;
    return `En-tête de script du plugin déguisé ou mal formé : la première ligne doit être exactement « // ${MENTION_SCRIPT} {nom} v{n} », sans rien devant ni derrière. ${CONSIGNE_SCRIPT}`;
  }
  const nom = entete[1];
  let livre;
  try {
    livre = lireScriptLivre(nom, dossier);
  } catch (erreur) {
    return `Le fichier du script « ${nom} » est illisible (${join(dossier, `${nom}.js`)} : ${erreur.code ?? erreur.message}). Signale-le à Kanshu.`;
  }
  if (livre === null) return `Script du plugin inconnu : « ${nom} ». ${CONSIGNE_SCRIPT}`;
  return comparer(nom, finsDeLigneUnix(code), finsDeLigneUnix(livre));
}

/** Compare un code au fichier livré, paramètres mis à part ; `null` s'ils concordent. */
function comparer(nom, code, livre) {
  const params = code.match(SEGMENT_PARAMS);
  if (!params || !SEGMENT_PARAMS.test(livre)) return `Script « ${nom} » : marqueur de paramètres absent. ${CONSIGNE_SCRIPT}`;
  if (!estObjetJson(params[1])) return `Script « ${nom} » : les paramètres doivent être un objet JSON valide. ${CONSIGNE_SCRIPT}`;
  const neutre = (texte) => texte.replace(SEGMENT_PARAMS, () => '/*PARAMS*/{}/*FIN-PARAMS*/').trimEnd();
  if (neutre(code) === neutre(livre)) return null;
  return `Script « ${nom} » modifié : le code ne correspond pas au fichier livré. ${CONSIGNE_SCRIPT}`;
}

/** Nom court d'un agent du plugin (`seiri`), ou `null` pour tout autre appelant. */
export function agentDuPlugin(agentType) {
  if (typeof agentType !== 'string') return null;
  const nom = agentType.startsWith(`${PLUGIN}:`) ? agentType.slice(PLUGIN.length + 1) : agentType;
  return AGENTS.has(nom) ? nom : null;
}

/** Nom court d'un outil MCP : ce qui suit le dernier `__` (`mcp__{serveur}__{outil}`). */
export function nomCourt(toolName) {
  const i = toolName.lastIndexOf('__');
  return i === -1 ? toolName : toolName.slice(i + 2);
}

/** Première écriture trouvée dans un code `use_figma`, ou `null`. */
export function ecritureFigma(code) {
  if (typeof code !== 'string') return null;
  for (const motif of ECRITURES_FIGMA) {
    const trouve = code.match(motif);
    if (trouve) return trouve[0].trim();
  }
  return null;
}

/** Vrai si le chemin absolu est dans un dossier `.uikit/`. */
export function dansUikit(chemin) {
  if (typeof chemin !== 'string') return false;
  return chemin.split(/[\\/]/).includes('.uikit');
}

/** Décision pour un événement : `null` pour laisser passer, sinon la raison du refus. */
export function decider(evenement) {
  const agent = agentDuPlugin(evenement?.agent_type);
  if (!agent) return null;
  const outil = typeof evenement?.tool_name === 'string' ? evenement.tool_name : '';
  const entree = evenement?.tool_input ?? {};
  const etiquette = `L'agent ${PLUGIN}:${agent}`;

  if (OUTILS_FICHIERS.has(outil)) {
    if (dansUikit(entree.file_path)) return null;
    return `${etiquette} n'écrit que dans le dossier .uikit/ du chantier. `
      + `Écriture refusée : ${entree.file_path ?? '(chemin absent)'}. Rends ce besoin en doute à Kanshu.`;
  }

  if (!outil.startsWith('mcp__')) return null;
  const court = nomCourt(outil);
  if (!OUTILS_FIGMA.has(court)) {
    return `${etiquette} n'a accès qu'aux outils Figma. `
      + `Appel refusé : ${outil}. Continue avec les outils Figma, ou rends ce besoin en doute à Kanshu.`;
  }

  if (court === 'use_figma') {
    const script = scriptConforme(entree.code);
    if (script) return `${etiquette} : ${script}`;
  }

  if (court === 'use_figma' && AGENTS_LECTURE_SEULE.has(agent)) {
    const ecriture = ecritureFigma(entree.code);
    if (ecriture) {
      return `${etiquette} est en lecture seule : ce code écrirait dans le fichier Figma (« ${ecriture} »). `
        + 'Relance un code qui ne fait que lire. Si c\'est une fausse alerte (par exemple un objet de résultat '
        + 'dont une clé s\'appelle name ou x), renomme cette clé.';
    }
  }
  return null;
}

function principal() {
  let evenement;
  try {
    evenement = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    // Entrée illisible : on ne bloque pas la session de l'utilisateur, on le signale.
    console.error('figma-ui-kit, filtre des outils : événement illisible, appel laissé passer.');
    process.exit(1);
  }
  const raison = decider(evenement);
  if (raison === null) process.exit(0);
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: raison,
    },
  }));
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) principal();

