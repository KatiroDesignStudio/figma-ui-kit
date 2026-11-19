#!/usr/bin/env node
// Compteur du quota Figma du jour (hooks.json, PostToolUse et PostToolUseFailure).
//
// Figma limite les appels à son serveur MCP (Professional ou Organization,
// siège Full ou Dev : 200 par jour ; Enterprise : 600) et ne dit pas combien
// il en reste. Ce script compte chaque appel d'un outil Figma fait depuis
// Claude Code sur cette machine, tous projets et tous agents confondus, et
// prévient l'utilisateur à 25, 50, 75, 85, 90, 95 et 100 %.
// Limites du comptage : les appels faits ailleurs (autre machine, autre
// application) ne sont pas vus, et le jour suit le calendrier UTC. Quand Figma
// refuse un appel pour cause de limite, le refus fait foi.
//
// Usage en hook : JSON de l'événement sur stdin.
// Usage en ligne de commande (Kanshu, Shindan, Hairyo, scripts/suivi.mjs) :
//   node quota-figma.mjs --etat            une ligne d'état du jour
//   node quota-figma.mjs --limite 200      règle la limite du jour (après whoami)
import { appendFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PALIERS = [25, 50, 75, 85, 90, 95, 100];
const LIMITE_PAR_DEFAUT = 200;
const JOURS_GARDES = 7;

// Outils Figma qui ne comptent pas dans la limite (documentation de Figma).
const EXEMPTES = new Set([
  'whoami', 'create_new_file', 'generate_figma_design', 'add_code_connect_map',
  'generate_image', 'generate_vector_illustration', 'send_prompt',
]);
// Outils reconnus comme Figma par leur nom, quel que soit le nom du serveur.
const OUTILS_FIGMA = new Set([
  'use_figma', 'create_session', 'get_figma_skill', 'get_screenshot', 'get_metadata',
  'get_design_context', 'get_variable_defs', 'get_libraries', 'search_design_system',
  'get_code_connect_map', 'get_code_connect_suggestions', 'get_context_for_code_connect',
  'send_code_connect_mappings', 'get_figjam', 'get_comments', 'get_motion_context',
  'download_assets', 'html_to_figma', 'send_code_to_figma',
]);
const REFUS_LIMITE = /rate.?limit|too many requests|\b429\b|quota|limite? (atteinte|reached|exceeded)/i;

/** Dossier des compteurs : le même pour le hook et la ligne de commande. */
export function dossierQuota(env = process.env) {
  if (env.FIGMA_UI_KIT_QUOTA_DIR) return env.FIGMA_UI_KIT_QUOTA_DIR;
  const config = env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
  return join(config, 'figma-ui-kit', 'quota');
}

/** Jour UTC au format AAAA-MM-JJ. */
export function jour(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/** Vrai si l'appel compte dans le quota Figma. */
export function compte(toolName) {
  if (typeof toolName !== 'string' || !toolName.startsWith('mcp__')) return false;
  const i = toolName.lastIndexOf('__');
  const court = toolName.slice(i + 2);
  if (EXEMPTES.has(court)) return false;
  const serveur = toolName.slice(5, i).toLowerCase();
  return OUTILS_FIGMA.has(court) || serveur.includes('figma');
}

function lireLimite(dossier) {
  try {
    const { parJour } = JSON.parse(readFileSync(join(dossier, 'limite.json'), 'utf8'));
    return Number.isInteger(parJour) && parJour > 0 ? parJour : LIMITE_PAR_DEFAUT;
  } catch {
    return LIMITE_PAR_DEFAUT;
  }
}

function lireLignes(fichier) {
  try {
    return readFileSync(fichier, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

/** État du jour : appels comptés, limite, pourcentage, refus de Figma. */
export function etat(dossier = dossierQuota(), date = new Date()) {
  const lignes = lireLignes(join(dossier, `${jour(date)}.log`));
  const appels = lignes.filter((l) => l.type === 'appel').length;
  const limite = lireLimite(dossier);
  const refus = lignes.some((l) => l.type === 'refus-jour');
  const pourcent = refus ? 100 : Math.min(100, Math.floor((appels / limite) * 100));
  return { jour: jour(date), appels, limite, pourcent, refus };
}

/** Palier franchi en passant de `avant` à `apres` appels, ou `null`. */
export function palierFranchi(avant, apres, limite) {
  const pAvant = (avant / limite) * 100;
  const pApres = (apres / limite) * 100;
  const franchis = PALIERS.filter((p) => pAvant < p && pApres >= p);
  return franchis.length ? franchis[franchis.length - 1] : null;
}

export function ligneEtat(e) {
  if (e.refus) return `Quota Figma du jour atteint : Figma refuse les appels (${e.appels} comptés). Reprise demain.`;
  return `Quota Figma du jour : ${e.pourcent} % (${e.appels} sur ${e.limite} appels comptés depuis Claude Code sur cette machine, tous projets).`;
}

function consigneAgent(e) {
  if (e.refus || e.pourcent >= 100) {
    return 'Quota Figma du jour atteint. N\'appelle plus Figma : écris progression.json en « incomplet » '
      + 'avec le motif « quota Figma », note où tu t\'es arrêté, et rends la main.';
  }
  if (e.pourcent >= 95) {
    return `Quota Figma presque atteint (${e.appels}/${e.limite}). Termine le groupe en cours, puis arrête-toi `
      + 'proprement : progression.json en « incomplet », motif « quota Figma », et rends la main.';
  }
  return null;
}

function nettoyer(dossier, aujourdhui) {
  const limite = new Date(`${aujourdhui}T00:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() - JOURS_GARDES);
  for (const f of readdirSync(dossier)) {
    if (/^\d{4}-\d{2}-\d{2}\.log$/.test(f) && f.slice(0, 10) < jour(limite)) rmSync(join(dossier, f), { force: true });
  }
}

/** Traite un événement de hook. Rend la sortie JSON à écrire, ou `null`. */
export function traiter(evenement, dossier = dossierQuota(), date = new Date()) {
  const outil = evenement?.tool_name;
  if (!compte(outil)) return null;
  mkdirSync(dossier, { recursive: true });
  const fichier = join(dossier, `${jour(date)}.log`);
  const avant = etat(dossier, date);
  const echec = evenement.hook_event_name === 'PostToolUseFailure';
  const refusLimite = echec && REFUS_LIMITE.test(String(evenement.error ?? ''));
  const base = { t: date.toISOString(), outil, agent: evenement.agent_type ?? null, projet: evenement.cwd ?? null };

  if (refusLimite) {
    // Loin de la limite du jour, c'est la limite par minute (10 à 20 appels par minute).
    if (avant.appels < avant.limite * 0.9) {
      appendFileSync(fichier, `${JSON.stringify({ ...base, type: 'refus-minute' })}\n`);
      return sortie(evenement, null, 'Figma a refusé cet appel : limite par minute probable. '
        + 'Espace tes appels (regroupe plus de travail par appel), puis réessaie.');
    }
    appendFileSync(fichier, `${JSON.stringify({ ...base, type: 'refus-jour' })}\n`);
    const e = etat(dossier, date);
    return sortie(evenement, ligneEtat(e), consigneAgent(e));
  }

  // Un appel refusé pour une autre raison ne consomme pas forcément de quota : on le compte quand même,
  // par prudence, car Figma ne dit pas ce qu'il décompte.
  appendFileSync(fichier, `${JSON.stringify({ ...base, type: 'appel' })}\n`);
  if (avant.appels === 0) {
    try { nettoyer(dossier, jour(date)); } catch { /* le nettoyage n'empêche jamais le comptage */ }
  }
  const apres = etat(dossier, date);
  const palier = palierFranchi(avant.appels, apres.appels, apres.limite);
  if (palier === null) return null;
  return sortie(evenement, ligneEtat(apres), consigneAgent(apres));
}

function sortie(evenement, messageUtilisateur, consigne) {
  const resultat = {};
  if (messageUtilisateur) resultat.systemMessage = messageUtilisateur;
  const contexte = [messageUtilisateur, consigne].filter(Boolean).join(' ');
  if (contexte) {
    resultat.hookSpecificOutput = { hookEventName: evenement.hook_event_name ?? 'PostToolUse', additionalContext: contexte };
  }
  return Object.keys(resultat).length ? resultat : null;
}

function regler(limite, dossier = dossierQuota()) {
  const n = Number.parseInt(limite, 10);
  if (!Number.isInteger(n) || n <= 0) {
    console.error('usage : node quota-figma.mjs --limite <appels par jour>');
    process.exit(2);
  }
  mkdirSync(dossier, { recursive: true });
  writeFileSync(join(dossier, 'limite.json'), JSON.stringify({ parJour: n, regleLe: new Date().toISOString() }));
  console.log(ligneEtat(etat(dossier)));
}

function principal() {
  const [option, valeur] = process.argv.slice(2);
  if (option === '--etat') {
    console.log(ligneEtat(etat()));
    return;
  }
  if (option === '--limite') {
    regler(valeur);
    return;
  }
  let evenement;
  try {
    evenement = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    console.error('figma-ui-kit, quota Figma : événement illisible, appel non compté.');
    process.exit(1);
  }
  try {
    const resultat = traiter(evenement);
    if (resultat) process.stdout.write(JSON.stringify(resultat));
  } catch (erreur) {
    // Le comptage ne doit jamais gêner le travail : on signale et on continue.
    console.error(`figma-ui-kit, quota Figma : comptage impossible (${erreur.message}).`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) principal();
