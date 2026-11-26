// Contrôle du format des fichiers de .uikit/, appelé par le filtre des outils
// (filtre-outils.mjs) avant chaque Write ou Edit dans un dossier .uikit/,
// que l'écriture vienne d'un agent du plugin ou de la conversation principale.
//
// Ce qui est contrôlé : le nom du fichier (un fichier de donnees.md), le JSON,
// les clés du premier niveau, les types, les valeurs permises, les identifiants
// (nœud Figma, constat C001, bloc B001, date, lien), les champs obligatoires de
// chaque élément de liste, et le sceau des résultats de scripts rangés tels quels.
// Un fichier se remplit au fur et à mesure : une clé absente n'est pas une erreur.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { FICHIERS, fichierPour } from './format/fichiers.mjs';
import { verifier } from './format/types.mjs';
import { canon } from '../skills/build/scripts/compteurs.mjs';

const DOSSIER = '.uikit';
const ECARTS_AFFICHES = 8;
const REFERENCE = 'references/donnees.md';

/** Noms des fichiers de .uikit/, tels que les écrit donnees.md. */
export const NOMS_DOCUMENTES = Object.freeze(FICHIERS.map((f) => f.nom));

/** Segments d'un chemin, `.` et `..` résolus (`a/./b/../c` donne `a`, `c`). */
function segments(chemin) {
  return chemin.split(/[\\/]/).reduce((pile, partie) => {
    if (partie === '.') return pile;
    if (partie === '..') return pile.slice(0, -1);
    return [...pile, partie];
  }, []);
}

/** Vrai si un segment de chemin est un dossier `.uikit` (sans tenir compte de la casse, comme macOS). */
export const estDossierUikit = (partie) => partie.toLowerCase() === DOSSIER;

const dernierUikit = (parties) => parties.map(estDossierUikit).lastIndexOf(true);

/** Chemin relatif au dernier dossier `.uikit` d'un chemin (`scan/index.json`), ou `null`. */
export function cheminDansUikit(chemin) {
  if (typeof chemin !== 'string') return null;
  const parties = segments(chemin);
  const i = dernierUikit(parties);
  if (i === -1 || i === parties.length - 1) return null;
  return parties.slice(i + 1).join('/');
}

/** Dossier `.uikit` qui contient un chemin. */
function dossierUikitDe(chemin) {
  const parties = segments(chemin);
  return parties.slice(0, dernierUikit(parties) + 1).join('/') || '/';
}

function resumer(relatif, ecarts) {
  const affiches = ecarts.slice(0, ECARTS_AFFICHES).map((ecart, i) => `${i + 1}) ${ecart}`);
  const reste = ecarts.length > ECARTS_AFFICHES ? [`et ${ecarts.length - ECARTS_AFFICHES} autres`] : [];
  const n = ecarts.length;
  return `.uikit/${relatif} ne suit pas son format (${REFERENCE}), ${n} écart${n > 1 ? 's' : ''} : `
    + `${[...affiches, ...reste].join(' ; ')}. Corrige ces points et réécris le fichier.`;
}

function lireTexte(chemin) {
  try {
    return readFileSync(chemin, 'utf8');
  } catch (erreur) {
    if (erreur.code === 'ENOENT') return null;
    throw erreur;
  }
}

function controlerCopie(relatif, valeur, source, dossierUikit) {
  const original = dossierUikit ? lireTexte(join(dossierUikit, source)) : null;
  if (original === null) return `.uikit/${relatif} est une copie de .uikit/${source}, absent : lance d'abord scripts/compteurs.mjs.`;
  let attendu;
  try {
    attendu = JSON.parse(original);
  } catch {
    return `.uikit/${source} est illisible : relance scripts/compteurs.mjs avant d'en faire la copie.`;
  }
  if (canon(valeur) === canon(attendu)) return null;
  return `.uikit/${relatif} doit être la copie conforme de .uikit/${source} : copie le fichier tel quel, sans rien changer.`;
}

