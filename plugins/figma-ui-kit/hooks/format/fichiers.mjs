// Formats des fichiers de .uikit/, tels que les décrit references/donnees.md.
// Le premier niveau de chaque fichier est fermé : une clé mal écrite est refusée.
// Un fichier se remplit au fur et à mesure : seules les clés présentes sont contrôlées,
// sauf les rares champs obligatoires d'un fichier écrit d'un seul coup.
// Un élément de liste, lui, s'écrit en entier : ses champs obligatoires sont exigés.
import { booleen, choix, dico, entier, libre, liste, motif, nombre, nul, objet, scelle, texte, unDe } from './types.mjs';
import { blocCiteSaFamille, citationsDe, FAMILLE, familleRetiree, identifiantsUniques, liensInventaire } from './familles.mjs';

const NOEUD = motif(/^I?\d+:\d+(;\d+:\d+)*$/, 'identifiant de nœud Figma, par exemple 2334:193');
const CONSTAT = motif(/^C\d{3,}$/, 'C et trois chiffres au moins, par exemple C007');
const BLOC = motif(/^B\d{3,}$/, 'B et trois chiffres au moins, par exemple B012');
const DATE = motif(/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/, 'date AAAA-MM-JJ, par exemple 2026-11-26');
const LIEN_FIGMA = motif(/^https:\/\/(www\.)?figma\.com\/\S+$/, 'lien https://www.figma.com/…');
const CRITERE_RGAA = motif(/^\d{1,2}\.\d{1,2}$/, 'numéro de critère RGAA, par exemple 3.2');
const AGENTS = ['seiri', 'seiton', 'seiso', 'seiketsu'];
const NOEUDS_CONSTAT = 20;
const NOEUDS_FORME = 3;
const NOEUDS_BLOC = 5;

const ferme = (champs, requis = [], regles = []) => objet(champs, { ferme: true, requis, regles });
const element = (champs, requis, regles = []) => objet(champs, { requis, regles });

const CONSTAT_SCAN = element({
  id: CONSTAT, type: texte({ nonVide: true }), noeuds: liste(texte(), { max: NOEUDS_CONSTAT }),
  valeurs: libre(), occurrences: nombre(), mesure: libre(), remplace: nul(unDe(CONSTAT, liste(CONSTAT))),
  confiance: choix('forte', 'faible'),
}, ['id', 'type']);

const ECRAN_COMPTE = element({ id: NOEUD, nom: texte(), compteurs: libre() }, ['id']);

const MESURES_PAGE = ferme({
  compteurs: ferme({ version: entier(), page: libre(), ecrans: liste(scelle()), composants: scelle(), nomsBibliotheques: libre(), reste: liste(NOEUD) }),
  contrastes: ferme({ version: entier(), page: libre(), ecrans: liste(scelle()), reste: liste(NOEUD) }),
});

const CONSTATS_PAGE = { inventaire: libre(), ecrans: liste(ECRAN_COMPTE), constats: liste(CONSTAT_SCAN) };
const PAGE_SCAN = ferme({ ...CONSTATS_PAGE, mesures: MESURES_PAGE });
// Un delta ne porte pas de mesures : compteurs.mjs lit tout scan/, il les compterait deux fois.
const DELTA = ferme(CONSTATS_PAGE);

const TYPE_PRODUIT = element({
  type: choix('e-commerce', 'saas', 'communaute', 'vitrine', 'autre'), confiance: libre(), indices: liste(texte()),
}, ['type']);

