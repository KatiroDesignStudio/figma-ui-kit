// Petit langage de formats pour les fichiers de .uikit/.
// Chaque fonction rend une description figée d'une valeur attendue ;
// `verifier` compare une valeur à sa description et rend la liste des écarts,
// chacun avec son emplacement dans le fichier (`pages[2].role`).
import { sceauValide } from '../../skills/build/scripts/compteurs.mjs';

const fige = (description) => Object.freeze(description);

export const texte = ({ nonVide = false } = {}) => fige({ sorte: 'texte', nonVide });
export const nombre = () => fige({ sorte: 'nombre' });
export const entier = () => fige({ sorte: 'entier' });
export const booleen = () => fige({ sorte: 'booleen' });
/** Toute valeur JSON : contenu laissé au jugement de l'agent. */
export const libre = () => fige({ sorte: 'libre' });
export const choix = (...valeurs) => fige({ sorte: 'choix', valeurs: Object.freeze(valeurs) });
/** Texte qui suit une expression ; `attendu` le décrit à l'agent, avec un exemple. */
export const motif = (re, attendu) => fige({ sorte: 'motif', re, attendu });
export const liste = (element, { max } = {}) => fige({ sorte: 'liste', element, max });
/**
 * Objet aux champs connus. `requis` : champs obligatoires ; `ferme` : toute autre clé
 * est refusée ; `regles` : fonctions (objet) => message ou null, pour les liens entre champs.
 */
export const objet = (champs, { requis = [], ferme = false, regles = [] } = {}) => fige({
  sorte: 'objet', champs: fige({ ...champs }), requis: Object.freeze([...requis]), ferme, regles: Object.freeze([...regles]),
});
/** Objet aux clés libres (un nom vers une valeur), chaque valeur suivant `valeur`. */
export const dico = (valeur) => fige({ sorte: 'dico', valeur });
export const nul = (description) => fige({ sorte: 'nul', description });
export const unDe = (...descriptions) => fige({ sorte: 'unDe', descriptions: Object.freeze(descriptions) });
/** Résultat d'un script de mesure, rangé tel quel : son `sceau` doit correspondre à son contenu. */
export const scelle = () => fige({ sorte: 'scelle' });

const LONGUEUR_APERCU = 60;

function apercu(valeur) {
  const texteJson = JSON.stringify(valeur);
  if (texteJson === undefined) return String(valeur);
  return texteJson.length > LONGUEUR_APERCU ? `${texteJson.slice(0, LONGUEUR_APERCU)}…` : texteJson;
}

const estObjet = (valeur) => valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur);
const ici = (chemin) => chemin || 'le fichier';
const sous = (chemin, cle) => (chemin ? `${chemin}.${cle}` : cle);
const attendu = (chemin, quoi, valeur) => [`${ici(chemin)} : attendu ${quoi}, trouvé ${apercu(valeur)}`];

function verifierObjet(valeur, description, chemin) {
  if (!estObjet(valeur)) return attendu(chemin, 'un objet', valeur);
  const permis = Object.keys(description.champs);
  const absents = description.requis
    .filter((cle) => valeur[cle] === undefined)
    .map((cle) => `${ici(chemin)} : champ obligatoire absent : ${cle}`);
  const inconnus = description.ferme
    ? Object.keys(valeur).filter((cle) => !permis.includes(cle))
      .map((cle) => `${ici(chemin)} : clé inconnue « ${cle} » (clés permises : ${permis.join(', ')})`)
    : [];
  const champs = permis
    .filter((cle) => valeur[cle] !== undefined)
    .flatMap((cle) => verifier(valeur[cle], description.champs[cle], sous(chemin, cle)));
  const regles = description.regles
    .map((regle) => regle(valeur))
    .filter(Boolean)
    .map((message) => `${ici(chemin)} : ${message}`);
  return [...absents, ...inconnus, ...champs, ...regles];
}

function verifierListe(valeur, description, chemin) {
  if (!Array.isArray(valeur)) return attendu(chemin, 'une liste', valeur);
  const trop = description.max !== undefined && valeur.length > description.max
    ? [`${ici(chemin)} : ${valeur.length} éléments, ${description.max} au plus`]
    : [];
  return [...trop, ...valeur.flatMap((element, i) => verifier(element, description.element, `${chemin}[${i}]`))];
}

function verifierScelle(valeur, chemin) {
  if (!estObjet(valeur)) return attendu(chemin, 'le résultat d\'un script (un objet avec son sceau)', valeur);
  if (typeof valeur.sceau !== 'string') return [`${ici(chemin)} : résultat de script sans sceau : range le résultat entier, sceau compris`];
  if (sceauValide(valeur)) return [];
  return [`${ici(chemin)} : le résultat ne correspond plus à son sceau, il a été modifié en le recopiant : range-le exactement tel que le script l'a rendu`];
}

function verifierUnDe(valeur, description, chemin) {
  const essais = description.descriptions.map((d) => verifier(valeur, d, chemin));
  if (essais.some((ecarts) => ecarts.length === 0)) return [];
  return essais.reduce((meilleur, ecarts) => (ecarts.length < meilleur.length ? ecarts : meilleur));
}

const VERIFICATIONS = {
  texte: (v, d, c) => {
    if (typeof v !== 'string') return attendu(c, 'un texte', v);
    return d.nonVide && !v.trim() ? [`${ici(c)} : texte vide`] : [];
  },
  nombre: (v, d, c) => (typeof v === 'number' && Number.isFinite(v) ? [] : attendu(c, 'un nombre', v)),
  entier: (v, d, c) => (Number.isInteger(v) ? [] : attendu(c, 'un nombre entier', v)),
  booleen: (v, d, c) => (typeof v === 'boolean' ? [] : attendu(c, 'true ou false', v)),
  libre: () => [],
  choix: (v, d, c) => (d.valeurs.includes(v) ? [] : [`${ici(c)} : ${apercu(v)} n'est pas une valeur permise (${d.valeurs.join(', ')})`]),
  motif: (v, d, c) => (typeof v === 'string' && d.re.test(v) ? [] : [`${ici(c)} : ${apercu(v)} ne suit pas le format attendu (${d.attendu})`]),
  liste: verifierListe,
  objet: verifierObjet,
  dico: (v, d, c) => (estObjet(v) ? Object.keys(v).flatMap((cle) => verifier(v[cle], d.valeur, sous(c, cle))) : attendu(c, 'un objet', v)),
  nul: (v, d, c) => (v === null ? [] : verifier(v, d.description, c)),
  unDe: verifierUnDe,
  scelle: (v, d, c) => verifierScelle(v, c),
};

/** Écarts entre une valeur et sa description ; liste vide si elle est conforme. */
export function verifier(valeur, description, chemin = '') {
  return VERIFICATIONS[description.sorte](valeur, description, chemin);
}
