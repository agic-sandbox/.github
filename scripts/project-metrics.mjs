#!/usr/bin/env node
// @ts-nocheck
/*
 * project-metrics.mjs
 * Calcola le metriche Scrum per iteration (velocity, throughput, completamento) e:
 *   1) le pubblica in modo VISIVO nel README di ogni progetto (sezione "📈 Velocity sprint"),
 *      con barre proporzionali + tabella;
 *   2) le esporta SEMPRE anche come CSV grezzo (METRICS_FILE, default metrics/velocity.csv),
 *      committato nel repo e linkato dal README.
 * Stesso approccio centralizzato.
 *
 *   node project-metrics.mjs [--dry-run]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  CONFIG, listProjects, getFields, getAllItems, velocityByIteration,
  isoDate, startOfTodayUTC, upsertReadmeBlock, bar, fail,
} from './lib/projects.mjs';

const dryRun = process.argv.includes('--dry-run');
const CSV_FILE = process.env.METRICS_FILE || 'metrics/velocity.csv';
const CSV_LINK = 'https://github.com/agic-sandbox/.github/blob/main/metrics/velocity.csv';
const SPRINTS_SHOWN = 6; // ultime N iteration mostrate nel README

const HEADERS = [
  'snapshot_date', 'project_number', 'project_title', 'iteration_title',
  'iteration_start', 'iteration_end', 'committed_sp', 'completed_sp',
  'committed_items', 'completed_items', 'completion_pct',
];

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildReadmeBlock(rows) {
  const recent = rows.slice(-SPRINTS_SHOWN);
  const completed = recent.filter(r => r.completedSp > 0);
  const avgVelocity = completed.length ? Math.round(completed.reduce((s, r) => s + r.completedSp, 0) / completed.length) : 0;

  const lines = [];
  lines.push('## 📈 Velocity');
  lines.push(`_Velocity media (SP): **${avgVelocity}** · agg. ${isoDate(startOfTodayUTC())} · [grafici Insights](https://github.com/agic-sandbox/.github/blob/main/docs/05-automazioni-processo.md) · [CSV](${CSV_LINK})_`);
  lines.push('');
  lines.push('| Sprint | Avanzamento | SP | Item |');
  lines.push('|---|---|---|---|');
  for (const r of recent) {
    lines.push(`| ${r.title} | \`${bar(r.pct, 12)}\` ${r.pct}% | ${r.completedSp}/${r.committedSp} | ${r.completed}/${r.committed} |`);
  }
  return lines.join('\n');
}

(async () => {
  const snapshot = isoDate(startOfTodayUTC());
  const projects = await listProjects();
  console.log(`Trovati ${projects.length} project. Calcolo velocity, aggiorno README ed esporto CSV...\n`);

  const csvRows = [];
  let updated = 0, skipped = 0;
  for (const p of projects) {
    if (p.itemCount === 0) { skipped++; continue; }
    const fields = await getFields(p.id);
    if (!fields[CONFIG.fieldNames.iteration] || !fields[CONFIG.fieldNames.status]) { skipped++; continue; }
    const items = await getAllItems(p.id);
    const rows = velocityByIteration(items, fields);
    if (rows.length === 0) { skipped++; continue; }

    for (const r of rows) {
      console.log(`#${p.number} ${r.title}: ${r.completedSp}/${r.committedSp} SP (${r.pct}%), ${r.completed}/${r.committed} item`);
      csvRows.push([snapshot, p.number, p.title, r.title, isoDate(r.start), isoDate(new Date(r.end.getTime() - 86400000)), r.committedSp, r.completedSp, r.committed, r.completed, r.pct]);
    }

    if (!dryRun) {
      // velocity inserita PRIMA del blocco impostazioni, cosi l'ordine e: progetto -> velocity -> impostazioni
      const changed = await upsertReadmeBlock(p.id, 'velocity', buildReadmeBlock(rows), { beforeKey: 'project-alerts' });
      console.log(`  README #${p.number}: ${changed ? 'aggiornato' : 'invariato'}`);
    }
    updated++;
  }

  const csv = [HEADERS, ...csvRows].map(r => r.map(csvCell).join(',')).join('\n') + '\n';
  if (dryRun) {
    console.log(`\n[DRY-RUN] ${csvRows.length} righe (${updated} progetti). Nessuna scrittura. Anteprima CSV:\n`);
    console.log(csv.split('\n').slice(0, 8).join('\n'));
  } else {
    mkdirSync(dirname(CSV_FILE), { recursive: true });
    writeFileSync(CSV_FILE, csv, 'utf8');
    console.log(`\nScritto ${CSV_FILE} con ${csvRows.length} righe. ${updated} README aggiornati, ${skipped} progetti saltati.`);
  }
})().catch(e => fail(e.message || e));