const SURVOL = ferme({
  fichier: element({ nomDansLeLien: texte(), lien: LIEN_FIGMA, date: DATE, pages: entier() }, []),
  pages: liste(element({
    id: NOEUD, nom: texte(), role: choix('ecrans', 'couverture', 'separateur', 'kit', 'plugin'), cadres: entier(),
    sections: liste(libre()), prefixes: liste(element({ prefixe: texte(), occurrences: entier() }, ['prefixe', 'occurrences'])),
    autresNoeuds: liste(element({ id: NOEUD, nom: texte(), type: texte() }, ['id'])),
  }, ['id', 'nom', 'role'])),
  motsRecurrents: liste(element({ mot: texte(), occurrences: entier() }, ['mot', 'occurrences'])),
  versions: liste(element({ nom: texte(), page: NOEUD }, ['nom'])),
  nomsEnDouble: liste(element({ nom: texte(), ids: liste(NOEUD) }, ['nom', 'ids'])),
  local: element({
    stylesCouleur: entier(), stylesTexte: entier(), stylesEffet: entier(), stylesGrille: entier(), collections: liste(libre()),
  }, []),
  bibliotheques: element({
    ajoutees: liste(element({ nom: texte(), cle: nul(texte()), description: nul(texte()) }, ['nom'])),
    composants: liste(element({ nom: texte(), cle: nul(texte()), instances: entier() }, ['nom'])),
  }, []),
  kitExistant: nul(element({ pageId: NOEUD, pages: liste(NOEUD), composants: libre(), collections: libre() }, [])),
  // Lues telles quelles dans la Revue : la date garde la forme écrite dans le fichier.
  decisionsFigma: liste(element({ theme: texte(), decision: texte({ nonVide: true }), date: texte() }, ['decision'])),
  mesures: scelle(),
  typeProduit: liste(TYPE_PRODUIT),
});

const FICHE = ferme({
  lien: LIEN_FIGMA, nom: texte({ nonVide: true }), date: DATE, dossier: texte({ nonVide: true }),
  git: choix('hors-git', 'versionne', 'pas-de-depot'),
  diagnostic: nul(element({ date: DATE, rapport: texte({ nonVide: true }), partiel: booleen() }, ['date', 'rapport', 'partiel'])),
}, ['lien', 'nom', 'date', 'dossier', 'git']);

const ESPACE = element({ nom: texte(), racine: nul(NOEUD), ecrans: liste(NOEUD) }, ['nom', 'ecrans']);

const PERIMETRE = ferme({
  ecrans: liste(element({ id: NOEUD, nom: texte(), page: NOEUD, largeur: nombre() }, ['id', 'nom', 'page'])),
  exclus: liste(element({ id: NOEUD, nom: texte(), page: NOEUD, motif: texte({ nonVide: true }) }, ['id', 'motif'])),
  exclusCompte: entier(),
  doublons: liste(element({
    ids: liste(NOEUD), noms: liste(texte()), nature: choix('copie', 'variante', 'iteration'),
    ressemblance: element({ structure: nombre(), textes: nombre() }, []), difference: texte(),
  }, ['ids', 'nature'])),
  liens: liste(element({ de: NOEUD, vers: NOEUD }, ['de', 'vers'])),
  groupes: liste(element({ nom: texte(), ecrans: liste(NOEUD), indice: libre() }, ['nom', 'ecrans'])),
  arbre: liste(element({ id: NOEUD, parent: nul(NOEUD), profondeur: entier(), indice: libre(), confiance: libre() }, ['id'])),
  espaces: liste(ESPACE),
  couverture: nul(element({ id: NOEUD, nom: texte() }, ['id'])),
  kitExistant: nul(element({
    familles: liste(element({ nom: texte({ nonVide: true }), conforme: libre(), ecarts: libre() }, ['nom'])),
    partReliee: nombre(), faitParKatiro: booleen(),
  }, [])),
});

const PERIMETRE_VALIDE = ferme({
  ecrans: liste(unDe(NOEUD, element({ id: NOEUD }, ['id']))),
  doublons: liste(element({ ids: liste(NOEUD), retenu: NOEUD }, ['ids', 'retenu'])),
  parcours: liste(element({ nom: texte(), ecrans: liste(NOEUD) }, ['nom', 'ecrans'])),
  arbre: liste(element({ id: NOEUD, parent: nul(NOEUD), profondeur: entier() }, ['id'])),
  espaces: liste(ESPACE),
  horsLot: liste(NOEUD),
  typeProduit: liste(TYPE_PRODUIT),
  kitExistant: choix('complete', 'verifie', 'repris', 'intact', 'aucun'),
  couverture: choix('gardee', 'rangee', 'aucune'),
});

