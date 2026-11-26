// Tests de l'identifiant fixe des familles (F001) dans les fichiers de .uikit/.
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { controlerContenu, controlerEcriture } from '../plugins/figma-ui-kit/hooks/format-uikit.mjs';

const controler = (relatif, valeur, options) => controlerContenu(relatif, JSON.stringify(valeur), options);

const BLOCS = [
  { id: 'B001', statut: 'famille', familleProposee: 'F001' },
  { id: 'B002', statut: 'famille', familleProposee: 'F002' },
  { id: 'B003', statut: 'hors-kit', motif: 'maquette d\'exemple' },
];
const FAMILLES = [
  { id: 'F001', nom: 'Button', blocs: ['B001'] },
  { id: 'F002', nom: 'TextField', blocs: ['B002'] },
  { id: 'F003', nom: 'Input', blocs: [], fusionneeDans: 'F002' },
];
const INVENTAIRE = { blocs: BLOCS, familles: FAMILLES };

function avecInventaire(inventaire, faire) {
  const racine = mkdtempSync(join(tmpdir(), 'familles-'));
  const uikit = join(racine, '.uikit');
  mkdirSync(join(uikit, 'scan'), { recursive: true });
  if (inventaire !== undefined) writeFileSync(join(uikit, 'scan', 'inventaire.json'), JSON.stringify(inventaire));
  try {
    return faire(uikit);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
}

// --- Inventaire ---

test('un inventaire aux familles identifiées passe', () => {
  assert.equal(controler('scan/inventaire.json', INVENTAIRE), null);
});

test('une famille sans identifiant, ou mal formé, est refusée', () => {
  const { id, ...sansId } = FAMILLES[0];
  assert.match(controler('scan/inventaire.json', { familles: [sansId] }), /familles\[0\].*id/);
  assert.match(controler('scan/inventaire.json', { familles: [{ ...FAMILLES[0], id: 'F1' }] }), /F et trois chiffres/);
});

test('deux familles ou deux blocs ne partagent jamais un identifiant', () => {
  assert.match(controler('scan/inventaire.json', { familles: [FAMILLES[0], { ...FAMILLES[1], id: 'F001' }] }), /F001.*deux fois/);
  assert.match(controler('scan/inventaire.json', { blocs: [BLOCS[2], { ...BLOCS[2] }] }), /B003.*deux fois/);
});

test('un bloc relié à une famille cite son identifiant', () => {
  const raison = controler('scan/inventaire.json', { blocs: [{ id: 'B001', statut: 'famille' }] });
  assert.match(raison, /familleProposee/);
  assert.match(controler('scan/inventaire.json', { blocs: [{ id: 'B001', statut: 'famille', familleProposee: 'Button' }] }), /familleProposee/);
});

test('un bloc ne cite qu\'une famille de l\'inventaire, une fois les familles écrites', () => {
  const blocs = [{ id: 'B001', statut: 'famille', familleProposee: 'F009' }];
  assert.equal(controler('scan/inventaire.json', { blocs }), null);
  assert.match(controler('scan/inventaire.json', { blocs, familles: FAMILLES }), /F009/);
});

test('une famille ne regroupe que des blocs de l\'inventaire', () => {
  const familles = [{ id: 'F001', nom: 'Button', blocs: ['B001', 'B099'] }];
  assert.equal(controler('scan/inventaire.json', { familles }), null);
  assert.match(controler('scan/inventaire.json', { blocs: BLOCS, familles }), /B099/);
});

test('une famille fusionnée renvoie à une famille existante, sans garder de blocs', () => {
  const avec = (fusionnee) => ({ blocs: BLOCS, familles: [FAMILLES[0], FAMILLES[1], { ...FAMILLES[2], ...fusionnee }] });
  assert.match(controler('scan/inventaire.json', avec({ fusionneeDans: 'F042' })), /F042/);
  assert.match(controler('scan/inventaire.json', avec({ fusionneeDans: 'F003' })), /elle-même/);
  assert.match(controler('scan/inventaire.json', avec({ blocs: ['B002'] })), /fusionnée/);
});

test('un bloc relié à une famille fusionnée est refusé, avec la famille qui la remplace', () => {
  const blocs = [{ id: 'B002', statut: 'famille', familleProposee: 'F003' }];
  const raison = controler('scan/inventaire.json', { blocs, familles: FAMILLES });
  assert.match(raison, /F003/);
  assert.match(raison, /F002/);
});

test('une famille abandonnée dit pourquoi et ne garde pas de blocs', () => {
  const abandonnee = { id: 'F004', nom: 'Badge', blocs: [], abandonnee: 'hors périmètre' };
  assert.equal(controler('scan/inventaire.json', { familles: [abandonnee] }), null);
  assert.match(controler('scan/inventaire.json', { familles: [{ ...abandonnee, abandonnee: '' }] }), /abandonnee/);
});

// --- Fichiers qui citent une famille ---

test('ids.json : chaque famille d\'un lot porte son identifiant', () => {
  const lot = (familles) => ({ lots: { 'P3-01': { familles } } });
  assert.match(controler('ids.json', lot([{ nom: 'Button', variantesObservees: [] }])), /id/);
  assert.equal(controler('ids.json', lot([{ id: 'F001', nom: 'Button', variantesObservees: [] }])), null);
});

test('une famille citée doit exister dans scan/inventaire.json', () => {
  avecInventaire(INVENTAIRE, (uikit) => {
    const lot = (id) => ({ lots: { 'P3-01': { familles: [{ id, nom: 'Button' }] } } });
    assert.equal(controler('ids.json', lot('F001'), { dossierUikit: uikit }), null);
    assert.match(controler('ids.json', lot('F042'), { dossierUikit: uikit }), /F042.*inventaire/);
    assert.match(controler('ids.json', { composants: { Button: { id: '5:1', page: '3:1', famille: 'F042' } } }, { dossierUikit: uikit }), /F042/);
  });
});

test('un plan d\'écran peut citer une famille fusionnée dont le composant est encore dans le kit', () => {
  avecInventaire(INVENTAIRE, (uikit) => {
    assert.equal(controler('scan/plan-12-34.json', { remplacements: [{ noeud: '12:40', famille: 'F003' }] }, { dossierUikit: uikit }), null);
  });
});

test('un lot passé garde trace d\'une famille fusionnée depuis', () => {
  avecInventaire(INVENTAIRE, (uikit) => {
    assert.equal(controler('ids.json', { lots: { 'P3-01': { familles: [{ id: 'F003', nom: 'Input' }] } } }, { dossierUikit: uikit }), null);
  });
});

test('sans inventaire, ou avant ses familles, une famille citée n\'est pas recoupée', () => {
  const lot = { lots: { 'P3-01': { familles: [{ id: 'F042', nom: 'Button' }] } } };
  avecInventaire(undefined, (uikit) => assert.equal(controler('ids.json', lot, { dossierUikit: uikit }), null));
  avecInventaire({ blocs: BLOCS }, (uikit) => assert.equal(controler('ids.json', lot, { dossierUikit: uikit }), null));
});

test('plan d\'écran : un remplacement cite la famille par son identifiant', () => {
  avecInventaire(INVENTAIRE, (uikit) => {
    const plan = (famille) => ({ remplacements: [{ noeud: '12:40', famille }] });
    assert.equal(controler('scan/plan-12-34.json', plan('F001'), { dossierUikit: uikit }), null);
    assert.match(controler('scan/plan-12-34.json', plan('Button'), { dossierUikit: uikit }), /famille/);
    assert.match(controler('scan/plan-12-34.json', plan('F042'), { dossierUikit: uikit }), /F042/);
  });
});

test('plan d\'écran : un manque du kit cite son bloc, et sa famille si elle existe', () => {
  const plan = (manque) => ({ manquesKit: [{ noeud: '12:40', type: 'famille-manquante', ...manque }] });
  assert.equal(controler('scan/plan-12-34.json', plan({ famille: null, bloc: 'B003' })), null);
  assert.match(controler('scan/plan-12-34.json', plan({ bloc: 'bloc-3' })), /bloc/);
});

test('vérification : une famille du kit cite son identifiant, une planche non', () => {
  avecInventaire(INVENTAIRE, (uikit) => {
    const verif = (familles) => ({ familles });
    assert.equal(controler('verification-atomes.json', verif([{ id: 'F001', nom: 'Button', statut: 'bon' }]), { dossierUikit: uikit }), null);
    assert.equal(controler('verification-fondations.json', verif([{ nom: 'Colors', statut: 'bon' }]), { dossierUikit: uikit }), null);
    assert.match(controler('verification-atomes.json', verif([{ id: 'F042', nom: 'Button', statut: 'bon' }]), { dossierUikit: uikit }), /F042/);
  });
});

// --- Cas relevés en relecture ---

test('une liste de familles encore vide ne fait pas refuser les blocs qui citent une famille', () => {
  const blocs = [{ id: 'B001', statut: 'famille', familleProposee: 'F001' }];
  assert.equal(controler('scan/inventaire.json', { blocs, familles: [] }), null);
});

test('une famille fusionnée dans une famille retirée elle aussi est refusée', () => {
  const familles = [
    { id: 'F001', nom: 'A', blocs: [], fusionneeDans: 'F002' },
    { id: 'F002', nom: 'B', blocs: [], fusionneeDans: 'F001' },
    { id: 'F003', nom: 'C', blocs: [], abandonnee: 'hors périmètre' },
    { id: 'F004', nom: 'D', blocs: [], fusionneeDans: 'F003' },
  ];
  const raison = controler('scan/inventaire.json', { familles });
  assert.match(raison, /familles\[0\]\.fusionneeDans/);
  assert.match(raison, /familles\[3\]\.fusionneeDans/);
});

test('issueDe renvoie à une famille de l\'inventaire', () => {
  assert.match(controler('scan/inventaire.json', { familles: [{ ...FAMILLES[0], issueDe: 'F042' }] }), /issueDe.*F042/);
});

test('un bloc et sa famille se citent l\'un l\'autre', () => {
  const blocs = [{ id: 'B001', statut: 'famille', familleProposee: 'F002' }, { id: 'B002', statut: 'a-trancher', familleProposee: null }];
  const familles = [{ id: 'F001', nom: 'Button', blocs: ['B001'] }, { id: 'F002', nom: 'TextField', blocs: [] }];
  const raison = controler('scan/inventaire.json', { blocs, familles });
  assert.match(raison, /B001 est relié à F002/);
  assert.match(raison, /F002 ne compte pas B001/);
});

test('un bloc qui cite une famille abandonnée dit comment le passer hors kit', () => {
  const blocs = [{ id: 'B001', statut: 'hors-kit', motif: 'x', familleProposee: 'F004' }];
  const familles = [{ id: 'F004', nom: 'Badge', blocs: [], abandonnee: 'hors périmètre' }];
  assert.match(controler('scan/inventaire.json', { blocs, familles }), /familleProposee à null/);
});

test('un identifiant mal formé ne donne qu\'un écart, pas deux', () => {
  const blocs = [{ ...BLOCS[0], familleProposee: 'Button' }, BLOCS[1], BLOCS[2]];
  const raison = controler('scan/inventaire.json', { blocs, familles: FAMILLES });
  assert.match(raison, /1 écart/);
});

test('un inventaire illisible ne bloque pas les fichiers qui citent une famille', () => {
  avecInventaire(undefined, (uikit) => {
    writeFileSync(join(uikit, 'scan', 'inventaire.json'), '{pas du json');
    assert.equal(controler('ids.json', { lots: { 'P3-01': { familles: [{ id: 'F042', nom: 'X' }] } } }, { dossierUikit: uikit }), null);
  });
});

test('un Edit de l\'inventaire qui casse un lien est refusé', () => {
  avecInventaire(INVENTAIRE, (uikit) => {
    const chemin = join(uikit, 'scan', 'inventaire.json');
    const raison = controlerEcriture('Edit', { file_path: chemin, old_string: '"familleProposee":"F001"', new_string: '"familleProposee":"F009"' });
    assert.match(raison, /F009/);
  });
});
