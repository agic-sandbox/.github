#!/usr/bin/env node
// @ts-nocheck
/*
 * project-alerts.mjs
 * -------------------------------------------------------------------------
 * Motore di "alert/allarmi" per GitHub Projects (Scrum template AGIC).
 *
 * Sottocomandi:
 *   node project-alerts.mjs setup    -> crea il campo single-select "🚨 Alert" sul progetto (usa PROJECT_NUMBER)
 *   node project-alerts.mjs run      -> valuta le regole su UN progetto (usa PROJECT_NUMBER)
 *   node project-alerts.mjs run-all  -> scopre TUTTI i project dell'org e applica le regole a quelli col campo Alert
 *   aggiungi --dry-run per simulare senza scrivere
 *
 * Variabili d'ambiente richieste:
 *   GITHUB_TOKEN     PAT classico con scope "project" (e "read:org" se org). In Actions usare un secret.
 *   PROJECT_OWNER    login dell'owner (es. "agic-sandbox") - sempre richiesto
 *   PROJECT_NUMBER   numero del project - richiesto solo per "setup" e "run"
 *   OWNER_TYPE       "organization" (default) oppure "user"
 *
 * Le soglie e i nomi delle opzioni sono nel blocco CONFIG: adattali ai valori
 * effettivi configurati sul progetto a cui applichi le regole.
 * -------------------------------------------------------------------------
 */

// ===================== CONFIG =====================
const CONFIG = {
  // --- Soglie temporali (giorni) ---
  dueSoonDays: 3,              // (2) "In scadenza": target date entro N giorni
  staleDays: 5,               // (4) "Fermo": In Progress senza update da N giorni
  impedimentMaxAgeDays: 3,    // (6) "Impediment bloccante": aperto da piu di N giorni
  highPriorityBacklogDays: 5, // (7) "Priorita alta in backlog": in backlog da N giorni
  sprintProgressThreshold: 0.7, // (8) sprint considerato "quasi concluso" oltre questa frazione trascorsa
  lowProgressPercent: 50,     // (8) sotto questa % di sub-issue completate scatta l'alert

  // --- Mappatura valori dei campi single-select (ADATTA AI TUOI VALORI) ---
  // Stati che NON contano come "iniziati" (backlog / da fare)
  notStartedStatuses: ['New', 'In analysis', 'Ready to work', 'Approved', 'To Do'],
  // Stati di lavorazione attiva
  inProgressStatuses: ['In Progress', 'Ready for qa'],
  // Stati "chiusi": nessun alert
  doneStatuses: ['Done', 'Removed'],
  // Valori di Priority considerati "alti"
  highPriorityValues: ['P0', 'P1', 'Urgent', 'High'],
  // Valori di Severity considerati "critici"
  criticalSeverityValues: ['Critical', 'High', 'Blocker'],

  // --- Mappatura "tipo" item (Issue Type nativo o, in fallback, label) ---
  bugTypes: ['Bug'],
  impedimentTypes: ['Impediment'],
  parentTypes: ['Epic', 'Feature'],

  // --- Requisiti di "readiness" per item nello sprint corrente (5) ---
  requireStoryPoints: true,
  requireAssignee: true,

  // --- Nomi dei campi sul progetto (cambia solo se li hai rinominati) ---
  fieldNames: {
    alert: '🚨 Alert',
    status: 'Status',
    priority: 'Priority',
    severity: 'Severity',
    storyPoints: 'Story Points',
    targetDate: 'Target date',
    iteration: 'Iteration',
  },
};

