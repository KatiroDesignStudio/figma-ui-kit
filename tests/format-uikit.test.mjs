// Tests du contrôle du format des fichiers de .uikit/ (plugins/figma-ui-kit/hooks/format-uikit.mjs).
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cheminDansUikit, contenuApres, controlerContenu, controlerEcriture, INTROUVABLE, NOMS_DOCUMENTES } from '../plugins/figma-ui-kit/hooks/format-uikit.mjs';
import { decider } from '../plugins/figma-ui-kit/hooks/filtre-outils.mjs';
import { sceau } from '../plugins/figma-ui-kit/skills/build/scripts/compteurs.mjs';

const DONNEES = new URL('../plugins/figma-ui-kit/skills/build/references/donnees.md', import.meta.url);

/** Bloc de résultat de script, scellé comme le fait le script. */
const scelle = (contenu) => ({ ...contenu, sceau: sceau(contenu) });
const json = (valeur) => JSON.stringify(valeur, null, 2);
const controler = (relatif, valeur, options) => controlerContenu(relatif, typeof valeur === 'string' ? valeur : json(valeur), options);

function avecDossier(remplir) {
  const racine = mkdtempSync(join(tmpdir(), 'format-uikit-'));
  const uikit = join(racine, '.uikit');
  mkdirSync(join(uikit, 'scan'), { recursive: true });
  try {
    return remplir(uikit);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
}

const PROGRESSION = { agent: 'seiri', mode: 'scan', etat: 'en_cours', resume: 'Public, 6/14 écrans · 3 120 calques' };
const ECRAN_MESURE = scelle({ id: '2:1', nom: 'Accueil', noeuds: 120, couleurs: { '#FFFFFF': 4 } });

// --- Chemins ---

test('cheminDansUikit rend le chemin relatif au dernier dossier .uikit', () => {
  assert.equal(cheminDansUikit('/a/b/.uikit/scan/index.json'), 'scan/index.json');
  assert.equal(cheminDansUikit('/a/.uikit/x/.uikit/survol.json'), 'survol.json');
  assert.equal(cheminDansUikit('C:\\chantier\\.uikit\\scan\\2-1.json'), 'scan/2-1.json');
  assert.equal(cheminDansUikit('/a/b/uikit.md'), null);
  assert.equal(cheminDansUikit('/a/.uikit'), null);
  assert.equal(cheminDansUikit('/a/.uikit/./scan/../survol.json'), 'survol.json');
  assert.equal(cheminDansUikit('/a/.UIKIT/progression.json'), 'progression.json');
  assert.equal(cheminDansUikit(undefined), null);
});

// --- Noms de fichiers ---

test('un fichier inconnu dans .uikit/ est refusé, avec la liste des fichiers permis', () => {
  const raison = controler('notes.json', {});
  assert.match(raison, /notes\.json/);
  assert.match(raison, /progression\.json/);
  assert.match(raison, /donnees\.md/);
});

test('les noms à motif sont reconnus : page de scan, delta, plan, vérification', () => {
  assert.equal(controler('scan/2334-193.json', { ecrans: [] }), null);
  assert.equal(controler('scan/0-1.json', {}), null);
  assert.equal(controler('scan/delta-P3.json', { constats: [] }), null);
  assert.equal(controler('scan/plan-12-34.json', { id: '12:34' }), null);
  for (const niveau of ['fondations', 'atomes', 'molecules', 'organismes', 'kit', 'correction', 'coherence', 'ecran-12-34']) {
    assert.equal(controler(`verification-${niveau}.json`, { ecarts: [] }), null, niveau);
  }
  assert.match(controler('verification-boutons.json', {}), /verification-boutons\.json/);
  assert.match(controler('scan/page-accueil.json', {}), /scan\/page-accueil\.json/);
});

test('chaque fichier de la table de donnees.md a un format, et inversement', () => {
  const table = readFileSync(DONNEES, 'utf8').split('\n')
    .map((ligne) => ligne.match(/^\| `([^`]+)` \|/))
    .filter(Boolean)
    .map((m) => m[1]);
  assert.deepEqual([...table].sort(), [...NOMS_DOCUMENTES].sort());
});

// --- Contenu ---

test('un JSON illisible est refusé avec l\'erreur de lecture', () => {
  const raison = controler('progression.json', '{"agent": "seiri",');
  assert.match(raison, /JSON/);
});

test('le fichier doit être un objet JSON', () => {
  assert.match(controler('perimetre.json', '[]'), /objet/);
});

test('une progression complète passe', () => {
  assert.equal(controler('progression.json', PROGRESSION), null);
});

test('une progression sans résumé ou avec un état inconnu est refusée', () => {
  const { resume, ...sansResume } = PROGRESSION;
  assert.match(controler('progression.json', sansResume), /resume/);
  const raison = controler('progression.json', { ...PROGRESSION, etat: 'termine' });
  assert.match(raison, /etat/);
  assert.match(raison, /en_cours, fait, incomplet/);
});

test('une clé inconnue au premier niveau est refusée, avec les clés permises', () => {
  const raison = controler('perimetre.json', { ecran: [] });
  assert.match(raison, /« ecran »/);
  assert.match(raison, /ecrans/);
});

test('un fichier en cours de remplissage passe : seules les clés présentes sont contrôlées', () => {
  assert.equal(controler('perimetre.json', { ecrans: [{ id: '2:1', nom: 'Accueil', page: '0:1', largeur: 1440 }] }), null);
  assert.equal(controler('scan/inventaire.json', {}), null);
});

test('fiche du chantier : choix git, date et lien Figma contrôlés', () => {
  const fiche = { lien: 'https://www.figma.com/design/abc/Mon-fichier', nom: 'Mon fichier', date: '2026-11-26', dossier: '/chantier', git: 'hors-git' };
  assert.equal(controler('fichier.json', fiche), null);
  assert.equal(controler('fichier.json', { ...fiche, diagnostic: { date: '2026-11-26', rapport: 'diagnostic-pre-ui-kit.md', partiel: false } }), null);
  assert.match(controler('fichier.json', { ...fiche, git: 'oui' }), /hors-git, versionne, pas-de-depot/);
  assert.match(controler('fichier.json', { ...fiche, date: '26/11/2026' }), /date/);
  assert.match(controler('fichier.json', { ...fiche, lien: 'figma.com/design/abc' }), /lien/);
  const { git, ...sansGit } = fiche;
  assert.match(controler('fichier.json', sansGit), /git/);
});

test('un élément de liste doit porter ses champs obligatoires', () => {
  const raison = controler('verification-atomes.json', { ecarts: [{ id: 'E1', noeud: '2:1', regle: 'rayon', decision: 'aucune' }] });
  assert.match(raison, /ecarts\[0\]/);
  assert.match(raison, /etat/);
});

test('identifiants de constat et de bloc au bon format', () => {
  const constat = { id: 'C007', type: 'couleurs-uniques', noeuds: ['2:1'], occurrences: 3 };
  assert.equal(controler('scan/2-1.json', { constats: [constat] }), null);
  assert.match(controler('scan/2-1.json', { constats: [{ ...constat, id: 'C7' }] }), /constats\[0\]\.id/);
  assert.match(controler('scan/inventaire.json', { blocs: [{ id: 'bloc-1', statut: 'famille' }] }), /blocs\[0\]\.id/);
});

test('un constat cite 20 nœuds au plus', () => {
  const noeuds = Array.from({ length: 21 }, (_, i) => `2:${i}`);
  assert.match(controler('scan/2-1.json', { constats: [{ id: 'C001', type: 'x', noeuds }] }), /20/);
});

test('un identifiant de nœud Figma au mauvais format est refusé', () => {
  assert.match(controler('perimetre.json', { ecrans: [{ id: 'Accueil', nom: 'Accueil', page: '0:1' }] }), /ecrans\[0\]\.id/);
  assert.equal(controler('perimetre.json', { liens: [{ de: 'I2:1;3:4', vers: '5:6' }] }), null);
});

test('un bloc écarté du kit doit dire pourquoi', () => {
  const raison = controler('scan/inventaire.json', { blocs: [{ id: 'B001', statut: 'hors-kit' }] });
  assert.match(raison, /motif/);
  assert.equal(controler('scan/inventaire.json', { blocs: [{ id: 'B001', statut: 'hors-kit', motif: 'maquette d\'exemple' }] }), null);
});

test('une liste d\'erreurs trop longue est résumée', () => {
  const ecarts = Array.from({ length: 12 }, (_, i) => ({ id: `E${i}` }));
  const raison = controler('verification-kit.json', { ecarts });
  assert.match(raison, /et \d+ autres/);
});

// --- Résultats de scripts scellés ---

test('les mesures d\'une page, recopiées telles quelles, passent', () => {
  const mesures = {
    compteurs: { version: 1, page: { id: '0:1', nom: 'Écrans' }, ecrans: [ECRAN_MESURE], composants: scelle({ sets: 1, simples: 0, variantes: 3 }), nomsBibliotheques: [], reste: [] },
    contrastes: { version: 1, page: { id: '0:1', nom: 'Écrans' }, ecrans: [scelle({ id: '2:1', textes: 3, echecs: 0 })], reste: [] },
  };
  assert.equal(controler('scan/0-1.json', { mesures }), null);
});

test('une mesure retouchée en la recopiant est refusée, avec son emplacement', () => {
  const retouche = { ...ECRAN_MESURE, noeuds: 121 };
  const raison = controler('scan/0-1.json', { mesures: { compteurs: { ecrans: [ECRAN_MESURE, retouche] } } });
  assert.match(raison, /mesures\.compteurs\.ecrans\[1\]/);
  assert.match(raison, /sceau/);
});

test('une mesure sans sceau est refusée', () => {
  const { sceau: _, ...sansSceau } = ECRAN_MESURE;
  assert.match(controler('scan/0-1.json', { mesures: { contrastes: { ecrans: [sansSceau] } } }), /sceau/);
});

test('une clé inconnue dans les mesures est refusée : compteurs.mjs ne la lirait pas', () => {
  assert.match(controler('scan/0-1.json', { mesures: { compteur: { ecrans: [] } } }), /« compteur »/);
});

test('empreinte de page et mesures du survol : sceau vérifié', () => {
  const empreinte = scelle({ page: { id: '0:1', nom: 'Écrans' }, noeuds: 630, parType: { FRAME: 10 }, instances: {} });
  assert.equal(controler('scan/index.json', { pages: [{ id: '0:1', nom: 'Écrans', etat: 'fait', curseur: null, empreinte }] }), null);
  assert.match(controler('scan/index.json', { pages: [{ id: '0:1', etat: 'fait', empreinte: { ...empreinte, noeuds: 600 } }] }), /pages\[0\]\.empreinte/);
  const mesures = scelle({ version: 1, pages: [], motsRecurrents: [], versions: [], nomsEnDouble: [], local: {} });
  assert.equal(controler('survol.json', { mesures }), null);
  assert.match(controler('survol.json', { mesures: { ...mesures, version: 2 } }), /mesures/);
});

// --- Fichiers écrits par un script ---

test('scan/compteurs.json ne s\'écrit pas à la main', () => {
  assert.match(controler('scan/compteurs.json', { ecrans: {} }), /compteurs\.mjs/);
});

test('scan/compteurs-avant.json doit être la copie conforme de scan/compteurs.json', () => {
  avecDossier((uikit) => {
    const compteurs = { version: 1, ecransRetenus: 2, ecransMesures: 2, ecrans: { noeuds: 300 }, kit: null, composants: { sets: 1 }, invalides: [] };
    assert.match(controler('scan/compteurs-avant.json', compteurs, { dossierUikit: uikit }), /compteurs\.json/);
    writeFileSync(join(uikit, 'scan', 'compteurs.json'), JSON.stringify(compteurs));
    assert.equal(controler('scan/compteurs-avant.json', json(compteurs), { dossierUikit: uikit }), null);
    assert.match(controler('scan/compteurs-avant.json', { ...compteurs, ecransMesures: 1 }, { dossierUikit: uikit }), /copie/);
  });
});

// --- Write et Edit ---

test('contenuApres rend le texte écrit par Write', () => {
  assert.equal(contenuApres('Write', { file_path: '/x/.uikit/survol.json', content: '{}' }), '{}');
});

test('contenuApres applique un Edit au fichier existant', () => {
  avecDossier((uikit) => {
    const chemin = join(uikit, 'progression.json');
    writeFileSync(chemin, json(PROGRESSION));
    const apres = contenuApres('Edit', { file_path: chemin, old_string: '"en_cours"', new_string: '"fait"' });
    assert.equal(JSON.parse(apres).etat, 'fait');
    writeFileSync(chemin, '{"a": "x", "b": "x"}');
    assert.equal(contenuApres('Edit', { file_path: chemin, old_string: '"x"', new_string: '"y"', replace_all: true }), '{"a": "y", "b": "y"}');
  });
});

test('contenuApres rend null quand l\'Edit échouera de lui-même', () => {
  avecDossier((uikit) => {
    const chemin = join(uikit, 'progression.json');
    assert.equal(contenuApres('Edit', { file_path: chemin, old_string: 'a', new_string: 'b' }), null);
    writeFileSync(chemin, '{"a": "x", "b": "x"}');
    assert.equal(contenuApres('Edit', { file_path: chemin, old_string: '"x"', new_string: '"y"' }), null);
    assert.equal(contenuApres('Edit', { file_path: chemin, old_string: '', new_string: '{}' }), null);
  });
});

test('contenuApres signale un texte à remplacer introuvable tel quel', () => {
  avecDossier((uikit) => {
    const chemin = join(uikit, 'progression.json');
    writeFileSync(chemin, '{"resume": "l’écran"}');
    assert.equal(contenuApres('Edit', { file_path: chemin, old_string: "l'écran", new_string: 'x' }), INTROUVABLE);
  });
});

test('un Edit au texte vide crée le fichier : son contenu est contrôlé', () => {
  avecDossier((uikit) => {
    const chemin = join(uikit, 'progression.json');
    assert.equal(contenuApres('Edit', { file_path: chemin, old_string: '', new_string: '{}' }), '{}');
    assert.match(controlerEcriture('Edit', { file_path: chemin, old_string: '', new_string: '{"agent": "x"}' }), /agent/);
    writeFileSync(chemin, '');
    assert.match(controlerEcriture('Edit', { file_path: chemin, old_string: '', new_string: 'pas du json' }), /JSON/);
  });
});

test('les motifs spéciaux de remplacement sont écrits tels quels', () => {
  avecDossier((uikit) => {
    const chemin = join(uikit, 'progression.json');
    writeFileSync(chemin, '{"resume": "A"}');
    assert.equal(contenuApres('Edit', { file_path: chemin, old_string: 'A', new_string: '$& $1 $$' }), '{"resume": "$& $1 $$"}');
  });
});

test('un Edit au texte introuvable est refusé avec la consigne de relire', () => {
  avecDossier((uikit) => {
    const chemin = join(uikit, 'progression.json');
    writeFileSync(chemin, json(PROGRESSION));
    assert.match(controlerEcriture('Edit', { file_path: chemin, old_string: '"absent"', new_string: '"x"' }), /relis le fichier/);
  });
});

test('une panne du contrôle laisse passer l\'écriture', () => {
  avecDossier((uikit) => {
    mkdirSync(join(uikit, 'ids.json'));
    assert.equal(controlerEcriture('Edit', { file_path: join(uikit, 'ids.json'), old_string: 'a', new_string: 'b' }), null);
  });
});

test('compteurs-avant.json refusé si compteurs.json est absent ou illisible', () => {
  avecDossier((uikit) => {
    const chemin = join(uikit, 'scan', 'compteurs-avant.json');
    assert.match(controlerEcriture('Write', { file_path: chemin, content: '{}' }), /absent/);
    writeFileSync(join(uikit, 'scan', 'compteurs.json'), '{pas du json');
    assert.match(controlerEcriture('Write', { file_path: chemin, content: '{}' }), /illisible/);
  });
});

test('controlerEcriture refuse un Edit qui casse le format', () => {
  avecDossier((uikit) => {
    const chemin = join(uikit, 'progression.json');
    writeFileSync(chemin, json(PROGRESSION));
    assert.equal(controlerEcriture('Edit', { file_path: chemin, old_string: '"en_cours"', new_string: '"fait"' }), null);
    assert.match(controlerEcriture('Edit', { file_path: chemin, old_string: '"en_cours"', new_string: '"fini"' }), /etat/);
  });
});

test('controlerEcriture ne s\'occupe que de .uikit/', () => {
  assert.equal(controlerEcriture('Write', { file_path: '/chantier/uikit.md', content: '# notes' }), null);
});

// --- Filtre des outils ---

test('le filtre refuse à un agent une écriture hors format dans .uikit/', () => {
  const raison = decider({ agent_type: 'figma-ui-kit:seiri', tool_name: 'Write', tool_input: { file_path: '/c/.uikit/progression.json', content: json({ ...PROGRESSION, etat: 'fini' }) } });
  assert.match(raison, /figma-ui-kit:seiri/);
  assert.match(raison, /progression\.json/);
});

test('le filtre contrôle aussi le format quand la conversation principale écrit dans .uikit/', () => {
  const raison = decider({ tool_name: 'Write', tool_input: { file_path: '/c/.uikit/fichier.json', content: '{"git": "oui"}' } });
  assert.match(raison, /hors-git/);
  assert.equal(decider({ tool_name: 'Write', tool_input: { file_path: '/c/.uikit/progression.json', content: json(PROGRESSION) } }), null);
});

test('la conversation principale peut écrire un fichier inconnu de .uikit/, pas un agent', () => {
  const ecriture = { tool_name: 'Write', tool_input: { file_path: '/home/u/.uikit/mon-projet/package.json', content: '{}' } };
  assert.equal(decider(ecriture), null);
  assert.match(decider({ ...ecriture, agent_type: 'figma-ui-kit:seiri' }), /n'est pas un fichier du chantier/);
});

test('le filtre reconnaît un dossier .UIKIT écrit en majuscules', () => {
  const raison = decider({ agent_type: 'figma-ui-kit:seiri', tool_name: 'Write', tool_input: { file_path: '/c/.UIKIT/progression.json', content: '{}' } });
  assert.match(raison, /resume/);
});

test('hors de .uikit/, la conversation principale écrit librement', () => {
  assert.equal(decider({ tool_name: 'Write', tool_input: { file_path: '/c/uikit.md', content: 'x' } }), null);
});

test('un agent hors de .uikit/ reste refusé comme avant', () => {
  assert.match(decider({ agent_type: 'figma-ui-kit:seiton', tool_name: 'Write', tool_input: { file_path: '/c/uikit.md', content: 'x' } }), /\.uikit\//);
});

// --- Écritures demandées par les consignes : jamais refusées ---

test('les écritures que demandent les consignes des agents passent', () => {
  const empreinte = scelle({ page: { id: '0:1', nom: 'Écrans' }, noeuds: 630, parType: {}, instances: {} });
  const cas = [
    ['survol.json', { pages: [{ id: '9:1', nom: 'Revue', role: 'plugin' }], bibliotheques: { ajoutees: [{ nom: 'Icônes', cle: null, description: null }] } }],
    ['survol.json', { kitExistant: { pages: ['3:1', '4:1'], composants: 12 }, decisionsFigma: [{ decision: 'Rayon 8', date: '26 novembre 2026' }] }],
    ['perimetre.json', { kitExistant: { familles: [{ nom: 'Bouton', conforme: true }], partReliee: 72.5, faitParKatiro: false } }],
    ['perimetre-valide.json', { couverture: 'rangee', typeProduit: [{ type: 'saas', indices: ['tableau de bord'] }], horsLot: ['2:1'] }],
    ['scan/synthese.json', { grilles: [{ conteneur: '2:1', grille: '12 colonnes' }], logo: 'non vu', couverture: { taux: 94.1 } }],
    ['scan/plan-12-34.json', { manquesKit: [{ noeud: '12:40', famille: null, bloc: 'B004', type: 'famille-manquante' }] }],
    ['verification-ecran-12-34.json', { resteAFaire: [{ section: 'En-tête', constat: 'valeur en dur', noeuds: ['12:41'] }] }],
    ['ids.json', { lots: { 'P3-02': { debut: { '0:1': empreinte }, familles: [{ id: 'F001', nom: 'Bouton', variantesObservees: [] }] } } }],
  ];
  for (const [relatif, valeur] of cas) assert.equal(controler(relatif, valeur), null, `${relatif} : ${controler(relatif, valeur)}`);
});

test('une empreinte de début de lot retapée est refusée', () => {
  const empreinte = scelle({ page: { id: '0:1', nom: 'Écrans' }, noeuds: 630, parType: {}, instances: {} });
  const raison = controler('ids.json', { lots: { 'P3-02': { debut: { '0:1': { ...empreinte, noeuds: 631 } } } } });
  assert.match(raison, /lots\.P3-02\.debut\.0:1/);
});
