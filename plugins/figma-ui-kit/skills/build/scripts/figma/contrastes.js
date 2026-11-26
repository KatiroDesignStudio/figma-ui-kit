// figma-ui-kit:script contrastes v1
const PARAMS = /*PARAMS*/{}/*FIN-PARAMS*/;
// Contraste de chaque texte contre son fond réel, écran par écran (WCAG 2.2 AA).
// Paramètres : { pageId, cadres (facultatif), budgetMs (20 000 par défaut) }. Lecture seule.
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
const MAX_EXEMPLES = 20;
const LONGUEUR_TEXTE = 40;
const BUDGET_DEFAUT = 20000;
const SEUIL_NORMAL = 4.5;
const SEUIL_GRAND = 3;
const RANG = { correct: 0, indetermine: 1, echec: 2 };

const estRacine = (noeud) => !noeud || noeud.type === 'PAGE' || noeud.type === 'DOCUMENT';
const pleinsVisibles = (noeud) => (Array.isArray(noeud.fills) ? noeud.fills : []).filter((p) => p.visible !== false);

// Opacité cumulée d'un nœud et de ses parents jusqu'à la page.
function opaciteCumulee(noeud) {
  let alpha = 1;
  for (let n = noeud; !estRacine(n); n = n.parent) alpha *= n.opacity ?? 1;
  return alpha;
}
// « Source par-dessus », canal par canal.
function composer(dessus, alpha, dessous) {
  const mix = (a, b) => a * alpha + b * (1 - alpha);
  return { r: mix(dessus.r, dessous.r), g: mix(dessus.g, dessous.g), b: mix(dessus.b, dessous.b) };
}
function luminance(c) {
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}
// Couleur arrondie sur 8 bits, celle que l'exemple affiche en hexadécimal.
const sur8bits = (c) => ({ r: Math.round(c.r * 255) / 255, g: Math.round(c.g * 255) / 255, b: Math.round(c.b * 255) / 255 });
function ratioDe(a, b) {
  const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (sombre + 0.05);
}
const seuilDe = (taille, graisse) => (taille >= 24 || (taille >= 18.66 && graisse >= 700) ? SEUIL_GRAND : SEUIL_NORMAL);

// Fond d'un texte : { couleur, parDefaut } ou { indetermine: true } (dégradé ou image avant un fond opaque).
function mesurerFond(texteNoeud) {
  const couches = [];
  let base = null;
  for (let p = texteNoeud.parent; !estRacine(p) && !base; p = p.parent) {
    const pleins = pleinsVisibles(p);
    const opacite = opaciteCumulee(p);
    for (let i = pleins.length - 1; i >= 0 && !base; i--) {
      if (pleins[i].type !== 'SOLID') return { indetermine: true };
      const alpha = (pleins[i].opacity ?? 1) * opacite;
      if (alpha >= 1) base = pleins[i].color;
      else couches.push({ couleur: pleins[i].color, alpha });
    }
  }
  let fond = base ?? { r: 1, g: 1, b: 1 };
  for (let i = couches.length - 1; i >= 0; i--) fond = composer(couches[i].couleur, couches[i].alpha, fond);
  return { couleur: fond, parDefaut: !base };
}

// Un frère placé dessous, visible, rempli, dont la boîte recouvre celle du texte.
function recouvre(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}
function estApproximatif(texteNoeud) {
  const boite = texteNoeud.absoluteBoundingBox;
  const freres = texteNoeud.parent && texteNoeud.parent.children ? texteNoeud.parent.children : [];
  if (!boite) return false;
  for (const frere of freres) {
    if (frere.id === texteNoeud.id) return false;
    if (frere.visible === false || !frere.absoluteBoundingBox || !pleinsVisibles(frere).length) continue;
    if (recouvre(boite, frere.absoluteBoundingBox)) return true;
  }
  return false;
}

// Couleur du segment : pleins du dessus composés sur ceux du dessous. { couleur, alpha } ou null (dégradé, image, rien).
function couleurDuSegment(segment) {
  const pleins = (Array.isArray(segment.fills) ? segment.fills : []).filter((p) => p.visible !== false);
  const couches = [];
  for (let i = pleins.length - 1; i >= 0; i--) {
    if (pleins[i].type !== 'SOLID') return null;
    const alpha = pleins[i].opacity ?? 1;
    couches.push({ couleur: pleins[i].color, alpha });
    if (alpha >= 1) break;
  }
  if (!couches.length) return null;
  let cumul = { couleur: couches[couches.length - 1].couleur, alpha: couches[couches.length - 1].alpha };
  for (let i = couches.length - 2; i >= 0; i--) {
    const alpha = couches[i].alpha + cumul.alpha * (1 - couches[i].alpha);
    const poids = cumul.alpha * (1 - couches[i].alpha) / alpha;
    cumul = { couleur: composer(couches[i].couleur, 1 - poids, cumul.couleur), alpha };
  }
  return cumul;
}