// Definizione opzioni del campo Alert (ordine = priorita decrescente).
// La prima regola che fa match vince. "key" e' usata internamente, "name" e' il
// valore mostrato come badge colorato nel project.
const ALERT_DEFS = [
  { key: 'overdue',        name: '🔴 Scaduto',                  color: 'RED',    description: 'Item aperto con target date superata' },
  { key: 'critical_bug',   name: '🔴 Bug critico aperto',       color: 'RED',    description: 'Bug critico non ancora preso in carico' },
  { key: 'impediment',     name: '🔴 Impediment bloccante',     color: 'RED',    description: 'Impediment aperto da troppo tempo' },
  { key: 'due_soon',       name: '🟠 In scadenza',              color: 'ORANGE', description: 'Target date entro pochi giorni' },
  { key: 'stale',          name: '🟠 Fermo',                    color: 'ORANGE', description: 'In Progress senza aggiornamenti' },
  { key: 'high_backlog',   name: '🟠 Priorita alta in backlog', color: 'ORANGE', description: 'Alta priorita ferma in backlog' },
  { key: 'not_ready',      name: '🟡 Non pronto per sprint',    color: 'YELLOW', description: 'Item nello sprint senza stima o assegnatario' },
  { key: 'low_progress',   name: '🟡 Avanzamento insufficiente',color: 'YELLOW', description: 'Epic/Feature in ritardo a sprint quasi concluso' },
];

// ===================== GraphQL helper =====================
const TOKEN = process.env.GITHUB_TOKEN || process.env.PROJECTS_TOKEN;
const OWNER = process.env.PROJECT_OWNER;
const NUMBER = parseInt(process.env.PROJECT_NUMBER || '', 10);
const OWNER_TYPE = (process.env.OWNER_TYPE || 'organization').toLowerCase();

if (!TOKEN) fail('Manca GITHUB_TOKEN/PROJECTS_TOKEN (PAT con scope "project").');
if (!OWNER) fail('Manca PROJECT_OWNER.');

async function gql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'GraphQL-Features': 'issue_types,sub_issues',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error('GraphQL: ' + JSON.stringify(json.errors, null, 2));
  }
  return json.data;
}

function fail(msg) {
  console.error('ERRORE: ' + msg);
  process.exit(1);
}

// ===================== Project lookup =====================
async function getProjectId() {
  if (!NUMBER) fail('Manca PROJECT_NUMBER (richiesto per setup/run).');
  const q = OWNER_TYPE === 'user'
    ? `query($login:String!,$n:Int!){ user(login:$login){ projectV2(number:$n){ id } } }`
    : `query($login:String!,$n:Int!){ organization(login:$login){ projectV2(number:$n){ id } } }`;
  const data = await gql(q, { login: OWNER, n: NUMBER });
  const node = OWNER_TYPE === 'user' ? data.user : data.organization;
  const id = node?.projectV2?.id;
  if (!id) fail(`Project #${NUMBER} non trovato per ${OWNER_TYPE} "${OWNER}".`);
  return id;
}

// Scopre tutti i project (aperti) dell'owner.
async function listProjects() {
  const out = [];
  let cursor = null, hasNext = true;
  const q = OWNER_TYPE === 'user'
    ? `query($login:String!,$cursor:String){ user(login:$login){ projectsV2(first:50, after:$cursor){ pageInfo{ hasNextPage endCursor } nodes{ id number title closed } } } }`
    : `query($login:String!,$cursor:String){ organization(login:$login){ projectsV2(first:50, after:$cursor){ pageInfo{ hasNextPage endCursor } nodes{ id number title closed } } } }`;
  while (hasNext) {
    const data = await gql(q, { login: OWNER, cursor });
    const node = OWNER_TYPE === 'user' ? data.user : data.organization;
    const conn = node.projectsV2;
    for (const p of conn.nodes) if (!p.closed) out.push(p);
    hasNext = conn.pageInfo.hasNextPage;
    cursor = conn.pageInfo.endCursor;
  }
  return out;
}

async function getFields(projectId) {
  const q = `
    query($id: ID!) {
      node(id: $id) {
        ... on ProjectV2 {
          fields(first: 50) {
            nodes {
              __typename
              ... on ProjectV2FieldCommon { id name }
              ... on ProjectV2SingleSelectField { id name options { id name } }
              ... on ProjectV2IterationField {
                id name
                configuration { iterations { id title startDate duration } completedIterations { id title startDate duration } }
              }
            }
          }
        }
      }
    }`;
  const data = await gql(q, { id: projectId });
  const nodes = data.node.fields.nodes;
  const byName = {};
  for (const f of nodes) if (f && f.name) byName[f.name] = f;
  return byName;
}

