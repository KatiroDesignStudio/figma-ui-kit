// Tests du filtre des outils MCP des agents (plugins/figma-ui-kit/hooks/filtre-outils.mjs).
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agentDuPlugin, decider, ecritureFigma, nomCourt, scriptConforme } from '../plugins/figma-ui-kit/hooks/filtre-outils.mjs';

const SCRIPT = fileURLToPath(new URL('../plugins/figma-ui-kit/hooks/filtre-outils.mjs', import.meta.url));

const lancer = (evenement) => execFileSync('node', [SCRIPT], {
  input: typeof evenement === 'string' ? evenement : JSON.stringify(evenement),
  encoding: 'utf8',
});

test('nomCourt garde ce qui suit le dernier séparateur', () => {
  assert.equal(nomCourt('mcp__figma__use_figma'), 'use_figma');
  assert.equal(nomCourt('mcp__00000000-0000-4000-8000-000000000001__get_screenshot'), 'get_screenshot');
  assert.equal(nomCourt('mcp__plugin_figma_figma__create_session'), 'create_session');
});

test('un agent du plugin peut appeler Figma, quel que soit le nom du serveur', () => {
  for (const outil of [
    'mcp__figma__use_figma',
    'mcp__00000000-0000-4000-8000-000000000001__use_figma',
    'mcp__plugin_autre_figma__get_screenshot',
    'mcp__claude_ai_Figma__create_session',
  ]) {
    assert.equal(decider({ agent_type: 'figma-ui-kit:seiri', tool_name: outil }), null, outil);
  }
});

test('un agent du plugin ne peut appeler aucun autre connecteur', () => {
  for (const outil of [
    'mcp__00000000-0000-4000-8000-000000000002__send_message',
    'mcp__00000000-0000-4000-8000-000000000003__create_transfer_request',
    'mcp__slack__slack_send_message',
    'mcp__figma__delete_everything',
  ]) {
    const raison = decider({ agent_type: 'figma-ui-kit:seiton', tool_name: outil });
    assert.match(raison, /n'a accès qu'aux outils Figma/, outil);
  }
});

test('hors des agents du plugin, le filtre ne fait rien', () => {
  assert.equal(decider({ tool_name: 'mcp__slack__slack_send_message' }), null);
  assert.equal(decider({ agent_type: 'general-purpose', tool_name: 'mcp__slack__slack_send_message' }), null);
  assert.equal(decider({ agent_type: 'autre-plugin:seiri', tool_name: 'mcp__slack__slack_send_message' }), null);
});

test('les outils hors connecteur ne sont pas concernés', () => {
  assert.equal(decider({ agent_type: 'figma-ui-kit:seiri', tool_name: 'Read' }), null);
});

