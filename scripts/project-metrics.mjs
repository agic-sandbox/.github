#!/usr/bin/env node
// @ts-nocheck
/*
 * project-metrics.mjs
 * Esporta metriche Scrum per iteration (velocity, throughput, completamento)
 * di tutti i progetti dell'org in un CSV. Stesso approccio centralizzato.
 *
 *   node project-metrics.mjs [--dry-run]
 *
 * Output: file CSV in METRICS_FILE (default "metrics/velocity.csv").
 * Il file viene rigenerato a ogni run (le iteration concluse sono stabili).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  CONFIG, listProjects, getFields, getAllItems, isDone,
  allIterations, isoDate, startOfTodayUTC, fail,
} from './lib/projects.mjs';

const dryRun = process.argv.includes('--dry-run');
const OUT = process.env.METRICS_FILE || 'metrics/velocity.csv';

const HEADERS = [
  'snapshot_date', 'project_number', 'project_title', 'iteration_title',
  'iteration_start', 'iteration_end', 'committed_sp', 'completed_sp',
  'committed_items', 'completed_items', 'completion_pct',
];

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function computeRows(project, items, fields, snapshot) {
  const iterMap = new Map();
  for (const it of allIterations(fields)) iterMap.set(it.id, it);

  // raggruppa item per iteration
  const byIter = new Map();
  for (const it of items) {
    if (!it.iterationId) continue;
    if (!byIter.has(it.iterationId)) byIter.set(it.iterationId, []);
    byIter.get(it.iterationId).push(it);
  }

  const rows = [];
  for (const [iterId, group] of byIter) {
    const meta = iterMap.get(iterId);
    if (!meta) continue; // iteration non piu in config
    let committedSp = 0, completedSp = 0, committed = 0, completed = 0;
    for (const it of group) {
      committed++;
      const sp = typeof it.storyPoints === 'number' ? it.storyPoints : 0;
      committedSp += sp;
      if (isDone(it)) { completed++; completedSp += sp; }
    }
    const pct = committedSp > 0 ? Math.round((completedSp / committedSp) * 100)
      : (committed > 0 ? Math.round((completed / committed) * 100) : 0);
    rows.push([
      snapshot, project.number, project.title, meta.title,
      isoDate(meta.start), isoDate(new Date(meta.end.getTime() - 86400000)),
      committedSp, completedSp, committed, completed, pct,
    ]);
  }
  // ordina per data iteration
  rows.sort((a, b) => String(a[4]).localeCompare(String(b[4])));
  return rows;
}

(async () => {
  const snapshot = isoDate(startOfTodayUTC());
  const projects = await listProjects();
  console.log(`Trovati ${projects.length} project aperti. Calcolo metriche per iteration...\n`);

  const allRows = [];
  let processed = 0, skipped = 0;
  for (const p of projects) {
    if (p.itemCount === 0) { skipped++; continue; }
    const fields = await getFields(p.id);
    if (!fields[CONFIG.fieldNames.iteration] || !fields[CONFIG.fieldNames.status]) { skipped++; continue; }
    const items = await getAllItems(p.id);
    const rows = computeRows(p, items, fields, snapshot);
    if (rows.length === 0) { skipped++; continue; }
    allRows.push(...rows);
    processed++;
    for (const r of rows) {
      console.log(`#${p.number} ${r[3]}: ${r[7]}/${r[6]} SP completati (${r[10]}%), ${r[9]}/${r[8]} item`);
    }
  }

  const csv = [HEADERS, ...allRows].map(r => r.map(csvCell).join(',')).join('\n') + '\n';
  if (dryRun) {
    console.log(`\n[DRY-RUN] ${allRows.length} righe (${processed} progetti). Nessun file scritto. Anteprima CSV:\n`);
    console.log(csv.split('\n').slice(0, 8).join('\n'));
  } else {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, csv, 'utf8');
    console.log(`\nScritto ${OUT} con ${allRows.length} righe (${processed} progetti, ${skipped} saltati).`);
  }
})().catch(e => fail(e.message || e));
