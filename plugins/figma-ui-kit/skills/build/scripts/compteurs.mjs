#!/usr/bin/env node
// Agrégation locale des mesures de Seiri : vérifie les sceaux, additionne les
// écrans retenus et écrit `scan/compteurs.json` dans le dossier `.uikit/`.
// Aucun calcul de tête : les sommes, unions et parts sont faites ici.
//
// Usage : node compteurs.mjs <dossier .uikit> [--tout]
//   --tout   retient tous les écrans mesurés hors pages de kit (ignore perimetre-valide.json)
// Sortie : une ligne de résumé. Code 1 si un bloc est invalide ou absent (le fichier
// est écrit quand même, avec `invalides`) ; code 2 si le dossier ou un fichier est illisible.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const IGNORES = new Set(['index.json', 'synthese.json', 'inventaire.json', 'compteurs.json']);
const USAGE = 'usage : node compteurs.mjs <dossier .uikit> [--tout]';

// JSON canonique et sceau : identiques à ceux de scripts/figma/_commun.js.
export function canon(valeur) {
  if (valeur === null || typeof valeur !== 'object') return JSON.stringify(valeur);
  if (Array.isArray(valeur)) return '[' + valeur.map(canon).join(',') + ']';
  return '{' + Object.keys(valeur).sort().map((cle) => JSON.stringify(cle) + ':' + canon(valeur[cle])).join(',') + '}';
}

