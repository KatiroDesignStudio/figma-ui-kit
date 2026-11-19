#!/usr/bin/env node
// Suivi d'un lancement long (Seiri, Seiton, Seiketsu) pour l'outil Monitor de Claude Code.
// Lit .uikit/progression.json, que l'agent réécrit après chaque groupe de travail,
// et imprime une ligne d'avancement toutes les 3 minutes au plus, avec le quota
// Figma du jour. Chaque ligne imprimée devient une notification que l'agent
// principal affiche telle quelle à l'utilisateur : peu de lignes, peu de tours.
//
// Usage : node suivi.mjs <chemin de progression.json> "<étiquette de l'agent>"
// Lignes émises :
//   "{étiquette} · {n} min : {resume} · quota Figma {p} %"   avancée depuis la dernière ligne
//   "{étiquette} · {n} min : toujours au travail, sans nouvelle avancée depuis {m} min"
//   "{ligne du quota}"                                       palier du quota franchi (25 % … 100 %)
//   "FIN {etat} · {étiquette} : {resume}"                    l'agent a fini (fait ou incomplet)
import { readFileSync, statSync } from 'node:fs';
import { etat as etatQuota, ligneEtat, PALIERS } from '../../../hooks/quota-figma.mjs';

const [fichier, etiquette = 'Agent'] = process.argv.slice(2);
if (!fichier) {
  console.error('usage : node suivi.mjs <progression.json> "<étiquette>"');
  process.exit(2);
}

const INTERVALLE_MS = 10_000;          // lecture du fichier toutes les 10 s
const ENTRE_DEUX_LIGNES_MS = 180_000;  // une ligne toutes les 3 minutes au plus
const SILENCE_MS = 360_000;            // six minutes sans écriture : on le dit
const debut = Date.now();
let derniereLigne = debut;
let dernierResume = '';
let dernierPalier = palierAtteint();

const minutes = (ms) => Math.max(1, Math.round(ms / 60_000));

function palierAtteint() {
  try {
    const q = etatQuota();
    return { q, palier: PALIERS.filter((p) => q.pourcent >= p).pop() ?? 0 };
  } catch {
    return { q: null, palier: 0 };
  }
}

function lire() {
  try {
    const brut = readFileSync(fichier, 'utf8');
    return { p: JSON.parse(brut), modifie: statSync(fichier).mtimeMs };
  } catch {
    return null; // pas encore écrit, ou en cours d'écriture : on réessaie au tour suivant
  }
}

function tour() {
  const maintenant = Date.now();
  const lu = lire();
  if (lu && lu.p.etat && lu.p.etat !== 'en_cours') {
    console.log(`FIN ${lu.p.etat} · ${etiquette} : ${lu.p.resume ?? ''}`);
    process.exit(0);
  }
  const quota = palierAtteint();
  if (quota.q && quota.palier > dernierPalier.palier) {
    console.log(ligneEtat(quota.q));
  }
  dernierPalier = quota;
  if (maintenant - derniereLigne < ENTRE_DEUX_LIGNES_MS) return;
  const ecoule = minutes(maintenant - debut);
  const silence = lu ? maintenant - lu.modifie : maintenant - debut;
  const suffixe = quota.q ? ` · quota Figma ${quota.q.pourcent} %` : '';
  if (lu && lu.p.resume && lu.p.resume !== dernierResume) {
    console.log(`${etiquette} · ${ecoule} min : ${lu.p.resume}${suffixe}`);
    dernierResume = lu.p.resume;
    derniereLigne = maintenant;
  } else if (silence >= SILENCE_MS) {
    console.log(`${etiquette} · ${ecoule} min : toujours au travail, sans nouvelle avancée depuis ${minutes(silence)} min`);
    derniereLigne = maintenant;
  }
}

setInterval(tour, INTERVALLE_MS);