test('le script renvoie une décision deny lisible par Claude Code', () => {
  const sortie = JSON.parse(lancer({
    hook_event_name: 'PreToolUse',
    agent_type: 'figma-ui-kit:seiketsu',
    tool_name: 'mcp__gmail__send_message',
    tool_input: {},
  }));
  assert.equal(sortie.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.equal(sortie.hookSpecificOutput.permissionDecision, 'deny');
});

test('le script ne dit rien quand l’appel est permis', () => {
  assert.equal(lancer({ agent_type: 'figma-ui-kit:seiri', tool_name: 'mcp__figma__use_figma' }), '');
  assert.equal(lancer({ tool_name: 'mcp__gmail__send_message' }), '');
});

test('une entrée illisible ne bloque pas la session', () => {
  assert.throws(() => lancer('pas du json'), (err) => err.status === 1);
});

test('le nom de l\'agent est reconnu avec ou sans le préfixe du plugin', () => {
  assert.equal(agentDuPlugin('figma-ui-kit:seiri'), 'seiri');
  assert.equal(agentDuPlugin('seiketsu'), 'seiketsu');
  assert.equal(agentDuPlugin('autre-plugin:seiri'), null);
  assert.equal(agentDuPlugin(undefined), null);
});

const LECTURE = `
  await figma.setCurrentPageAsync(page);
  const resultat = { compte: 0, exemples: [] };
  const vus = new Map();
  vus.set('a', 1);
  for (const n of page.findAll((n) => n.type === 'TEXT')) { resultat.compte += 1; }
  return resultat;
`;

test('Seiri et Seiketsu peuvent lancer un code de lecture', () => {
  for (const agent of ['figma-ui-kit:seiri', 'figma-ui-kit:seiketsu']) {
    assert.equal(decider({ agent_type: agent, tool_name: 'mcp__figma__use_figma', tool_input: { code: LECTURE } }), null);
  }
});

test('Seiri et Seiketsu ne peuvent pas écrire dans Figma', () => {
  for (const code of [
    'figma.currentPage.children[0].remove()',
    'const f = figma.createFrame()',
    'node.name = "Button"',
    'node.fills = []',
    'node.setBoundVariable("fills", v)',
    'parent.appendChild(n)',
    'const c = n.clone()',
    'await figma.importComponentByKeyAsync(k)',
    'variable.scopes = ["TEXT_FILL"]',
  ]) {
    const raison = decider({ agent_type: 'figma-ui-kit:seiri', tool_name: 'mcp__figma__use_figma', tool_input: { code } });
    assert.match(raison ?? '', /lecture seule/, code);
  }
  assert.ok(ecritureFigma('n.remove()'));
  assert.equal(ecritureFigma('a == b; x.y === 3'), null);
});

test('Seiton et Seiso peuvent écrire dans Figma', () => {
  for (const agent of ['figma-ui-kit:seiton', 'figma-ui-kit:seiso']) {
    assert.equal(decider({ agent_type: agent, tool_name: 'mcp__figma__use_figma', tool_input: { code: 'figma.createFrame()' } }), null);
  }
});

test('les agents n\'écrivent de fichiers que dans .uikit/', () => {
  const ok = { agent_type: 'figma-ui-kit:seiton', tool_name: 'Write', tool_input: { file_path: '/chantier/.uikit/ids.json' } };
  assert.equal(decider(ok), null);
  assert.equal(decider({ ...ok, tool_name: 'Edit' }), null);
  for (const file_path of ['/chantier/uikit.md', '/home/exemple/.zshrc', '/chantier/.uikit-faux/a.json', undefined]) {
    assert.match(decider({ ...ok, tool_input: { file_path } }) ?? '', /\.uikit/, String(file_path));
  }
  assert.equal(decider({ tool_name: 'Write', tool_input: { file_path: '/home/exemple/.zshrc' } }), null);
});

// --- Scripts de mesure du plugin : le corps ne doit pas être modifié ---
const DOSSIER_SCRIPTS = fileURLToPath(new URL('../plugins/figma-ui-kit/skills/build/scripts/figma/', import.meta.url));
const MARQUE = /\/\*PARAMS\*\/[\s\S]*?\/\*FIN-PARAMS\*\//;
const livre = (nom) => readFileSync(DOSSIER_SCRIPTS + nom + '.js', 'utf8');
const avecParams = (nom, params) => livre(nom).replace(MARQUE, () => `/*PARAMS*/${params}/*FIN-PARAMS*/`);
const appelSeiri = (code) => ({ agent_type: 'figma-ui-kit:seiri', tool_name: 'mcp__figma__use_figma', tool_input: { code } });

test('un script du plugin livré tel quel est accepté', () => {
  assert.equal(scriptConforme(livre('empreinte')), null);
});

test('un script du plugin dont seuls les paramètres changent est accepté', () => {
  assert.equal(scriptConforme(avecParams('empreinte', '{"pageId":"1:1"}')), null);
  assert.equal(scriptConforme(avecParams('empreinte', '{ "pageId": "1:1", "liste": [1, 2] }') + '\n\n  '), null);
});

test('un script du plugin dont une ligne du corps est modifiée est refusé', () => {
  const modifie = livre('empreinte').replace('return', 'const x = 1; return');
  const raison = scriptConforme(modifie);
  assert.match(raison ?? '', /relis le fichier/i);
  assert.match(raison ?? '', /paramètres/);
});

test('un nom de script inconnu est refusé', () => {
  assert.match(scriptConforme('// figma-ui-kit:script inexistant v1\nreturn 1;') ?? '', /inconnu/);
});

test('un nom qui tente de sortir du dossier ou vise un fichier interne est refusé', () => {
  for (const nom of ['../../hooks/filtre-outils', '..', 'a/b', '_commun', 'Empreinte', 'empreinte.js', '']) {
    assert.ok(scriptConforme(`// figma-ui-kit:script ${nom} v1\nreturn 1;`), `nom : ${nom}`);
  }
});

test('des paramètres qui ne sont pas un objet JSON sont refusés', () => {
  for (const params of ['{pageId: 1}', '[1]', 'null', '"texte"', '{} ; evil()', '']) {
    assert.match(scriptConforme(avecParams('empreinte', params)) ?? '', /JSON/, params);
  }
});

test('un script sans marqueur de paramètres est refusé', () => {
  const sans = livre('empreinte').replace(MARQUE, '{}');
  assert.match(scriptConforme(sans) ?? '', /marqueur/);
});

test('un code sans en-tête de script du plugin n\'est pas concerné', () => {
  assert.equal(scriptConforme('return figma.currentPage.name;'), null);
  assert.equal(scriptConforme('// autre commentaire\nreturn 1;'), null);
  assert.equal(scriptConforme(undefined), null);
  assert.equal(scriptConforme('x'.repeat(300) + '\n// figma-ui-kit:script empreinte v1'), null);
});

test('les fins de ligne \\r\\n et \\r seul sont normalisées avant la comparaison', () => {
  const livreLf = livre('empreinte');
  assert.equal(scriptConforme(livreLf.replace(/\n/g, '\r\n')), null);
  const [entete, ...corps] = livreLf.split('\n');
  assert.equal(scriptConforme(entete + '\n' + corps.join('\r')), null);
});

test('un en-tête déguisé est refusé avec une raison claire', () => {
  const [entete, ...corps] = livre('empreinte').split('\n');
  const suite = corps.join('\n');
  for (const code of [
    '\uFEFF' + entete + '\n' + suite,
    ' ' + entete + '\n' + suite,
    '\n' + entete + '\n' + suite,
    entete + ' \n' + suite,
    entete + '\r' + suite,
  ]) {
    assert.match(scriptConforme(code) ?? '', /en-tête/i, JSON.stringify(code.slice(0, 40)));
  }
});

test('un fichier de script illisible donne un refus qui nomme son chemin', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'filtre-'));
  try {
    mkdirSync(join(dossier, 'empreinte.js'));
    const raison = scriptConforme('// figma-ui-kit:script empreinte v1\nreturn 1;', dossier);
    assert.match(raison ?? '', /illisible/);
    assert.ok(raison.includes(join(dossier, 'empreinte.js')));
    assert.match(scriptConforme('// figma-ui-kit:script absent v1\nreturn 1;', dossier) ?? '', /inconnu/);
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

test('de bout en bout, Seiri peut lancer un script livré et se voit refuser un script modifié', () => {
  assert.equal(decider(appelSeiri(avecParams('empreinte', '{"pageId":"1:1"}'))), null);
  const raison = decider(appelSeiri(livre('empreinte').replace('return', 'const x = 1; return')));
  assert.match(raison ?? '', /figma-ui-kit:seiri/);
  assert.match(raison ?? '', /relis le fichier/i);
  assert.equal(decider(appelSeiri('return 1;')), null);
});

test('le contrôle d\'écriture continue de s\'appliquer à un script conforme', () => {
  assert.equal(decider({ ...appelSeiri(livre('empreinte')), agent_type: 'figma-ui-kit:seiton' }), null);
});
