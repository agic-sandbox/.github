// @ts-nocheck
/*
 * lib/projects.mjs
 * Helper condivisi per le automazioni di processo sui GitHub Projects
 * (digest, metriche, ecc.). Stesso approccio centralizzato degli alert.
 *
 * Env richieste:
 *   GITHUB_TOKEN / PROJECTS_TOKEN  PAT con scope "project" (+ read:org)
 *   PROJECT_OWNER                  login owner (es. "agic-sandbox")
 *   OWNER_TYPE                     "organization" (default) | "user"
 *   PROJECT_NUMBER                 opzionale (solo per operazioni su singolo project)
 */

export const TOKEN = process.env.GITHUB_TOKEN || process.env.PROJECTS_TOKEN;
export const OWNER = process.env.PROJECT_OWNER;
export const OWNER_TYPE = (process.env.OWNER_TYPE || 'organization').toLowerCase();
export const NUMBER = parseInt(process.env.PROJECT_NUMBER || '', 10) || null;

// Vocabolario Scrum condiviso: adatta qui i nomi/valori se diversi sui progetti.
export const CONFIG = {
  fieldNames: {
    status: 'Status',
    priority: 'Priority',
    severity: 'Severity',
    storyPoints: 'Story Points',
    targetDate: 'Target date',
    iteration: 'Iteration',
    alert: '🚨 Alert',
  },
  doneStatuses: ['Done', 'Removed'],
  inProgressStatuses: ['In Progress', 'Ready for qa'],
  impedimentTypes: ['Impediment'],
  bugTypes: ['Bug'],
  dueSoonDays: 3,
};

export function fail(msg) {
  console.error('ERRORE: ' + msg);
  process.exit(1);
}

if (!TOKEN) fail('Manca GITHUB_TOKEN/PROJECTS_TOKEN (PAT con scope "project").');
if (!OWNER) fail('Manca PROJECT_OWNER.');

export async function gql(query, variables = {}) {
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
  if (json.errors) throw new Error('GraphQL: ' + JSON.stringify(json.errors, null, 2));
  return json.data;
}

// ---- Project discovery ----
// Esclude progetti chiusi e progetti template (su questi l'API rifiuta scritture come gli status update).
export async function listProjects() {
  const out = [];
  let cursor = null, hasNext = true;
  const q = OWNER_TYPE === 'user'
    ? `query($login:String!,$cursor:String){ user(login:$login){ projectsV2(first:50, after:$cursor){ pageInfo{ hasNextPage endCursor } nodes{ id number title closed template shortDescription items(first:1){ totalCount } } } } }`
    : `query($login:String!,$cursor:String){ organization(login:$login){ projectsV2(first:50, after:$cursor){ pageInfo{ hasNextPage endCursor } nodes{ id number title closed template shortDescription items(first:1){ totalCount } } } } }`;
  while (hasNext) {
    const data = await gql(q, { login: OWNER, cursor });
    const node = OWNER_TYPE === 'user' ? data.user : data.organization;
    const conn = node.projectsV2;
    for (const p of conn.nodes) {
      if (p.closed || p.template) continue;
      out.push({ id: p.id, number: p.number, title: p.title, itemCount: p.items.totalCount });
    }
    hasNext = conn.pageInfo.hasNextPage;
    cursor = conn.pageInfo.endCursor;
  }
  return out;
}

// ---- Fields ----
export async function getFields(projectId) {
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
                configuration {
                  iterations { id title startDate duration }
                  completedIterations { id title startDate duration }
                }
              }
            }
          }
        }
      }
    }`;
  const data = await gql(q, { id: projectId });
  const byName = {};
  for (const f of data.node.fields.nodes) if (f && f.name) byName[f.name] = f;
  return byName;
}

// ---- Items ----
export async function getAllItems(projectId) {
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
                  number title createdAt updatedAt closed closedAt
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
  let iterationId = null, iterationTitle = null;
  for (const v of node.fieldValues.nodes) {
    const fname = v.field?.name;
    if (!fname) continue;
    if (v.__typename === 'ProjectV2ItemFieldSingleSelectValue') fv[fname] = v.name;
    else if (v.__typename === 'ProjectV2ItemFieldDateValue') fv[fname] = v.date;
    else if (v.__typename === 'ProjectV2ItemFieldNumberValue') fv[fname] = v.number;
    else if (v.__typename === 'ProjectV2ItemFieldIterationValue' && fname === CONFIG.fieldNames.iteration) {
      iterationId = v.iterationId; iterationTitle = v.title;
    }
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
    closed: !!c.closed,
    closedAt: c.closedAt ?? null,
    assignees: c.assignees?.totalCount ?? 0,
    subProgress: c.subIssuesSummary?.total ? c.subIssuesSummary.percentCompleted : null,
    status: fv[N.status] ?? null,
    priority: fv[N.priority] ?? null,
    severity: fv[N.severity] ?? null,
    storyPoints: fv[N.storyPoints] ?? null,
    targetDate: fv[N.targetDate] ?? null,
    iterationId,
    iterationTitle,
  };
}

// ---- Helpers di tipo/stato ----
export function isType(it, list) {
  const lower = list.map(s => s.toLowerCase());
  if (it.type && lower.includes(it.type.toLowerCase())) return true;
  return it.labels.some(l => lower.includes(l.toLowerCase()));
}
export function isDone(it) {
  return it.closed || CONFIG.doneStatuses.includes(it.status);
}

// ---- Iterazioni ----
export function allIterations(fields) {
  const f = fields[CONFIG.fieldNames.iteration];
  const cfg = f?.configuration;
  if (!cfg) return [];
  const map = it => {
    const start = new Date(it.startDate + 'T00:00:00Z');
    const end = new Date(start.getTime() + it.duration * 86400000);
    return { id: it.id, title: it.title, start, end };
  };
  return [...(cfg.completedIterations || []).map(map), ...(cfg.iterations || []).map(map)];
}
export function currentIteration(fields) {
  const today = startOfTodayUTC();
  for (const it of allIterations(fields)) {
    if (today >= it.start && today < it.end) {
      const elapsed = (today.getTime() - it.start.getTime()) / (it.end.getTime() - it.start.getTime());
      return { ...it, elapsedFraction: elapsed };
    }
  }
  return null;
}

// ---- Date utils ----
export function startOfTodayUTC() { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; }
export function dateOnly(s) { const d = new Date(s + 'T00:00:00Z'); d.setUTCHours(0, 0, 0, 0); return d; }
export function ageDays(iso, today = startOfTodayUTC()) { if (!iso) return 0; return Math.floor((today.getTime() - new Date(iso).getTime()) / 86400000); }
export function daysUntil(s, today = startOfTodayUTC()) { return Math.floor((dateOnly(s).getTime() - today.getTime()) / 86400000); }
export function isoDate(d) { return d.toISOString().slice(0, 10); }