/**
 * Contrôle d'un contenu destiné à `.uikit/{relatif}` : `null` s'il est conforme,
 * sinon la raison du refus. `dossierUikit` sert aux copies (compteurs-avant.json).
 */
export function controlerContenu(relatif, texteJson, { dossierUikit, inconnusPermis = false } = {}) {
  const fichier = fichierPour(relatif);
  if (!fichier) {
    if (inconnusPermis) return null;
    return `.uikit/${relatif} n'est pas un fichier du chantier. Fichiers permis (${REFERENCE}) : ${NOMS_DOCUMENTES.join(', ')}.`;
  }
  if (fichier.script) return `.uikit/${relatif} n'est écrit que par ${fichier.script} (node) : lance le script au lieu d'écrire le fichier.`;
  let valeur;
  try {
    valeur = JSON.parse(texteJson);
  } catch (erreur) {
    return `.uikit/${relatif} n'est pas un JSON valide (${erreur.message}). Réécris le fichier en JSON.`;
  }
  if (fichier.copieDe) return controlerCopie(relatif, valeur, fichier.copieDe, dossierUikit);
  const ecarts = verifier(valeur, fichier.format);
  return ecarts.length ? resumer(relatif, ecarts) : null;
}

/** Nombre d'occurrences d'un texte dans un autre. */
function occurrences(texte, cherche) {
  return cherche ? texte.split(cherche).length - 1 : 0;
}

/** Edit dont le texte à remplacer n'est pas dans le fichier tel quel. */
export const INTROUVABLE = Symbol('introuvable');

/**
 * Contenu du fichier après l'écriture : le texte de Write, ou le fichier existant
 * après le remplacement d'Edit (un texte vide à remplacer crée un fichier absent ou vide).
 * `null` quand Edit échouera de lui-même (fichier absent, texte présent plusieurs fois
 * sans replace_all). `INTROUVABLE` quand le texte n'y est pas tel quel : Edit pourrait
 * le retrouver en normalisant les guillemets, sans que le contrôle voie le résultat.
 */
export function contenuApres(outil, entree) {
  if (outil === 'Write') return typeof entree?.content === 'string' ? entree.content : null;
  if (outil !== 'Edit') return null;
  const { file_path: chemin, old_string: ancien, new_string: nouveau, replace_all: partout } = entree ?? {};
  if (typeof ancien !== 'string' || typeof nouveau !== 'string') return null;
  const actuel = lireTexte(chemin);
  if (ancien === '') return actuel === null || actuel === '' ? nouveau : null;
  if (actuel === null) return null;
  const n = occurrences(actuel, ancien);
  if (n === 0) return INTROUVABLE;
  if (n > 1 && !partout) return null;
  return partout ? actuel.split(ancien).join(nouveau) : actuel.replace(ancien, () => nouveau);
}

/**
 * Contrôle d'un Write ou d'un Edit : `null` pour laisser passer, sinon la raison du refus.
 * `inconnusPermis` : un fichier absent de donnees.md passe (conversation principale).
 * Une erreur du contrôle lui-même laisse passer l'écriture, signalée sur stderr :
 * le contrôle ne bloque jamais la session sur une panne qui n'est pas celle du fichier.
 */
export function controlerEcriture(outil, entree, { inconnusPermis = false } = {}) {
  const relatif = cheminDansUikit(entree?.file_path);
  if (relatif === null) return null;
  try {
    const contenu = contenuApres(outil, entree);
    if (contenu === null) return null;
    if (contenu === INTROUVABLE) {
      if (inconnusPermis && !fichierPour(relatif)) return null;
      return `le texte à remplacer n'est pas tel quel dans .uikit/${relatif} : relis le fichier, puis refais la modification ou réécris le fichier en entier.`;
    }
    return controlerContenu(relatif, contenu, { dossierUikit: dossierUikitDe(entree.file_path), inconnusPermis });
  } catch (erreur) {
    console.error(`figma-ui-kit, contrôle du format de .uikit/${relatif} indisponible (${erreur.code ?? erreur.message}) : écriture laissée passer.`);
    return null;
  }
}
