// figma-ui-kit:script compteurs v1
const PARAMS = /*PARAMS*/{}/*FIN-PARAMS*/;
// Compteurs par écran : nœuds, propriétés (totales, par variable, par style), couleurs, tailles de texte,
// espacements, rayons, polices, textes sans style, copies détachées, instances, noms générés ; composants de la page.
// Paramètres : { pageId, cadres (facultatif), pagesKit, budgetMs (20000 par défaut) }. Lecture seule.
// --- commun ---
// Bloc partagé par tous les scripts de mesure (copie conforme de _commun.js).
// JSON canonique : clés triées, pour qu'un même contenu donne toujours le même texte.
function canon(valeur) {
  if (valeur === null || typeof valeur !== 'object') return JSON.stringify(valeur);
  if (Array.isArray(valeur)) return '[' + valeur.map(canon).join(',') + ']';
  return '{' + Object.keys(valeur).sort().map((cle) => JSON.stringify(cle) + ':' + canon(valeur[cle])).join(',') + '}';
}
// Sceau : FNV-1a 32 bits du JSON canonique, en hexadécimal sur 8 caractères.
function sceau(valeur) {
  const texte = canon(valeur);
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
// Parcours des nœuds comptés : visibles, instance comptée sans ses enfants,
// section traversée sans être comptée. `visite(noeud)` est appelée pour chaque nœud compté.
function parcourir(racine, visite) {
  const pile = [racine];
  while (pile.length) {
    const noeud = pile.pop();
    if (noeud.visible === false) continue;
    if (noeud.type !== 'SECTION') visite(noeud);
    if (noeud.type === 'INSTANCE') continue;
    const enfants = 'children' in noeud && noeud.children ? noeud.children : [];
    for (let i = enfants.length - 1; i >= 0; i--) pile.push(enfants[i]);
  }
}
// Cadres de premier niveau d'une page : enfants directs de la page ou d'une section.
// Un cadre invisible, ou rangé dans une section invisible, n'est pas un écran.
const TYPES_ECRAN = ['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE'];
function cadresDePremierNiveau(page) {
  const cadres = [];
  const pile = [...page.children].reverse();
  while (pile.length) {
    const noeud = pile.pop();
    if (noeud.visible === false) continue;
    if (noeud.type === 'SECTION') { for (let i = noeud.children.length - 1; i >= 0; i--) pile.push(noeud.children[i]); continue; }
    if (TYPES_ECRAN.includes(noeud.type)) cadres.push(noeud);
  }
  return cadres;
}
// Couleur d'un remplissage plein en hexadécimal, avec l'alpha s'il est sous 1.
function hexa(couleur, alpha) {
  const c = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  const base = (c(couleur.r) + c(couleur.g) + c(couleur.b)).toUpperCase();
  return alpha === undefined || alpha >= 1 ? base : base + c(alpha).toUpperCase();
}
// Texte sûr pour le transport, sur une seule ligne : les retours à la ligne
// (dont celui de Figma, U+2028, qui casse le transport) et les tabulations deviennent des espaces.
function texteSur(texte) {
  const separateurs = [0x2028, 0x2029, 0x0A, 0x0D, 0x09].map((code) => String.fromCharCode(code));
  return separateurs.reduce((reste, separateur) => reste.split(separateur).join(' '), String(texte));
}
// --- fin commun ---
const BUDGET_PAR_DEFAUT = 20000;
const NOM_GENERE = /^(Frame|Group|Rectangle|Ellipse|Vector|Line|Polygon|Star|Union|Subtract|Intersect|Exclude)( \d+)?$/;
const COTES_CONTOUR = ['strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'];
const COTES_PADDING = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'];
const COINS = ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'];
const CHAMPS_TEXTE = ['fontSize', 'fontName', 'fontWeight', 'textStyleId', 'boundVariables'];
const CHAMPS_COULEUR_TEXTE = ['fills', 'fillStyleId'];
const CHAMPS_TYPO = ['fontSize', 'fontName', 'textStyleId'];
const TOUT = () => true;

const trier = (objet) => Object.fromEntries(Object.keys(objet).sort().map((cle) => [cle, objet[cle]]));
const idDeStyle = (valeur) => typeof valeur === 'string' && valeur !== '';
const reliePar = (variable, style) => (variable ? 'variable' : (style ? 'style' : null));

function nouvelEcran() {
  return {
    noeuds: 0, nomsGeneres: 0, copiesDetachees: 0,
    proprietes: { total: 0, parVariable: 0, parStyle: 0 },
    couleurs: {}, taillesTexte: {}, espacements: {}, rayons: {}, polices: {},
    textes: { total: 0, sansStyle: 0 },
    instances: { total: 0, kit: 0, locales: 0, bibliotheques: {} },
  };
}
function incrementer(histogramme, cle) { histogramme[String(cle)] = (histogramme[String(cle)] || 0) + 1; }
function compterPropriete(acc, relie) {
  acc.proprietes.total += 1;
  if (relie === 'variable') acc.proprietes.parVariable += 1;
  if (relie === 'style') acc.proprietes.parStyle += 1;
}

// Remplissages et contours : pleins et dégradés visibles comptent, les images non.
function compterPeintures(acc, peintures, styleRelie) {
  for (const peinture of peintures) {
    if (peinture.visible === false || peinture.type === 'IMAGE') continue;
    compterPropriete(acc, reliePar(peinture.boundVariables && peinture.boundVariables.color, styleRelie));
    if (peinture.type === 'SOLID') incrementer(acc.couleurs, hexa(peinture.color, peinture.opacity === undefined ? 1 : peinture.opacity));
  }
}
function mesurerEpaisseurs(acc, noeud, permis) {
  if (!Array.isArray(noeud.strokes) || !noeud.strokes.some((peinture) => peinture.visible !== false)) return;
  const cotes = COTES_CONTOUR.filter((cle) => typeof noeud[cle] === 'number');
  const cles = cotes.length ? cotes : (typeof noeud.strokeWeight === 'number' ? ['strokeWeight'] : []);
  const lies = noeud.boundVariables || {};
  for (const cle of cles) {
    if (!noeud[cle] || !(permis(cle) || permis('strokeWeight'))) continue;
    compterPropriete(acc, reliePar(lies[cle] || lies.strokeWeight, false));
  }
}
function mesurerMiseEnPage(acc, noeud, permis) {
  if (!noeud.layoutMode || noeud.layoutMode === 'NONE') return;
  const lies = noeud.boundVariables || {};
  const mesurer = (cle) => {
    const valeur = noeud[cle];
    if (typeof valeur !== 'number' || valeur === 0 || !permis(cle)) return;
    compterPropriete(acc, reliePar(lies[cle], false));
    incrementer(acc.espacements, valeur);
  };
  COTES_PADDING.forEach(mesurer);
  if (noeud.primaryAxisAlignItems !== 'SPACE_BETWEEN') mesurer('itemSpacing');
}
function mesurerRayon(acc, noeud, permis) {
  const lies = noeud.boundVariables || {};
  const rayon = noeud.cornerRadius;
  if (typeof rayon === 'number') {
    if (rayon === 0 || !(permis('cornerRadius') || COINS.some(permis))) return;
    compterPropriete(acc, reliePar(lies.cornerRadius || COINS.some((coin) => lies[coin]), false));
    incrementer(acc.rayons, rayon);
    return;
  }
  if (rayon !== figma.mixed) return;
  for (const coin of COINS) {
    const valeur = noeud[coin];
    if (typeof valeur !== 'number' || valeur === 0 || !(permis(coin) || permis('cornerRadius'))) continue;
    compterPropriete(acc, reliePar(lies[coin] || lies.cornerRadius, false));
    incrementer(acc.rayons, valeur);
  }
}
function mesurerEffets(acc, noeud, permis) {
  if (!permis('effects') || !Array.isArray(noeud.effects)) return;
  const style = idDeStyle(noeud.effectStyleId);
  for (const effet of noeud.effects) {
    if (effet.visible === false) continue;
    const variable = effet.boundVariables && Object.keys(effet.boundVariables).length > 0;
    compterPropriete(acc, reliePar(variable, style));
  }
}
function mesurerOpacite(acc, noeud, permis) {
  if (!permis('opacity') || typeof noeud.opacity !== 'number' || noeud.opacity === 1) return;
  compterPropriete(acc, reliePar(noeud.boundVariables && noeud.boundVariables.opacity, false));
}
function mesurerTypo(acc, segments, permis) {
  if (!segments || !CHAMPS_TYPO.some(permis)) return;
  for (const segment of segments) {
    const lies = segment.boundVariables || {};
    const style = idDeStyle(segment.textStyleId);
    compterPropriete(acc, style ? 'style' : (lies.fontSize || lies.fontFamily ? 'variable' : null));
    incrementer(acc.taillesTexte, segment.fontSize);
    if (segment.fontName) incrementer(acc.polices, segment.fontName.family + '/' + segment.fontName.style);
  }
}
// Propriétés d'un nœud ; `permis(champ)` limite aux champs surchargés pour une instance.
// Le cadre d'un component set est un décor : hors de tous les compteurs de propriétés.
function mesurerNoeud(acc, noeud, permis, segments) {
  if (noeud.type === 'COMPONENT_SET') return;
  if (permis('fills')) mesurerRemplissages(acc, noeud);
  if (permis('strokes')) compterPeintures(acc, Array.isArray(noeud.strokes) ? noeud.strokes : [], idDeStyle(noeud.strokeStyleId));
  mesurerEpaisseurs(acc, noeud, permis);
  mesurerMiseEnPage(acc, noeud, permis);
  mesurerRayon(acc, noeud, permis);
  mesurerEffets(acc, noeud, permis);
  mesurerOpacite(acc, noeud, permis);
  mesurerTypo(acc, segments, permis);
}
// Remplissages d'un texte mixte : lus par segment, reliés par style si le segment en porte un.
function mesurerRemplissages(acc, noeud) {
  if (Array.isArray(noeud.fills)) return compterPeintures(acc, noeud.fills, idDeStyle(noeud.fillStyleId));
  if (noeud.type !== 'TEXT' || noeud.fills !== figma.mixed) return;
  for (const segment of noeud.getStyledTextSegments(CHAMPS_COULEUR_TEXTE)) {
    compterPeintures(acc, Array.isArray(segment.fills) ? segment.fills : [], idDeStyle(segment.fillStyleId));
  }
}
const segmentsDe = (noeud) => (noeud.type === 'TEXT' ? noeud.getStyledTextSegments(CHAMPS_TEXTE) : null);

function pageDe(noeud) {
  let courant = noeud;
  while (courant && courant.type !== 'PAGE') courant = courant.parent;
  return courant;
}
const nomsBibliothequesBrut = {};
async function ranger(acc, instance) {
  acc.instances.total += 1;
  const principal = await instance.getMainComponentAsync();
  if (principal && principal.remote === true) {
    const cle = principal.key || principal.id;
    incrementer(acc.instances.bibliotheques, cle);
    nomsBibliothequesBrut[cle] = texteSur(principal.name);
    return;
  }
  const pageDuComposant = principal ? pageDe(principal) : null;
  const estKit = pageDuComposant && (PARAMS.pagesKit || []).includes(pageDuComposant.id);
  acc.instances[estKit ? 'kit' : 'locales'] += 1;
}
// Une cible cachée, ou sous un parent caché de l'instance, ne compte pas.
function visibleJusqua(cible, instance) {
  for (let n = cible; n && n !== instance; n = n.parent) if (n.visible === false) return false;
  return true;
}
// Seules les modifications locales d'une instance comptent, sur le nœud surchargé.
async function mesurerSurcharges(acc, instance) {
  for (const surcharge of Array.isArray(instance.overrides) ? instance.overrides : []) {
    const cible = await figma.getNodeByIdAsync(surcharge.id);
    if (!cible || !visibleJusqua(cible, instance)) continue;
    const champs = new Set(surcharge.overriddenFields || []);
    mesurerNoeud(acc, cible, (champ) => champs.has(champ), segmentsDe(cible));
  }
}
function mesurerSimple(acc, noeud) {
  acc.noeuds += 1;
  if (NOM_GENERE.test(noeud.name)) acc.nomsGeneres += 1;
  if (noeud.detachedInfo != null) acc.copiesDetachees += 1;
  const segments = segmentsDe(noeud);
  if (segments) {
    acc.textes.total += 1;
    if (segments.some((segment) => !idDeStyle(segment.textStyleId))) acc.textes.sansStyle += 1;
  }
  mesurerNoeud(acc, noeud, TOUT, segments);
}
async function mesurerEcran(cadre) {
  const acc = nouvelEcran();
  const instances = [];
  parcourir(cadre, (noeud) => {
    if (noeud.type !== 'INSTANCE') return mesurerSimple(acc, noeud);
    acc.noeuds += 1;
    if (NOM_GENERE.test(noeud.name)) acc.nomsGeneres += 1;
    if (noeud.detachedInfo != null) acc.copiesDetachees += 1;
    instances.push(noeud);
  });
  for (const instance of instances) {
    await ranger(acc, instance);
    await mesurerSurcharges(acc, instance);
  }
  const mesure = {
    id: cadre.id, nom: texteSur(cadre.name), largeur: Math.round(cadre.width),
    noeuds: acc.noeuds, proprietes: acc.proprietes,
    couleurs: trier(acc.couleurs), taillesTexte: trier(acc.taillesTexte), espacements: trier(acc.espacements),
    rayons: trier(acc.rayons), polices: trier(acc.polices),
    textes: acc.textes, copiesDetachees: acc.copiesDetachees,
    instances: { ...acc.instances, bibliotheques: trier(acc.instances.bibliotheques) },
    nomsGeneres: acc.nomsGeneres,
  };
  return { ...mesure, sceau: sceau(mesure) };
}
function mesurerComposants(page) {
  const composants = page.findAll((noeud) => noeud.type === 'COMPONENT' || noeud.type === 'COMPONENT_SET');
  const sets = composants.filter((noeud) => noeud.type === 'COMPONENT_SET').length;
  const enSet = composants.filter((noeud) => noeud.type === 'COMPONENT' && noeud.parent && noeud.parent.type === 'COMPONENT_SET').length;
  const simples = composants.filter((noeud) => noeud.type === 'COMPONENT').length - enSet;
  const mesure = { sets, simples, variantes: enSet + simples };
  return { ...mesure, sceau: sceau(mesure) };
}

const page = await figma.getNodeByIdAsync(PARAMS.pageId);
if (!page || page.type !== 'PAGE') throw new Error('page introuvable : ' + PARAMS.pageId);
await figma.setCurrentPageAsync(page);

const demandes = PARAMS.cadres || [];
const tous = cadresDePremierNiveau(page);
const connus = new Set(tous.map((cadre) => cadre.id));
const fautifs = [...new Set(demandes.filter((id) => !connus.has(id)))];
if (fautifs.length) throw new Error('cadres inconnus sur cette page : ' + fautifs.join(', '));
const cadres = demandes.length ? tous.filter((cadre) => demandes.includes(cadre.id)) : tous;
const budgetMs = PARAMS.budgetMs ?? BUDGET_PAR_DEFAUT;
const debut = Date.now();
const ecrans = [];
const reste = [];
for (let i = 0; i < cadres.length; i++) {
  if (i > 0 && Date.now() - debut > budgetMs) { reste.push(...cadres.slice(i).map((cadre) => cadre.id)); break; }
  ecrans.push(await mesurerEcran(cadres[i]));
}

const resultat = { version: 1, page: { id: page.id, nom: texteSur(page.name) }, ecrans };
if (!demandes.length) resultat.composants = mesurerComposants(page);
resultat.nomsBibliotheques = trier(nomsBibliothequesBrut);
resultat.reste = reste;
return resultat;
