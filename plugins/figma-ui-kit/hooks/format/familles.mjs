// Identifiant fixe des familles : `F{nnn}`, donné par Seiri à la première proposition
// d'une famille dans scan/inventaire.json, jamais changé (même si elle est renommée)
// ni réutilisé. Une famille fusionnée reste dans l'inventaire avec `fusionneeDans` ;
// une famille abandonnée, avec `abandonnee` (son motif). Partout ailleurs, une
// famille se cite par son identifiant : ces règles vérifient que les liens tiennent.
import { motif } from './types.mjs';

export const FAMILLE = motif(/^F\d{3,}$/, 'F et trois chiffres au moins, par exemple F004');

const estListe = Array.isArray;
const idsDe = (liste) => (estListe(liste) ? liste.map((x) => x?.id).filter((id) => typeof id === 'string') : []);
const enDouble = (ids) => [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
const retiree = (famille) => Boolean(famille?.fusionneeDans || famille?.abandonnee);

/** Règle de fichier : chaque identifiant de `cle[]` n'y figure qu'une fois. */
export const identifiantsUniques = (cle) => (fichier) => enDouble(idsDe(fichier[cle]))
  .map((id) => `${id} figure deux fois dans ${cle}[] : un identifiant ne sert qu'une fois`);

/** Règle de bloc : un bloc relié à une famille la cite. */
export const blocCiteSaFamille = (bloc) => (bloc.statut === 'famille' && (bloc.familleProposee === undefined || bloc.familleProposee === null)
  ? 'un bloc relié à une famille la cite dans familleProposee (son identifiant, par exemple F004)' : null);

/** Règle de famille : une famille fusionnée ou abandonnée ne garde aucun bloc. */
export function familleRetiree(famille) {
  if (famille.fusionneeDans !== undefined && famille.fusionneeDans === famille.id) return 'une famille ne peut pas être fusionnée dans elle-même';
  if (retiree(famille) && estListe(famille.blocs) && famille.blocs.length > 0) {
    return 'une famille fusionnée ou abandonnée ne garde aucun bloc : ils passent à la famille qui la remplace, ou hors kit';
  }
  return null;
}

const estIdFamille = (id) => typeof id === 'string' && /^F\d{3,}$/.test(id);

/** Carte identifiant vers famille, ou `null` si l'inventaire n'a pas encore de familles. */
export function carteDesFamilles(inventaire) {
  if (!inventaire || !estListe(inventaire.familles) || inventaire.familles.length === 0) return null;
  return new Map(inventaire.familles.filter((f) => typeof f?.id === 'string').map((f) => [f.id, f]));
}

/** Écart d'un bloc qui cite une famille : absente, retirée, ou qui ne le compte pas parmi ses blocs. */
function ecartDuBloc(bloc, i, carte) {
  const chemin = `blocs[${i}].familleProposee`;
  const id = bloc.familleProposee;
  const famille = carte.get(id);
  if (!famille) return `${chemin} : ${id} n'est pas dans familles[] : écris la famille en même temps que le premier bloc qui la cite`;
  if (famille.fusionneeDans) return `${chemin} : ${id} a été fusionnée dans ${famille.fusionneeDans} : relie le bloc à ${famille.fusionneeDans}`;
  if (famille.abandonnee) return `${chemin} : ${id} a été abandonnée (${famille.abandonnee}) : relie le bloc à une autre famille, ou passe-le hors kit avec familleProposee à null`;
  if (bloc.statut === 'famille' && estListe(famille.blocs) && !famille.blocs.includes(bloc.id)) return `${chemin} : ${id} ne compte pas ${bloc.id} dans ses blocs[]`;
  return null;
}

/** Écart d'une famille qui renvoie à une autre (`fusionneeDans`, `issueDe`) absente, ou retirée elle aussi. */
function ecartDuRenvoi(famille, i, carte, cle) {
  const cible = famille[cle];
  if (!estIdFamille(cible) || cible === famille.id) return null;
  if (!carte.has(cible)) return `familles[${i}].${cle} : ${cible} n'est pas dans familles[]`;
  if (cle === 'fusionneeDans' && retiree(carte.get(cible))) return `familles[${i}].fusionneeDans : ${cible} est elle-même fusionnée ou abandonnée : cite la famille qui reste`;
  return null;
}

/** Écarts des blocs d'une famille : absents de l'inventaire, ou reliés à une autre famille. */
function ecartsDesBlocs(famille, i, blocsParId) {
  if (!estListe(famille?.blocs)) return [];
  return famille.blocs.filter((id) => typeof id === 'string').map((id) => {
    if (!blocsParId.has(id)) return `familles[${i}].blocs : ${id} n'est pas dans blocs[]`;
    const cite = blocsParId.get(id)?.familleProposee;
    if (cite === famille.id || (cite !== undefined && cite !== null && !estIdFamille(cite))) return null;
    return `familles[${i}].blocs : ${id} est relié à ${cite ?? 'aucune famille'} dans blocs[]`;
  });
}

/** Règle de fichier de l'inventaire : blocs et familles se citent l'un l'autre sans lien cassé. */
export function liensInventaire(inventaire) {
  const carte = carteDesFamilles(inventaire);
  const blocs = estListe(inventaire.blocs) ? inventaire.blocs : [];
  const familles = estListe(inventaire.familles) ? inventaire.familles : [];
  const blocsParId = new Map(blocs.filter((b) => typeof b?.id === 'string').map((b) => [b.id, b]));
  if (carte === null) return [];
  return [
    ...blocs.map((bloc, i) => (estIdFamille(bloc?.familleProposee) ? ecartDuBloc(bloc, i, carte) : null)),
    ...familles.flatMap((f, i) => (f && typeof f === 'object' ? [ecartDuRenvoi(f, i, carte, 'fusionneeDans'), ecartDuRenvoi(f, i, carte, 'issueDe')] : [])),
    ...(estListe(inventaire.blocs) ? familles.flatMap((f, i) => ecartsDesBlocs(f, i, blocsParId)) : []),
  ].filter(Boolean);
}

/**
 * Écarts des familles citées par un autre fichier (`[{chemin, id}]`) : chaque famille
 * citée doit être dans l'inventaire. Une famille fusionnée ou abandonnée depuis reste
 * citable : un lot, une vérification ou un composant encore dans le kit en gardent trace.
 */
export function ecartsDesCitations(citations, inventaire) {
  const carte = carteDesFamilles(inventaire);
  if (carte === null) return [];
  return citations
    .filter(({ id }) => estIdFamille(id) && !carte.has(id))
    .map(({ chemin, id }) => `${chemin} : ${id} n'est pas une famille de scan/inventaire.json`);
}

/** Citations `{chemin, id}` des éléments d'une liste qui portent une famille dans `cle`. */
export const citationsDe = (liste, prefixe, cle) => (estListe(liste) ? liste : [])
  .map((element, i) => ({ chemin: `${prefixe}[${i}].${cle}`, id: element?.[cle] }))
  .filter(({ id }) => typeof id === 'string');
