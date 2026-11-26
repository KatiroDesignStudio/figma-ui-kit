#!/usr/bin/env node
// Journal du chantier : .uikit/journal.jsonl, une ligne JSON par événement
// (démarrage, lancement d'un agent et ses appels Figma, décision, reprise, recette…).
// Seul ce script l'écrit (le filtre du plugin refuse toute autre écriture) : chaque
// ligne est contrôlée avant d'être ajoutée, et les lignes déjà écrites ne bougent pas.
// Le journal reste hors de uikit.md, que les agents relisent à chaque lancement.
//
// Usage :
//   node journal.mjs <dossier .uikit> ajouter --commande <c> --type <t> --texte "<texte>"
//        [--agent <a>] [--mode <m>] [--appels <n>] [--economises <n>] [--refs D3,F004]
//   node journal.mjs <dossier .uikit> resume [--json]
//   node journal.mjs <dossier .uikit> lire [--dernieres <n>]
// Codes de sortie : 0 ; 1 journal qui contient des lignes invalides ;
// 2 usage, dossier ou entrée invalide (rien n'est écrit).
import { appendFileSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { LIGNE_JOURNAL } from '../../../hooks/format/fichiers.mjs';
import { verifier } from '../../../hooks/format/types.mjs';

const FICHIER = 'journal.jsonl';
const DERNIERES = 20;
const USAGE = 'usage : node journal.mjs <dossier .uikit> ajouter|resume|lire [options] (voir l\'en-tête du script)';

const deux = (n) => String(n).padStart(2, '0');
/** Date et heure locales, à la minute : `2026-11-26T14:03`. */
export const horodatage = (d) => `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}T${deux(d.getHours())}:${deux(d.getMinutes())}`;

/** Nouvelle ligne datée : `{ligne}` si elle est conforme, sinon `{erreurs}`. */
export function nouvelleLigne(champs, maintenant = new Date()) {
  const ligne = Object.fromEntries(Object.entries({ date: horodatage(maintenant), ...champs }).filter(([, v]) => v !== undefined));
  const erreurs = verifier(ligne, LIGNE_JOURNAL);
  return erreurs.length ? { erreurs } : { ligne };
}

function lireTexte(chemin) {
  try {
    return readFileSync(chemin, 'utf8');
  } catch (erreur) {
    if (erreur.code === 'ENOENT') return '';
    throw erreur;
  }
}

/** Analyse d'une ligne du fichier : `{ligne}` ou `{erreurs}`. */
function analyser(texte) {
  try {
    const ligne = JSON.parse(texte);
    const erreurs = verifier(ligne, LIGNE_JOURNAL);
    return erreurs.length ? { erreurs } : { ligne };
  } catch (erreur) {
    return { erreurs: [`JSON illisible (${erreur.message})`] };
  }
}

/** Lignes du journal, et lignes invalides avec leur numéro (journal absent : rien). */
export function lireJournal(dossier) {
  const analyses = lireTexte(join(dossier, FICHIER)).split('\n')
    .map((texte, i) => ({ numero: i + 1, texte }))
    .filter(({ texte }) => texte.trim())
    .map(({ numero, texte }) => ({ numero, ...analyser(texte) }));
  return {
    lignes: analyses.filter((a) => a.ligne).map((a) => a.ligne),
    invalides: analyses.filter((a) => a.erreurs).map(({ numero, erreurs }) => ({ numero, erreurs })),
  };
}

const ajouterA = (totaux, cle, n) => ({ ...totaux, [cle]: (totaux[cle] ?? 0) + n });

/** Totaux du journal : appels Figma par commande et par lancement, appels économisés. */
export function resumer(lignes) {
  const avecAppels = lignes.filter((l) => Number.isInteger(l.appels));
  const lancements = avecAppels.filter((l) => l.type === 'lancement');
  return {
    entrees: lignes.length,
    appels: avecAppels.reduce((t, l) => t + l.appels, 0),
    economises: lignes.reduce((t, l) => t + (Number.isInteger(l.economises) ? l.economises : 0), 0),
    premiere: lignes[0]?.date ?? null,
    derniere: lignes.at(-1)?.date ?? null,
    parCommande: avecAppels.reduce((t, l) => ajouterA(t, l.commande, l.appels), {}),
    parLancement: lancements.reduce((t, l) => ajouterA(t, [l.agent, l.mode].filter(Boolean).join(' '), l.appels), {}),
  };
}

const majuscule = (mot) => mot.charAt(0).toUpperCase() + mot.slice(1);
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

/** Une ligne du journal, lisible par l'utilisateur. */
export function formater(ligne) {
  const agent = ligne.agent ? `${majuscule(ligne.agent)}${ligne.mode ? ` (${ligne.mode})` : ''}` : null;
  const appels = ligne.appels !== undefined ? `${pluriel(ligne.appels, 'appel')} Figma` : null;
  const economises = ligne.economises ? `${pluriel(ligne.economises, 'appel')} économisé${ligne.economises > 1 ? 's' : ''}` : null;
  return [ligne.date, ligne.commande, ligne.type, agent, ligne.texte, appels, economises].filter(Boolean).join(' · ');
}

/** Le chemin est un dossier `.uikit` existant. */
function estDossierUikit(dossier) {
  try {
    return basename(dossier).toLowerCase() === '.uikit' && statSync(dossier).isDirectory();
  } catch {
    return false;
  }
}

const nombreOuTexte = (valeur) => (typeof valeur === 'string' && /^-?\d+$/.test(valeur) ? Number(valeur) : valeur);

/** Identifiants de `--refs D3,F004` ; une liste vide vaut une option absente. */
function refsDe(texte) {
  const refs = texte === undefined ? [] : texte.split(',').map((r) => r.trim()).filter(Boolean);
  return refs.length ? refs : undefined;
}

/** Champs d'une entrée, tirés des options de la ligne de commande. */
function champsDe(options) {
  return {
    commande: options.commande, type: options.type, texte: options.texte, agent: options.agent, mode: options.mode,
    appels: nombreOuTexte(options.appels), economises: nombreOuTexte(options.economises),
    refs: refsDe(options.refs),
  };
}

function ajouter(dossier, options) {
  const { ligne, erreurs } = nouvelleLigne(champsDe(options));
  if (erreurs) {
    process.stderr.write(`Entrée refusée, rien n'est écrit : ${erreurs.join(' ; ')}\n`);
    return 2;
  }
  const chemin = join(dossier, FICHIER);
  const actuel = lireTexte(chemin);
  appendFileSync(chemin, `${actuel && !actuel.endsWith('\n') ? '\n' : ''}${JSON.stringify(ligne)}\n`);
  process.stdout.write(`${formater(ligne)}\n`);
  return 0;
}

function signalerInvalides(invalides) {
  for (const { numero, erreurs } of invalides) process.stderr.write(`journal.jsonl, ligne ${numero} invalide : ${erreurs.join(' ; ')}\n`);
  return invalides.length ? 1 : 0;
}

function resumerEnTexte(r) {
  const periode = r.premiere ? `, du ${r.premiere} au ${r.derniere}` : '';
  const lignes = [
    `${pluriel(r.entrees, 'entrée')}${periode} · ${pluriel(r.appels, 'appel')} Figma · ${pluriel(r.economises, 'appel')} économisé${r.economises > 1 ? 's' : ''}`,
    ...Object.entries(r.parCommande).map(([commande, n]) => `${commande} : ${pluriel(n, 'appel')}`),
    ...Object.entries(r.parLancement).map(([lancement, n]) => `  ${lancement} : ${pluriel(n, 'appel')}`),
  ];
  return `${lignes.join('\n')}\n`;
}

function principal(args) {
  const [dossier, action, ...reste] = args;
  if (!dossier || !action || !estDossierUikit(dossier)) {
    process.stderr.write(`${USAGE}\nLe premier argument doit être le chemin d'un dossier .uikit existant.\n`);
    return 2;
  }
  let options;
  try {
    ({ values: options } = parseArgs({ args: reste, options: {
      commande: { type: 'string' }, type: { type: 'string' }, texte: { type: 'string' }, agent: { type: 'string' },
      mode: { type: 'string' }, appels: { type: 'string' }, economises: { type: 'string' }, refs: { type: 'string' },
      json: { type: 'boolean' }, dernieres: { type: 'string' },
    } }));
  } catch (erreur) {
    process.stderr.write(`${erreur.message}\n${USAGE}\n`);
    return 2;
  }
  if (action === 'ajouter') return ajouter(dossier, options);
  const { lignes, invalides } = lireJournal(dossier);
  if (action === 'resume') {
    const r = resumer(lignes);
    process.stdout.write(options.json ? `${JSON.stringify(r)}\n` : resumerEnTexte(r));
    return signalerInvalides(invalides);
  }
  if (action === 'lire') {
    const n = Number.parseInt(options.dernieres ?? String(DERNIERES), 10);
    if (!Number.isInteger(n) || n < 1) {
      process.stderr.write(`--dernieres attend un nombre entier positif.\n${USAGE}\n`);
      return 2;
    }
    process.stdout.write(lignes.slice(-n).map((l) => `${formater(l)}\n`).join(''));
    return signalerInvalides(invalides);
  }
  process.stderr.write(`Action inconnue : ${action}\n${USAGE}\n`);
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(principal(process.argv.slice(2)));
