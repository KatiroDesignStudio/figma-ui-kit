// Faux document Figma pour tester les scripts de mesure du plugin, sans Figma.
// On décrit un document en objets simples ; `lancer` exécute le fichier exact
// du script, comme le ferait `use_figma`, et rend ce qu'il retourne.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const DOSSIER_SCRIPTS = fileURLToPath(new URL('../../plugins/figma-ui-kit/skills/build/scripts/figma/', import.meta.url));
const MARQUE_PARAMS = /\/\*PARAMS\*\/[\s\S]*?\/\*FIN-PARAMS\*\//;

/** Texte d'un script du plugin, tel qu'il est livré. */
export function lireScript(nom) {
  return readFileSync(DOSSIER_SCRIPTS + nom, 'utf8');
}

/** Texte du bloc commun, sans la fin de ligne finale. */
export function blocCommun() {
  return lireScript('_commun.js').trim();
}

/** Code envoyé à `use_figma` : le script, avec ses paramètres à la place du marqueur. */
export function avecParams(nom, params = {}) {
  const code = lireScript(nom);
  if (!MARQUE_PARAMS.test(code)) throw new Error(`${nom} : marqueur de paramètres absent`);
  return code.replace(MARQUE_PARAMS, `/*PARAMS*/${JSON.stringify(params)}/*FIN-PARAMS*/`);
}

const DEFAUTS = { visible: true, opacity: 1, fills: [], strokes: [], effects: [], boundVariables: {} };

/** Complète un nœud décrit simplement : valeurs par défaut, parent, méthodes de l'API. */
function monter(description, parent, index) {
  const noeud = { ...DEFAUTS, ...description, parent };
  if (description.children) noeud.children = description.children.map((enfant) => monter(enfant, noeud, index));
  noeud.findAll = (filtre = () => true) => {
    const trouves = [];
    const descendre = (n) => { for (const e of n.children ?? []) { if (filtre(e)) trouves.push(e); descendre(e); } };
    descendre(noeud);
    return trouves;
  };
  if (noeud.type === 'INSTANCE') {
    noeud.getMainComponentAsync = async () => (description.mainComponent ? index.get(description.mainComponent.id) ?? description.mainComponent : null);
  }
  if (noeud.type === 'TEXT') {
    const segments = description.segments ?? [{ characters: description.characters ?? '', fontSize: description.fontSize ?? 16, fontName: description.fontName ?? { family: 'Inter', style: 'Regular' }, fontWeight: description.fontWeight ?? 400, textStyleId: description.textStyleId ?? '', fills: description.fills ?? [], boundVariables: {} }];
    noeud.getStyledTextSegments = () => segments;
  }
  index.set(noeud.id, noeud);
  return noeud;
}

/**
 * Faux global `figma` à partir d'un document :
 * `{ pages: [{ id, name, children }], collections, variables, styles: { peinture, texte, effet, grille } }`.
 */
export function creerFigma(document) {
  const index = new Map();
  const racine = { type: 'DOCUMENT', id: '0:0', name: 'Document' };
  racine.children = document.pages.map((page) => monter({ type: 'PAGE', ...page }, racine, index));
  const styles = document.styles ?? {};
  const figma = {
    mixed: Symbol('mixed'),
    root: racine,
    currentPage: racine.children[0],
    changementsDePage: 0,
    getNodeByIdAsync: async (id) => index.get(id) ?? null,
    setCurrentPageAsync: async (page) => { figma.currentPage = page; figma.changementsDePage += 1; },
    getLocalPaintStylesAsync: async () => styles.peinture ?? [],
    getLocalTextStylesAsync: async () => styles.texte ?? [],
    getLocalEffectStylesAsync: async () => styles.effet ?? [],
    getLocalGridStylesAsync: async () => styles.grille ?? [],
    variables: {
      getLocalVariableCollectionsAsync: async () => document.collections ?? [],
      getLocalVariablesAsync: async () => document.variables ?? [],
      getVariableByIdAsync: async (id) => (document.variables ?? []).find((v) => v.id === id) ?? null,
    },
  };
  return figma;
}

/** Lance un script du plugin sur un faux document, et rend son résultat. */
export async function lancer(nom, params, document) {
  const figma = creerFigma(document);
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
  const resultat = await new AsyncFunction('figma', avecParams(nom, params))(figma);
  return { resultat, figma };
}
