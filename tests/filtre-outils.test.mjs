// Tests du filtre des outils MCP des agents (plugins/figma-ui-kit/hooks/filtre-outils.mjs).
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { agentDuPlugin, decider, ecritureFigma, nomCourt } from '../plugins/figma-ui-kit/hooks/filtre-outils.mjs';

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