export function sceau(valeur) {
  const texte = canon(valeur);
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Vrai si le sceau du bloc correspond à son contenu (sans le champ `sceau`). */
export function sceauValide(bloc) {
  if (bloc === null || typeof bloc !== 'object' || typeof bloc.sceau !== 'string') return false;
  const { sceau: attendu, ...contenu } = bloc;
  return sceau(contenu) === attendu;
}

/** Sépare les blocs d'une page (`mesures`) en valides et invalides. */
export function verifierSceaux(mesures, pageId) {
  const valides = { compteurs: [], contrastes: [], composants: null };
  const invalides = [];
  const trier = (ecrans, cible, bloc) => {
    for (const e of ecrans ?? []) {
      if (sceauValide(e)) cible.push(e);
      else invalides.push({ page: pageId, ecran: e?.id ?? null, motif: 'sceau', bloc });
    }
  };
  trier(mesures?.compteurs?.ecrans, valides.compteurs, 'compteurs');
  trier(mesures?.contrastes?.ecrans, valides.contrastes, 'contrastes');
  const comp = mesures?.compteurs?.composants;
  if (comp !== undefined) {
    if (sceauValide(comp)) valides.composants = comp;
    else invalides.push({ page: pageId, ecran: null, motif: 'sceau', bloc: 'composants' });
  }
  return { valides, invalides };
}

const nombre = (valeur) => (typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : 0);
const pourcent = (partie, total) => (total > 0 ? Math.round((partie / total) * 1000) / 10 : 0);
const parNombre = (a, b) => Number(a) - Number(b);
const parTexte = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Union d'histogrammes : occurrences additionnées, clés triées.
 * Les clés d'un objet JavaScript gardent leur ordre propre : les entiers positifs
 * d'abord, par ordre croissant, puis les autres clés (négatives, décimales) dans
 * l'ordre d'insertion, donc triées. Une clé négative passe donc en fin d'objet ;
 * c'est voulu, et fixé par un test.
 */
function unir(histogrammes, tri) {
  const somme = new Map();
  for (const h of histogrammes) {
    for (const [cle, n] of Object.entries(h ?? {})) somme.set(cle, (somme.get(cle) ?? 0) + nombre(n));
  }
  return Object.fromEntries([...somme.entries()].sort(([a], [b]) => tri(a, b)));
}

const estNombre = (cle) => cle.trim() !== '' && Number.isFinite(Number(cle));

/**
 * Valeurs hors échelle : pas un multiple de 4 (2 toléré sous 8), triées numériquement.
 * Sont ignorées : les clés non numériques, les valeurs nulles ou négatives (un
 * écart négatif est un chevauchement) et, si `plafond` est donné, les valeurs
 * qui l'atteignent (rayon plein).
 */
export function horsEchelle(histogramme, plafond = Infinity) {
  return Object.keys(histogramme)
    .filter((cle) => {
      if (!estNombre(cle)) return false;
      const v = Number(cle);
      return v > 0 && v < plafond && v % 4 !== 0 && v !== 2;
    })
    .sort(parNombre);
}

const RAYON_PLEIN = 100;

const somme = (ecrans, lire) => ecrans.reduce((total, e) => total + nombre(lire(e)), 0);

function famille(police) {
  const i = police.lastIndexOf('/');
  return i === -1 ? police : police.slice(0, i);
}

/** Agrège des écrans de compteurs (sceaux déjà vérifiés) avec les écrans de contrastes. */
export function agreger(ecrans, contrastes) {
  const noeuds = somme(ecrans, (e) => e.noeuds);
  const parVariable = somme(ecrans, (e) => e.proprietes?.parVariable);
  const parStyle = somme(ecrans, (e) => e.proprietes?.parStyle);
  const total = somme(ecrans, (e) => e.proprietes?.total);
  const kit = somme(ecrans, (e) => e.instances?.kit);
  const histogrammes = {
    couleurs: unir(ecrans.map((e) => e.couleurs), parTexte),
    taillesTexte: unir(ecrans.map((e) => e.taillesTexte), parNombre),
    espacements: unir(ecrans.map((e) => e.espacements), parNombre),
    rayons: unir(ecrans.map((e) => e.rayons), parNombre),
    polices: unir(ecrans.map((e) => e.polices), parTexte),
  };
  return {
    noeuds,
    proprietes: { total, parVariable, parStyle, partReliee: pourcent(parVariable + parStyle, total) },
    couleursUniques: Object.keys(histogrammes.couleurs).length,
    taillesTexte: Object.keys(histogrammes.taillesTexte).length,
    espacements: Object.keys(histogrammes.espacements).length,
    rayons: Object.keys(histogrammes.rayons).length,
    familles: new Set(Object.keys(histogrammes.polices).map(famille)).size,
    polices: Object.keys(histogrammes.polices).length,
    textes: { total: somme(ecrans, (e) => e.textes?.total), sansStyle: somme(ecrans, (e) => e.textes?.sansStyle) },
    copiesDetachees: somme(ecrans, (e) => e.copiesDetachees),
    // partKit : part des nœuds comptés qui sont des instances du kit (définition de controles.md).
    instances: { total: somme(ecrans, (e) => e.instances?.total), kit, partKit: pourcent(kit, noeuds) },
    nomsGeneres: somme(ecrans, (e) => e.nomsGeneres),
    contrastes: {
      textes: somme(contrastes, (e) => e.textes),
      echecs: somme(contrastes, (e) => e.echecs),
      indetermines: somme(contrastes, (e) => e.indetermines),
    },
    horsEchelle: { espacements: horsEchelle(histogrammes.espacements), rayons: horsEchelle(histogrammes.rayons, RAYON_PLEIN) },
    histogrammes,
  };
}

const idDePage = (mesures, repli) => mesures?.compteurs?.page?.id ?? mesures?.contrastes?.page?.id ?? repli;

const parClef = (a, b) => parTexte(`${a.page}|${a.ecran}|${a.motif}|${a.bloc}`, `${b.page}|${b.ecran}|${b.motif}|${b.bloc}`);

/** Écrans valides d'un bloc (`compteurs` ou `contrastes`), chacun avec l'identifiant de sa page. */
const avecPage = (verifiees, bloc) => verifiees.flatMap((v) => v.valides[bloc].map((ecran) => ({ page: v.id, ecran })));

/** Écarte les identifiants présents plusieurs fois : on ne sait pas quelle mesure est la bonne. */
function ecarterDoublons(elements, bloc) {
  const nombres = new Map();
  for (const { ecran } of elements) nombres.set(ecran.id, (nombres.get(ecran.id) ?? 0) + 1);
  const premiers = new Map();
  for (const { page, ecran } of elements) if (!premiers.has(ecran.id)) premiers.set(ecran.id, page);
  return {
    uniques: elements.filter(({ ecran }) => nombres.get(ecran.id) === 1),
    invalides: [...premiers].filter(([id]) => nombres.get(id) > 1).map(([id, page]) => ({ page, ecran: id, motif: 'doublon', bloc })),
  };
}

/** Écrans que le script n'a pas pu mesurer (`reste`), listés que l'écran soit retenu ou non. */
function nonMesures(pages) {
  return pages.flatMap((p) => ['compteurs', 'contrastes'].flatMap((bloc) => {
    const reste = p.mesures?.[bloc]?.reste;
    return Array.isArray(reste) ? reste.map((ecran) => ({ page: p.id, ecran, motif: 'non-mesure', bloc })) : [];
  }));
}

const idsDesEcrans = (pages) => new Set(pages.flatMap((p) => (p.mesures?.compteurs?.ecrans ?? []).map((e) => e?.id)));

/**
 * Document `compteurs.json` à partir des pages mesurées.
 * `pages` : [{ id, mesures }] ; `idsKit` : Set des pages de kit ; `perimetre` : liste d'identifiants ou null.
 */
export function construire({ pages, idsKit, perimetre }) {
  const verifiees = pages.map((p) => ({ id: p.id, ...verifierSceaux(p.mesures, p.id) }));
  const mesures = idsDesEcrans(pages.filter((p) => !idsKit.has(p.id)));
  const kitIds = idsDesEcrans(pages.filter((p) => idsKit.has(p.id)));
  const retenus = perimetre === null ? [...mesures] : [...new Set(perimetre)].filter((id) => !kitIds.has(id));
  const gardes = new Set(retenus);
  const comp = ecarterDoublons(avecPage(verifiees, 'compteurs'), 'compteurs');
  const contr = ecarterDoublons(avecPage(verifiees, 'contrastes'), 'contrastes');
  const horsKit = (liste) => liste.filter((x) => !idsKit.has(x.page) && gardes.has(x.ecran.id));
  const duKit = (liste) => liste.filter((x) => idsKit.has(x.page)).map((x) => x.ecran);
  const ecrans = horsKit(comp.uniques);
  const sansContraste = horsKit(contr.uniques).map((x) => x.ecran.id);
  const invalides = [
    ...verifiees.flatMap((v) => v.invalides), ...comp.invalides, ...contr.invalides, ...nonMesures(pages),
    ...retenus.filter((id) => !mesures.has(id)).map((id) => ({ page: null, ecran: id, motif: 'absent', bloc: 'compteurs' })),
    ...ecrans.filter((x) => !sansContraste.includes(x.ecran.id)).map((x) => ({ page: x.page, ecran: x.ecran.id, motif: 'absent-contraste', bloc: 'contrastes' })),
  ];
  const sommes = verifiees.map((v) => v.valides.composants).filter(Boolean);
  return {
    version: 1,
    ecransRetenus: retenus.length,
    ecransMesures: ecrans.length,
    ecrans: agreger(ecrans.map((x) => x.ecran), horsKit(contr.uniques).map((x) => x.ecran)),
    kit: verifiees.some((v) => idsKit.has(v.id)) ? agreger(duKit(comp.uniques), duKit(contr.uniques)) : null,
    composants: {
      sets: somme(sommes, (c) => c.sets),
      simples: somme(sommes, (c) => c.simples),
      variantes: somme(sommes, (c) => c.variantes),
    },
    invalides: invalides.sort(parClef),
  };
}

/** Lit un fichier JSON ; en cas d'échec, l'erreur nomme le fichier. */
function lireJson(chemin, nom) {
  try {
    return JSON.parse(readFileSync(chemin, 'utf8'));
  } catch (erreur) {
    throw new Error(`${nom} : ${erreur.message}`);
  }
}

function lireFacultatif(chemin, nom) {
  try {
    readFileSync(chemin);
  } catch (erreur) {
    if (erreur.code === 'ENOENT') return null;
    throw new Error(`${nom} : ${erreur.message}`);
  }
  return lireJson(chemin, nom);
}

/** Refuse une liste d'écrans qui n'est pas un tableau : l'erreur nomme le fichier. */
function verifierForme(mesures, nom) {
  for (const bloc of ['compteurs', 'contrastes']) {
    const ecrans = mesures[bloc]?.ecrans;
    if (ecrans !== undefined && !Array.isArray(ecrans)) throw new Error(`${nom} : mesures.${bloc}.ecrans doit être un tableau`);
  }
}

/** Pages mesurées du dossier `scan/` : seuls les fichiers qui portent `mesures`. */
export function lirePages(dossier) {
  const noms = readdirSync(join(dossier, 'scan')).filter((n) => n.endsWith('.json') && !IGNORES.has(n)).sort();
  const pages = [];
  for (const nom of noms) {
    const contenu = lireJson(join(dossier, 'scan', nom), `scan/${nom}`);
    if (contenu && typeof contenu === 'object' && contenu.mesures) {
      verifierForme(contenu.mesures, `scan/${nom}`);
      pages.push({ id: idDePage(contenu.mesures, nom.replace(/\.json$/, '')), mesures: contenu.mesures });
    }
  }
  return pages;
}

/** Identifiants de page de rôle `kit` dans `survol.json`. */
export function pagesDeKit(survol) {
  return new Set((survol?.pages ?? []).filter((p) => p?.role === 'kit').map((p) => p.id));
}

/** Identifiants retenus dans `perimetre-valide.json` (chaînes ou objets avec `id`), ou null. */
export function idsDuPerimetre(perimetre) {
  if (!perimetre || !Array.isArray(perimetre.ecrans)) return null;
  return perimetre.ecrans.map((e) => (typeof e === 'string' ? e : e?.id)).filter((id) => typeof id === 'string');
}

function principal() {
  const args = process.argv.slice(2);
  const tout = args.includes('--tout');
  const dossier = args.find((a) => !a.startsWith('--'));
  if (!dossier) {
    console.error(USAGE);
    process.exit(2);
  }
  let document;
  try {
    const pages = lirePages(dossier);
    const survol = lireFacultatif(join(dossier, 'survol.json'), 'survol.json');
    if (survol === null) console.error('survol.json absent : les pages du kit ne sont pas distinguées des écrans');
    const idsKit = pagesDeKit(survol);
    const perimetre = tout ? null : idsDuPerimetre(lireFacultatif(join(dossier, 'perimetre-valide.json'), 'perimetre-valide.json'));
    document = construire({ pages, idsKit, perimetre });
    writeFileSync(join(dossier, 'scan', 'compteurs.json'), JSON.stringify(document, null, 2) + '\n');
  } catch (erreur) {
    console.error(`compteurs.mjs : ${erreur.message}\n${USAGE}`);
    process.exit(2);
  }
  const n = document.invalides.length;
  process.stdout.write(`${document.ecransMesures} écrans agrégés sur ${document.ecransRetenus} retenus, ${n} bloc${n > 1 ? 's' : ''} invalide${n > 1 ? 's' : ''} ou absent${n > 1 ? 's' : ''}\n`);
  process.exit(n > 0 ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) principal();
