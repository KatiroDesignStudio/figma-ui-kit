// Tests du compteur de quota Figma (plugins/figma-ui-kit/hooks/quota-figma.mjs).
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compte, etat, palierFranchi, traiter } from '../plugins/figma-ui-kit/hooks/quota-figma.mjs';

const SCRIPT = fileURLToPath(new URL('../plugins/figma-ui-kit/hooks/quota-figma.mjs', import.meta.url));
const DATE = new Date('2026-11-19T10:00:00Z');
const dossier = () => mkdtempSync(join(tmpdir(), 'quota-'));
const appel = (outil = 'mcp__figma__use_figma') => ({ hook_event_name: 'PostToolUse', tool_name: outil, agent_type: 'figma-ui-kit:seiri', cwd: '/chantier' });

test('seuls les outils Figma non exemptés comptent', () => {
  assert.ok(compte('mcp__figma__use_figma'));
  assert.ok(compte('mcp__00000000-0000-4000-8000-000000000001__get_screenshot'));
  assert.ok(compte('mcp__claude_ai_Figma__get_figjam'));
  assert.ok(!compte('mcp__figma__whoami'));
  assert.ok(!compte('mcp__figma__create_new_file'));
  assert.ok(!compte('mcp__slack__send_message'));
  assert.ok(!compte('mcp__00000000-0000-4000-8000-000000000002__create_branch'));
  assert.ok(!compte('Read'));
});

test('les paliers 25, 50, 75, 85, 90, 95 et 100 % sont annoncés une fois chacun', () => {
  const d = dossier();
  writeFileSync(join(d, 'limite.json'), JSON.stringify({ parJour: 20 }));
  const annonces = [];
  for (let i = 0; i < 22; i += 1) {
    const r = traiter(appel(), d, DATE);
    if (r) annonces.push(r.systemMessage);
  }
  assert.equal(annonces.length, 7);
  assert.match(annonces[0], /25 % \(5 sur 20/);
  assert.match(annonces[6], /100 %/);
  assert.equal(etat(d, DATE).appels, 22);
});

test('palierFranchi garde le plus haut palier franchi d\'un coup', () => {
  assert.equal(palierFranchi(0, 1, 200), null);
  assert.equal(palierFranchi(49, 50, 200), 25);
  assert.equal(palierFranchi(189, 190, 200), 95);
});

test('à 95 % et plus, l\'agent reçoit la consigne de s\'arrêter proprement', () => {
  const d = dossier();
  writeFileSync(join(d, 'limite.json'), JSON.stringify({ parJour: 20 }));
  let r = null;
  for (let i = 0; i < 19; i += 1) r = traiter(appel(), d, DATE);
  assert.match(r.hookSpecificOutput.additionalContext, /incomplet/);
});

test('un refus de Figma loin de la limite est la limite par minute', () => {
  const d = dossier();
  const r = traiter({ ...appel(), hook_event_name: 'PostToolUseFailure', error: 'Rate limit exceeded' }, d, DATE);
  assert.match(r.hookSpecificOutput.additionalContext, /par minute/);
  assert.equal(etat(d, DATE).refus, false);
});

test('un refus de Figma près de la limite marque le jour à 100 %', () => {
  const d = dossier();
  writeFileSync(join(d, 'limite.json'), JSON.stringify({ parJour: 10 }));
  for (let i = 0; i < 9; i += 1) traiter(appel(), d, DATE);
  const r = traiter({ ...appel(), hook_event_name: 'PostToolUseFailure', error: 'Too many requests' }, d, DATE);
  assert.match(r.systemMessage, /atteint/);
  assert.equal(etat(d, DATE).pourcent, 100);
});

test('les autres connecteurs ne sont pas comptés et rien n\'est écrit', () => {
  const d = dossier();
  assert.equal(traiter(appel('mcp__gmail__send_message'), d, DATE), null);
  assert.ok(!existsSync(join(d, '2026-11-19.log')));
});

test('la ligne de commande règle la limite et donne l\'état', () => {
  const d = dossier();
  const env = { ...process.env, FIGMA_UI_KIT_QUOTA_DIR: d };
  const sortie = execFileSync('node', [SCRIPT, '--limite', '600'], { env, encoding: 'utf8' });
  assert.match(sortie, /sur 600 appels/);
  assert.equal(JSON.parse(readFileSync(join(d, 'limite.json'), 'utf8')).parJour, 600);
  assert.match(execFileSync('node', [SCRIPT, '--etat'], { env, encoding: 'utf8' }), /Quota Figma du jour/);
});