const INDEX_SCAN = ferme({
  portee: element({ pages: liste(NOEUD), date: DATE, origine: choix('diagnostic', 'build') }, []),
  pages: liste(element({
    id: NOEUD, nom: texte(), etat: choix('a-faire', 'en-cours', 'fait'), curseur: libre(), empreinte: nul(scelle()),
  }, ['id', 'etat'])),
});

const horsKitAvecMotif = (bloc) => (bloc.statut === 'hors-kit' && !(typeof bloc.motif === 'string' && bloc.motif.trim())
  ? 'un bloc « hors-kit » dit pourquoi dans motif' : null);

const INVENTAIRE = ferme({
  blocs: liste(element({
    id: BLOC, nomProbable: texte(), catalogue: texte(),
    formes: liste(element({ id: texte(), occurrences: entier(), part: nombre(), ecrans: liste(libre()), noeuds: liste(texte(), { max: NOEUDS_FORME }), ecarts: libre() }, ['id'])),
    signature: libre(), occurrences: entier(), calques: entier(), ecrans: liste(libre()), noeuds: liste(texte(), { max: NOEUDS_BLOC }),
    variantesObservees: liste(element({ description: texte(), occurrences: entier(), noeuds: liste(texte()) }, ['description'])),
    interactif: booleen(), niveauPropose: libre(), familleProposee: nul(FAMILLE),
    statut: choix('famille', 'hors-kit', 'a-trancher'), motif: nul(texte()), confiance: libre(),
  }, ['id', 'statut'], [horsKitAvecMotif, blocCiteSaFamille])),
  familles: liste(element({
    id: FAMILLE, nom: texte({ nonVide: true }), niveau: libre(), blocs: liste(BLOC), variantesObservees: liste(libre()), variantesNonVues: liste(libre()),
    fusionneeDans: FAMILLE, abandonnee: texte({ nonVide: true }), issueDe: FAMILLE,
  }, ['id', 'nom', 'blocs'], [familleRetiree])),
  catalogue: element({
    types: liste(libre()), trouves: liste(element({ element: texte(), formes: entier(), occurrences: entier() }, ['element'])),
    attendusNonVus: liste(libre()), specifiques: liste(libre()),
  }, []),
  couverture: libre(),
}, [], [identifiantsUniques('blocs'), identifiantsUniques('familles'), liensInventaire]);

const VERIFICATION = ferme({
  ecarts: liste(element({
    id: texte({ nonVide: true }), noeud: texte(), regle: texte({ nonVide: true }), constate: libre(), attendu: libre(),
    decision: choix('aucune', 'a-prendre'), etat: choix('ouvert', 'corrige'),
  }, ['id', 'regle', 'decision', 'etat'])),
  familles: liste(element({
    id: FAMILLE, nom: texte({ nonVide: true }), set: nul(texte()), statut: choix('bon', 'a-corriger', 'a-revoir'),
    recommandations: liste(element({
      id: texte({ nonVide: true }), gravite: choix('bloquant', 'important', 'confort'), constat: libre(), noeuds: liste(texte()),
      recommandation: texte({ nonVide: true }), changeRendu: booleen(), decision: libre(),
    }, ['id', 'gravite', 'recommandation'])),
  }, ['nom', 'statut'])),
  presentation: liste(element({ id: texte({ nonVide: true }), noeud: texte(), constat: libre(), attendu: libre(), etat: choix('ouvert', 'corrige') }, ['id', 'etat'])),
  ecransIntacts: nul(element({ empreinte: libre(), identique: booleen() }, ['identique'])),
  resteAFaire: liste(element({ section: texte(), constat: texte({ nonVide: true }), noeuds: liste(texte()) }, ['constat'])),
});

