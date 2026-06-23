#!/usr/bin/env node
// @ts-nocheck
/*
 * project-digest.mjs
 * Pubblica una "Project status update" settimanale su ogni progetto Scrum
 * dell'org, con un riepilogo di processo (sprint, scaduti, impediment, ecc.).
 * Stesso approccio centralizzato degli alert (gira nel repo .github).
 *
 *   node project-digest.mjs [--dry-run]
 *
 * Lo stato (ON_TRACK / AT_RISK / OFF_TRACK) viene derivato dagli indicatori.
 */
import {
  CONFIG, listProjects, getFields, getAllItems, isType, isDone,
  currentIteration, startOfTodayUTC, dateOnly, daysUntil, isoDate, gql, fail,
} from './lib/projects.mjs';

const dryRun = process.argv.includes('--dry-run');

function computeIndicators(items, fields) {
  const today = startOfTodayUTC();
  const cur = currentIteration(fields);

  let overdue = 0, dueSoon = 0, impediments = 0, inProgress = 0;
  let spCommitted = 0, spCompleted = 0, sprintTotal = 0, sprintDone = 0;

  for (const it of items) {
    const done = isDone(it);
    if (!done && it.targetDate) {
      const d = daysUntil(it.targetDate, today);
      if (d < 0) overdue++;
      else if (d <= CONFIG.dueSoonDays) dueSoon++;
    }
    if (!done && isType(it, CONFIG.impedimentTypes)) impediments++;
    if (CONFIG.inProgressStatuses.includes(it.status)) inProgress++;

    if (cur && it.iterationId === cur.id) {
      sprintTotal++;
      const sp = typeof it.storyPoints === 'number' ? it.storyPoints : 0;
      spCommitted += sp;
      if (done) { sprintDone++; spCompleted += sp; }
    }
  }
  const completionPct = spCommitted > 0 ? Math.round((spCompleted / spCommitted) * 100)
    : (sprintTotal > 0 ? Math.round((sprintDone / sprintTotal) * 100) : null);

  return { cur, overdue, dueSoon, impediments, inProgress, spCommitted, spCompleted, sprintTotal, sprintDone, completionPct };
}

function deriveStatus(ind) {
  if (ind.overdue > 0) return 'OFF_TRACK';
  if (ind.impediments > 0 || ind.dueSoon > 0) return 'AT_RISK';
  return 'ON_TRACK';
}

function buildBody(ind) {
  const lines = [];
  lines.push(`**Digest settimanale di processo** · ${isoDate(startOfTodayUTC())}`);
  lines.push('');
  if (ind.cur) {
    const pct = ind.completionPct == null ? 'n/d' : `${ind.completionPct}%`;
    lines.push(`🚦 **Sprint corrente:** ${ind.cur.title} — ${ind.sprintDone}/${ind.sprintTotal} item, ${ind.spCompleted}/${ind.spCommitted} SP (${pct})`);
  } else {
    lines.push('🚦 **Sprint corrente:** nessuna iteration attiva');
  }
  lines.push('');
  lines.push(`- 🔴 Scaduti: **${ind.overdue}**`);
  lines.push(`- 🟠 In scadenza (≤ ${CONFIG.dueSoonDays}g): **${ind.dueSoon}**`);
  lines.push(`- 🚧 Impediment aperti: **${ind.impediments}**`);
  lines.push(`- 🏃 In corso: **${ind.inProgress}**`);
  lines.push('');
  if (ind.overdue > 0) lines.push('> ⚠️ Presenza di item scaduti: stato **Off track**.');
  else if (ind.impediments > 0 || ind.dueSoon > 0) lines.push('> ⚠️ Impediment o scadenze imminenti: stato **At risk**.');
  else lines.push('> ✅ Nessuna criticità rilevata: stato **On track**.');
  lines.push('');
  lines.push('_Generato automaticamente — vedi guida [Project Alerts](https://github.com/agic-sandbox/.github/blob/main/docs/04-project-alerts.md)._');
  return lines.join('\n');
}

async function postStatusUpdate(projectId, status, body, startDate, targetDate) {
  const m = `
    mutation($p: ID!, $s: ProjectV2StatusUpdateStatus!, $b: String!, $sd: Date, $td: Date) {
      createProjectV2StatusUpdate(input: { projectId: $p, status: $s, body: $b, startDate: $sd, targetDate: $td }) {
        statusUpdate { id }
      }
    }`;
  await gql(m, { p: projectId, s: status, b: body, sd: startDate, td: targetDate });
}

(async () => {
  const projects = await listProjects();
  console.log(`Trovati ${projects.length} project aperti. Genero il digest sui progetti Scrum con item...\n`);
  let posted = 0, skipped = 0, errored = 0;

  for (const p of projects) {
    if (p.itemCount === 0) { skipped++; continue; }
    try {
      const fields = await getFields(p.id);
      if (!fields[CONFIG.fieldNames.status]) { skipped++; continue; } // non Scrum
      const items = await getAllItems(p.id);
      const ind = computeIndicators(items, fields);
      const status = deriveStatus(ind);
      const body = buildBody(ind);
      const sd = ind.cur ? isoDate(ind.cur.start) : isoDate(startOfTodayUTC());
      const td = ind.cur ? isoDate(new Date(ind.cur.end.getTime() - 86400000)) : null;

      console.log(`#${p.number} ${p.title} -> ${status} (scaduti:${ind.overdue}, impediment:${ind.impediments}, sprint:${ind.completionPct ?? 'n/d'}%)`);
      if (!dryRun) await postStatusUpdate(p.id, status, body, sd, td);
      posted++;
    } catch (e) {
      console.error(`#${p.number} ${p.title} -> ERRORE: ${e.message || e}`);
      errored++;
    }
  }
  console.log(`\nTotale: ${posted} digest pubblicati, ${skipped} saltati, ${errored} in errore.${dryRun ? ' [DRY-RUN]' : ''}`);
  if (errored > 0) process.exitCode = 1;
})().catch(e => fail(e.message || e));