// Mesure d'un segment : { etat, couleur, fond, ratio?, seuil? }.
function mesurerSegment(segment, texteNoeud, fond) {
  const plein = couleurDuSegment(segment);
  const fondHexa = fond.indetermine ? null : hexa(fond.couleur);
  if (!plein) return { etat: 'indetermine', couleur: null, fond: fondHexa };
  if (fond.indetermine) return { etat: 'indetermine', couleur: hexa(plein.couleur), fond: null };
  const composee = sur8bits(composer(plein.couleur, plein.alpha * opaciteCumulee(texteNoeud), fond.couleur));
  const ratio = ratioDe(composee, sur8bits(fond.couleur));
  const seuil = seuilDe(segment.fontSize, segment.fontWeight ?? 400);
  return { etat: ratio < seuil ? 'echec' : 'correct', couleur: hexa(composee), fond: fondHexa, ratio: Math.round(ratio * 100) / 100, seuil, brut: ratio };
}
// Le pire de deux segments : l'état le plus grave, puis le ratio le plus bas.
function pireDe(a, b) {
  if (!a || RANG[b.etat] > RANG[a.etat]) return b;
  return RANG[b.etat] === RANG[a.etat] && b.brut < a.brut ? b : a;
}

// Mesure d'un texte : le pire de ses segments, exemple prêt à ranger.
function mesurerTexte(texteNoeud) {
  const fond = mesurerFond(texteNoeud);
  const segments = texteNoeud.getStyledTextSegments(['fontSize', 'fontWeight', 'fills']);
  let pire = null;
  for (const segment of segments) {
    const mesure = mesurerSegment(segment, texteNoeud, fond);
    pire = pireDe(pire, mesure);
  }
  const { brut, ...mesureRendue } = pire;
  const exemple = { noeud: texteNoeud.id, texte: texteSur(texteNoeud.characters).slice(0, LONGUEUR_TEXTE), ...mesureRendue };
  if (fond.parDefaut) exemple.fondParDefaut = true;
  const approximatif = estApproximatif(texteNoeud);
  if (approximatif) exemple.approximatif = true;
  return { exemple, approximatif };
}

// Parcours des textes affichés : visibles, instances comprises (on juge ce que l'écran montre).
function parcourirAffiche(racine, visite) {
  const pile = [racine];
  while (pile.length) {
    const noeud = pile.pop();
    if (noeud.visible === false) continue;
    visite(noeud);
    const enfants = 'children' in noeud && noeud.children ? noeud.children : [];
    for (let i = enfants.length - 1; i >= 0; i--) pile.push(enfants[i]);
  }
}

function mesurerEcran(cadre) {
  const mesures = [];
  parcourirAffiche(cadre, (noeud) => {
    if (noeud.type === 'TEXT' && noeud.characters) mesures.push(mesurerTexte(noeud));
  });
  const exemples = mesures.map((m) => m.exemple);
  const echecs = exemples.filter((e) => e.etat === 'echec');
  const indetermines = exemples.filter((e) => e.etat === 'indetermine');
  const corps = {
    id: cadre.id, nom: texteSur(cadre.name), textes: exemples.length, echecs: echecs.length, indetermines: indetermines.length,
    approximatifs: mesures.filter((m) => m.approximatif).length,
    exemples: [...echecs, ...indetermines].slice(0, MAX_EXEMPLES),
  };
  return { ...corps, sceau: sceau(corps) };
}

const page = await figma.getNodeByIdAsync(PARAMS.pageId);
if (!page || page.type !== 'PAGE') throw new Error('page introuvable : ' + PARAMS.pageId);
await figma.setCurrentPageAsync(page);

let cadres = cadresDePremierNiveau(page);
if (PARAMS.cadres && PARAMS.cadres.length) {
  const demandes = new Set(PARAMS.cadres);
  const connus = new Set(cadres.map((cadre) => cadre.id));
  const inconnus = [...demandes].filter((id) => !connus.has(id));
  if (inconnus.length) throw new Error('cadres inconnus sur cette page : ' + inconnus.join(', '));
  cadres = cadres.filter((cadre) => demandes.has(cadre.id));
}
const budgetMs = PARAMS.budgetMs ?? BUDGET_DEFAUT;
const debut = Date.now();
const ecrans = [];
const reste = [];
for (const cadre of cadres) {
  if (ecrans.length > 0 && Date.now() - debut > budgetMs) reste.push(cadre.id);
  else ecrans.push(mesurerEcran(cadre));
}
return { version: 1, page: { id: page.id, nom: texteSur(page.name) }, ecrans, reste };