const SYNTHESE = ferme({
  compteurs: libre(),
  ecrans: liste(ECRAN_COMPTE),
  constats: libre(),
  grilles: liste(libre()),
  logo: libre(),
  couverture: libre(),
  partiel: nul(element({ pagesNonScannees: liste(NOEUD), motif: texte({ nonVide: true }) }, ['pagesNonScannees', 'motif'])),
});

const PLAN_ECRAN = ferme({
  id: NOEUD, nom: texte(), compteurs: libre(),
  remplacements: liste(element({
    noeud: texte(), famille: FAMILLE, decision: libre(), zoneLibre: element({ l: nombre(), h: nombre() }, ['l', 'h']),
    largeurContenu: nombre(), disposition: libre(),
  }, ['noeud', 'famille'])),
  liaisons: libre(), corrections: libre(),
  cas: liste(element({ noeud: texte(), motif: choix('disposition-absente', 'zone-trop-petite', 'autre') }, ['noeud', 'motif'])),
  manquesKit: liste(element({
    noeud: texte(), famille: nul(FAMILLE), bloc: BLOC, type: choix('variante-manquante', 'famille-manquante', 'logo-non-surchargeable', 'couleur-sans-role', 'autre'), detail: libre(),
  }, ['type'])),
});

const ACCESSIBILITE = ferme({
  criteres: liste(element({
    critere: CRITERE_RGAA, classe: choix('M', 'P', 'X'), statut: libre(), ecrans: liste(texte()), noeuds: liste(texte()),
    mesure: libre(), proposition: libre(), doute: libre(),
  }, ['critere', 'classe'])),
});

const IDS = ferme({
  pages: libre(), collections: libre(), modes: libre(), variables: libre(), styles: libre(),
  composants: dico(element({ id: texte({ nonVide: true }), page: texte(), famille: FAMILLE }, ['id'])),
  avant: libre(),
  archives: liste(element({ id: texte({ nonVide: true }), remplacePar: nul(texte()), decision: libre() }, ['id'])),
  copies: liste(element({ original: NOEUD, copie: NOEUD }, ['original', 'copie'])),
  remplacements: liste(element({ origine: texte(), instance: texte(), ecran: texte() }, ['origine', 'instance', 'ecran'])),
  presentation: libre(), icones: libre(),
  // Début d'un lot : par page, le résultat d'empreinte.js tel quel, comparé par Seiketsu à son sceau.
  lots: dico(element({ debut: dico(scelle()), familles: liste(element({ id: FAMILLE, nom: texte({ nonVide: true }), variantesObservees: liste(libre()) }, ['id', 'nom'])) }, [])),
  notesTechniques: libre(),
});

const PROGRESSION = ferme({
  agent: choix(...AGENTS), mode: texte({ nonVide: true }),
  etat: choix('en_cours', 'fait', 'incomplet'), resume: texte({ nonVide: true }),
}, ['agent', 'mode', 'etat', 'resume']);

const objetOuVide = (valeur) => (valeur && typeof valeur === 'object' && !Array.isArray(valeur) ? valeur : {});

/** Familles citées par ids.json : composants et familles de chaque lot (traces passées). */
const citationsIds = (ids) => [
  ...Object.entries(objetOuVide(ids.composants))
    .filter(([, c]) => typeof c?.famille === 'string').map(([nom, c]) => ({ chemin: `composants.${nom}.famille`, id: c.famille })),
  ...Object.entries(objetOuVide(ids.lots)).flatMap(([lot, l]) => citationsDe(l?.familles, `lots.${lot}.familles`, 'id')),
];
/** Familles citées par un plan d'écran. */
const citationsPlan = (plan) => [
  ...citationsDe(plan.remplacements, 'remplacements', 'famille'),
  ...citationsDe(plan.manquesKit, 'manquesKit', 'famille'),
];
const citationsVerification = (verification) => citationsDe(verification.familles, 'familles', 'id');

const REFERENCE = motif(/^([RDQ]\d+|[CBF]\d{3,}|P\d+-\d{2,}|[KE]\d{2,})$/, 'identifiant du chantier : R3, D12, Q4, C012, B001, F004, P3-02, K01 ou E01');
const lancementComplet = (ligne) => (ligne.type === 'lancement'
  ? ['agent', 'appels'].filter((cle) => ligne[cle] === undefined).map((cle) => `un lancement dit ${cle === 'agent' ? "l'agent lancé" : "les appels Figma consommés"} (${cle})`)
  : null);