// ===================== Setup: crea il campo Alert =====================
async function setup() {
  const projectId = await getProjectId();
  const fields = await getFields(projectId);
  const alertName = CONFIG.fieldNames.alert;

  if (fields[alertName]) {
    console.log(`Il campo "${alertName}" esiste gia'. Nessuna azione.`);
    console.log('Verifica che le opzioni coincidano con queste:');
    ALERT_DEFS.forEach(a => console.log(`  - ${a.name}`));
    return;
  }

  const options = ALERT_DEFS.map(a => ({ name: a.name, color: a.color, description: a.description }));
  const m = `
    mutation($project: ID!, $name: String!, $options: [ProjectV2SingleSelectFieldOptionInput!]!) {
      createProjectV2Field(input: {
        projectId: $project, dataType: SINGLE_SELECT, name: $name, singleSelectOptions: $options
      }) {
        projectV2Field { ... on ProjectV2SingleSelectField { id name options { id name } } }
      }
    }`;
  const data = await gql(m, { project: projectId, name: alertName, options });
  const created = data.createProjectV2Field.projectV2Field;
  console.log(`Creato campo "${created.name}" con ${created.options.length} opzioni:`);
  created.options.forEach(o => console.log(`  - ${o.name}`));
}

// ===================== Run: valuta regole e aggiorna =====================
async function run(dryRun) {
  const projectId = await getProjectId();
  const summary = await processProject(projectId, dryRun, false);
  if (!summary) fail(`Campo "${CONFIG.fieldNames.alert}" inesistente sul progetto. Esegui prima "setup".`);
}

// Scopre e processa TUTTI i project dell'owner che hanno il campo Alert.
async function runAll(dryRun) {
  const projects = await listProjects();
  console.log(`Trovati ${projects.length} project aperti per "${OWNER}". Cerco quelli col campo "${CONFIG.fieldNames.alert}"...\n`);
  let processed = 0, skipped = 0, errored = 0;
  for (const p of projects) {
    const header = `=== #${p.number} ${p.title} ===`;
    try {
      const summary = await processProject(p.id, dryRun, true);
      if (summary === null) { skipped++; continue; } // niente campo Alert
      console.log(header);
      console.log(`  ${summary.changed} impostati, ${summary.cleared} rimossi, ${summary.unchanged} invariati su ${summary.total} item.\n`);
      processed++;
    } catch (e) {
      console.error(header);
      console.error(`  ERRORE: ${e.message || e}\n`);
      errored++;
    }
  }
  console.log(`\nTotale: ${processed} progetti processati, ${skipped} saltati (senza campo Alert), ${errored} in errore.${dryRun ? ' [DRY-RUN]' : ''}`);
  if (errored > 0) process.exitCode = 1;
}

// Processa un singolo progetto. Ritorna null se manca il campo Alert (skip),
// altrimenti un riepilogo { changed, cleared, unchanged, total }.
async function processProject(projectId, dryRun, quiet) {
  const fields = await getFields(projectId);
  const alertField = fields[CONFIG.fieldNames.alert];
  if (!alertField) return null;

  // map nome opzione -> id
  const optByName = {};
  for (const o of alertField.options) optByName[o.name] = o.id;
  const keyToOptionId = {};
  for (const a of ALERT_DEFS) {
    if (optByName[a.name]) keyToOptionId[a.key] = optByName[a.name];
    else console.warn(`ATTENZIONE: opzione "${a.name}" non trovata sul campo Alert (project ${projectId}).`);
  }

  const ctx = buildContext(fields);
  const items = await getAllItems(projectId);

  let changed = 0, cleared = 0, unchanged = 0;
  for (const it of items) {
    const desiredKey = evaluate(it, ctx);
    const desiredName = desiredKey ? ALERT_DEFS.find(a => a.key === desiredKey).name : null;
    const currentName = it.alert || null;

    if (desiredName === currentName) { unchanged++; continue; }

    const label = it.number ? `#${it.number}` : '(draft)';
    if (desiredName) {
      if (!quiet) console.log(`${label} ${it.title?.slice(0, 50) || ''} -> ${desiredName}`);
      if (!dryRun) await setAlert(projectId, it.id, alertField.id, keyToOptionId[desiredKey]);
      changed++;
    } else {
      if (!quiet) console.log(`${label} ${it.title?.slice(0, 50) || ''} -> (rimuovo alert)`);
      if (!dryRun) await clearAlert(projectId, it.id, alertField.id);
      cleared++;
    }
  }

  if (!quiet) console.log(`\nRiepilogo: ${changed} impostati, ${cleared} rimossi, ${unchanged} invariati su ${items.length} item.${dryRun ? ' [DRY-RUN]' : ''}`);
  return { changed, cleared, unchanged, total: items.length };
}

