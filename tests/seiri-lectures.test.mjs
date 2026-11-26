// Les lectures de Seiri par mode (agents/seiri.md) couvrent les références que chaque mode cite.
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const SEIRI = readFileSync(new URL('../plugins/figma-ui-kit/agents/seiri.md', import.meta.url), 'utf8');
const REFERENCES = new URL('../plugins/figma-ui-kit/skills/build/references/', import.meta.url);
const TOUJOURS = ['donnees.md', 'mesures.md'];
// Renvois vers les fichiers de l'appelant, pas des règles à lire : uikit.md est lu à part,
// pilotage.md explique à Kanshu pourquoi le mode existe.
const RENVOIS = new Set(['uikit.md', 'pilotage.md']);
// Paragraphes rattachés à un mode : l'inventaire et le logo font partie du scan.
const RATTACHES = { Inventaire: 'Scan', 'Logo de la marque': 'Scan' };

const refsDe = (texte) => [...new Set([...texte.matchAll(/`([a-z-]+\.md)`/g)].map((m) => m[1]))];

function lecturesParMode() {
  const lignes = SEIRI.split('\n').filter((l) => /^\| [A-ZÉ][^|]* \| /.test(l) && !l.startsWith('| Mode '));
  return new Map(lignes.map((l) => {
    const [mode, refs] = l.split('|').slice(1, 3).map((c) => c.trim());
    return [mode, new Set([...TOUJOURS, ...refsDe(refs)])];
  }));
}

function citationsParMode() {
  const modes = SEIRI.slice(SEIRI.indexOf('## Modes')).split('\n## ')[0];
  const parties = modes.split(/\n\*\*([^*]+)\*\*/).slice(1);
  const citations = new Map();
  for (let i = 0; i < parties.length; i += 2) {
    const mode = RATTACHES[parties[i]] ?? parties[i];
    citations.set(mode, new Set([...(citations.get(mode) ?? []), ...refsDe(parties[i + 1])]));
  }
  return citations;
}

test('chaque mode de Seiri a sa ligne de lectures', () => {
  assert.deepEqual([...lecturesParMode().keys()].sort(), [...citationsParMode().keys()].sort());
});

test('chaque référence citée par un mode est dans ses lectures', () => {
  const lectures = lecturesParMode();
  for (const [mode, refs] of citationsParMode()) {
    const manquantes = [...refs].filter((r) => !RENVOIS.has(r) && !lectures.get(mode).has(r));
    assert.deepEqual(manquantes, [], `${mode} cite ${manquantes.join(', ')} sans le lire`);
  }
});

test('chaque référence des lectures existe', () => {
  for (const [mode, refs] of lecturesParMode()) {
    for (const ref of refs) {
      if (ref === 'rgaa.md') continue;
      assert.ok(existsSync(new URL(ref, REFERENCES)), `${mode} : ${ref} introuvable`);
    }
  }
});