/** Une ligne de journal.jsonl : un événement du chantier, daté, écrit par scripts/journal.mjs. */
export const LIGNE_JOURNAL = ferme({
  date: DATE, commande: choix('diagnostic', 'build', 'templates', 'accessibilite'),
  type: choix('demarrage', 'lancement', 'decision', 'execution', 'reprise', 'recette', 'arret', 'cloture', 'note'),
  texte: texte({ nonVide: true }), agent: choix(...AGENTS), mode: texte({ nonVide: true }),
  appels: entier({ min: 0 }), economises: entier({ min: 0 }), refs: liste(REFERENCE),
}, ['date', 'commande', 'type', 'texte'], [lancementComplet]);

const NIVEAUX = 'fondations|atomes|molecules|organismes|kit|correction|coherence|ecran-I?\\d+-\\d+[\\d;-]*';

/**
 * Fichiers de .uikit/, dans l'ordre où l'on cherche le nom.
 * `nom` : le nom tel que l'écrit donnees.md ; `chemin` : le chemin relatif à .uikit/.
 * `format` : la description du contenu ; `script` : fichier écrit par un script, jamais à la main ;
 * `copieDe` : fichier qui doit être la copie conforme d'un autre ;
 * `citations` : (contenu) => familles citées, recoupées avec scan/inventaire.json.
 */
export const FICHIERS = Object.freeze([
  { nom: 'survol.json', chemin: /^survol\.json$/, format: SURVOL },
  { nom: 'fichier.json', chemin: /^fichier\.json$/, format: FICHE },
  { nom: 'perimetre.json', chemin: /^perimetre\.json$/, format: PERIMETRE },
  { nom: 'perimetre-valide.json', chemin: /^perimetre-valide\.json$/, format: PERIMETRE_VALIDE },
  { nom: 'scan/index.json', chemin: /^scan\/index\.json$/, format: INDEX_SCAN },
  { nom: 'scan/inventaire.json', chemin: /^scan\/inventaire\.json$/, format: INVENTAIRE },
  { nom: 'scan/synthese.json', chemin: /^scan\/synthese\.json$/, format: SYNTHESE },
  { nom: 'scan/compteurs.json', chemin: /^scan\/compteurs\.json$/, script: 'scripts/compteurs.mjs' },
  { nom: 'scan/compteurs-avant.json', chemin: /^scan\/compteurs-avant\.json$/, copieDe: 'scan/compteurs.json' },
  { nom: 'scan/delta-P{phase}.json', chemin: /^scan\/delta-P\d+\.json$/, format: DELTA },
  { nom: 'scan/plan-{ecranId}.json', chemin: /^scan\/plan-I?\d+-\d+[\d;-]*\.json$/, format: PLAN_ECRAN, citations: citationsPlan },
  { nom: 'scan/{pageId}.json', chemin: /^scan\/\d+-\d+\.json$/, format: PAGE_SCAN },
  { nom: 'verification-{niveau}.json', chemin: new RegExp(`^verification-(${NIVEAUX})\\.json$`), format: VERIFICATION, citations: citationsVerification },
  { nom: 'accessibilite.json', chemin: /^accessibilite\.json$/, format: ACCESSIBILITE },
  { nom: 'ids.json', chemin: /^ids\.json$/, format: IDS, citations: citationsIds },
  { nom: 'progression.json', chemin: /^progression\.json$/, format: PROGRESSION },
  { nom: 'journal.jsonl', chemin: /^journal\.jsonl$/, script: 'scripts/journal.mjs' },
].map(Object.freeze));

/** Fichier de .uikit/ qui correspond à un chemin relatif, ou `undefined`. */
export const fichierPour = (relatif) => FICHIERS.find((f) => f.chemin.test(relatif));