function buildContext(fields) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let currentIterationId = null;
  let iterationElapsedFraction = 0;
  const iterField = fields[CONFIG.fieldNames.iteration];
  const iters = iterField?.configuration?.iterations || [];
  for (const it of iters) {
    const start = new Date(it.startDate + 'T00:00:00Z');
    const end = new Date(start.getTime() + it.duration * 86400000);
    if (today >= start && today < end) {
      currentIterationId = it.id;
      iterationElapsedFraction = (today.getTime() - start.getTime()) / (end.getTime() - start.getTime());
    }
  }
  return { today, currentIterationId, iterationElapsedFraction };
}

// ===================== Regole =====================
function evaluate(it, ctx) {
  const status = it.status;
  if (CONFIG.doneStatuses.includes(status)) return null; // item chiuso: nessun alert

  // (1) Scaduto
  if (it.targetDate && dateOnly(it.targetDate) < ctx.today) return 'overdue';

  // (3) Bug critico non gestito
  if (isType(it, CONFIG.bugTypes)
      && CONFIG.criticalSeverityValues.includes(it.severity)
      && CONFIG.notStartedStatuses.includes(status)) return 'critical_bug';

  // (6) Impediment aperto da troppo tempo
  if (isType(it, CONFIG.impedimentTypes)
      && ageDays(it.createdAt, ctx.today) > CONFIG.impedimentMaxAgeDays) return 'impediment';

  // (2) In scadenza
  if (it.targetDate) {
    const d = daysUntil(dateOnly(it.targetDate), ctx.today);
    if (d >= 0 && d <= CONFIG.dueSoonDays) return 'due_soon';
  }

  // (4) Fermo (In Progress senza update)
  if (CONFIG.inProgressStatuses.includes(status)
      && ageDays(it.updatedAt, ctx.today) > CONFIG.staleDays) return 'stale';

  // (7) Priorita alta ferma in backlog
  if (CONFIG.highPriorityValues.includes(it.priority)
      && CONFIG.notStartedStatuses.includes(status)
      && ageDays(it.createdAt, ctx.today) > CONFIG.highPriorityBacklogDays) return 'high_backlog';

  // (5) Item nello sprint corrente non pronto
  if (ctx.currentIterationId && it.iterationId === ctx.currentIterationId) {
    const missingSP = CONFIG.requireStoryPoints && (it.storyPoints == null);
    const missingAssignee = CONFIG.requireAssignee && (it.assignees === 0);
    if (missingSP || missingAssignee) return 'not_ready';
  }

  // (8) Epic/Feature in ritardo a sprint quasi concluso
  if (isType(it, CONFIG.parentTypes)
      && ctx.currentIterationId && it.iterationId === ctx.currentIterationId
      && ctx.iterationElapsedFraction >= CONFIG.sprintProgressThreshold
      && it.subProgress != null && it.subProgress < CONFIG.lowProgressPercent) return 'low_progress';

  return null;
}

function isType(it, list) {
  const lower = list.map(s => s.toLowerCase());
  if (it.type && lower.includes(it.type.toLowerCase())) return true;
  return it.labels.some(l => lower.includes(l.toLowerCase()));
}

// ===================== Date utils =====================
function dateOnly(s) { const d = new Date(s + 'T00:00:00Z'); d.setUTCHours(0, 0, 0, 0); return d; }
function ageDays(iso, today) { if (!iso) return 0; return Math.floor((today.getTime() - new Date(iso).getTime()) / 86400000); }
function daysUntil(date, today) { return Math.floor((date.getTime() - today.getTime()) / 86400000); }

// ===================== Items =====================
async function getAllItems(projectId) {
  const out = [];
  let cursor = null, hasNext = true;
  const q = `
    query($id: ID!, $cursor: String) {
      node(id: $id) {
        ... on ProjectV2 {
          items(first: 50, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id
              fieldValues(first: 40) {
                nodes {
                  __typename
                  ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2FieldCommon { name } } }
                  ... on ProjectV2ItemFieldDateValue { date field { ... on ProjectV2FieldCommon { name } } }
                  ... on ProjectV2ItemFieldNumberValue { number field { ... on ProjectV2FieldCommon { name } } }
                  ... on ProjectV2ItemFieldIterationValue { iterationId title field { ... on ProjectV2FieldCommon { name } } }
                }
              }
              content {
                __typename
                ... on Issue {
                  number title createdAt updatedAt
                  assignees { totalCount }
                  issueType { name }
                  labels(first: 20) { nodes { name } }
                  subIssuesSummary { total completed percentCompleted }
                }
                ... on DraftIssue { title createdAt updatedAt }
              }
            }
          }
        }
      }
    }`;
  while (hasNext) {
    const data = await gql(q, { id: projectId, cursor });
    const conn = data.node.items;
    for (const n of conn.nodes) out.push(normalizeItem(n));
    hasNext = conn.pageInfo.hasNextPage;
    cursor = conn.pageInfo.endCursor;
  }
  return out;
}

function normalizeItem(node) {
  const fv = {};
  let iterationId = null;
  for (const v of node.fieldValues.nodes) {
    const fname = v.field?.name;
    if (!fname) continue;
    if (v.__typename === 'ProjectV2ItemFieldSingleSelectValue') fv[fname] = v.name;
    else if (v.__typename === 'ProjectV2ItemFieldDateValue') fv[fname] = v.date;
    else if (v.__typename === 'ProjectV2ItemFieldNumberValue') fv[fname] = v.number;
    else if (v.__typename === 'ProjectV2ItemFieldIterationValue' && fname === CONFIG.fieldNames.iteration) iterationId = v.iterationId;
  }
  const c = node.content || {};
  const N = CONFIG.fieldNames;
  return {
    id: node.id,
    number: c.number ?? null,
    title: c.title ?? '',
    type: c.issueType?.name ?? null,
    labels: (c.labels?.nodes || []).map(l => l.name),
    createdAt: c.createdAt ?? null,
    updatedAt: c.updatedAt ?? null,
    assignees: c.assignees?.totalCount ?? 0,
    subProgress: c.subIssuesSummary?.total ? c.subIssuesSummary.percentCompleted : null,
    status: fv[N.status] ?? null,
    priority: fv[N.priority] ?? null,
    severity: fv[N.severity] ?? null,
    storyPoints: fv[N.storyPoints] ?? null,
    targetDate: fv[N.targetDate] ?? null,
    iterationId,
    alert: fv[N.alert] ?? null,
  };
}

// ===================== Mutations =====================
async function setAlert(projectId, itemId, fieldId, optionId) {
  const m = `
    mutation($p: ID!, $i: ID!, $f: ID!, $o: String!) {
      updateProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f, value: { singleSelectOptionId: $o } }) {
        projectV2Item { id }
      }
    }`;
  await gql(m, { p: projectId, i: itemId, f: fieldId, o: optionId });
}

async function clearAlert(projectId, itemId, fieldId) {
  const m = `
    mutation($p: ID!, $i: ID!, $f: ID!) {
      clearProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f }) {
        projectV2Item { id }
      }
    }`;
  await gql(m, { p: projectId, i: itemId, f: fieldId });
}

// ===================== Entry point =====================
const cmd = process.argv[2];
const dryRun = process.argv.includes('--dry-run');
(async () => {
  try {
    if (cmd === 'setup') await setup();
    else if (cmd === 'run') await run(dryRun);
    else if (cmd === 'run-all') await runAll(dryRun);
    else {
      console.log('Uso: node project-alerts.mjs <setup|run|run-all> [--dry-run]');
      process.exit(1);
    }
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
})();
