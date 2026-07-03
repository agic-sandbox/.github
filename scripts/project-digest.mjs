#!/usr/bin/env node
// @ts-nocheck
/*
 * project-digest.mjs
 * Pubblica una "Project status update" settimanale su ogni progetto dell'org,
 * adattandosi al metodo:
 *   - SCRUM: riepilogo sprint (item/SP completati, %) + mini-velocity;
 *   - KANBAN: riepilogo di flusso (WIP, bloccati, throughput settimanale).
 * Stesso approccio centralizzato degli alert (gira nel repo .github).
 *
 *   node project-digest.mjs [--dry-run]
 *
 * Lo stato (ON_TRACK / AT_RISK / OFF_TRACK) viene derivato dagli indicatori.
 */
import {
  CONFIG, listProjects, getFields, getAllItems, isType, isDone,
  currentIteration, startOfTodayUTC, daysUntil, isoDate,
  velocityByIteration, projectMethod, throughputByWeek, bar, gql, fail,
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

function buildBody(ind, velocityRows) {
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
  // Mini-velocity (ultimi sprint) — anche nel README, qui per visibilita nello status update
  const recent = (velocityRows || []).slice(-3);
  if (recent.length) {
    lines.push('📈 **Velocity (ultimi sprint)**');
    lines.push('');
    lines.push('| Sprint | Avanz. | SP |');
    lines.push('|---|---|---|');
    for (const r of recent) lines.push(`| ${r.title} | \`${bar(r.pct, 10)}\` ${r.pct}% | ${r.completedSp}/${r.committedSp} |`);
    lines.push('');
  }
  lines.push('_Generato automaticamente — vedi guide [Alert](https://github.com/agic-sandbox/.github/blob/main/docs/04-project-alerts.md) · [Processo](https://github.com/agic-sandbox/.github/blob/main/docs/05-automazioni-processo.md)._');
  return lines.join('\n');
}

// ---- Kanban (flusso continuo) ----
function computeKanbanIndicators(items, throughputRows) {
  const today = startOfTodayUTC();
  let overdue = 0, dueSoon = 0, impediments = 0, wip = 0, blocked = 0;
  for (const it of items) {
    const done = isDone(it);
    if (!done && it.targetDate) {
      const d = daysUntil(it.targetDate, today);
      if (d < 0) overdue++;
      else if (d <= CONFIG.dueSoonDays) dueSoon++;
    }
    if (!done && isType(it, CONFIG.impedimentTypes)) impediments++;
    if (CONFIG.blockedStatuses.includes(it.status)) blocked++;
    else if (CONFIG.inProgressStatuses.includes(it.status)) wip++;
  }
  const lastFullWeek = throughputRows.length >= 2 ? throughputRows[throughputRows.length - 2].completed : 0;
  return { overdue, dueSoon, impediments, wip, blocked, lastFullWeek };
}

function deriveKanbanStatus(ind) {
  if (ind.overdue > 0) return 'OFF_TRACK';
  if (ind.blocked > 0 || ind.impediments > 0 || ind.dueSoon > 0) return 'AT_RISK';
  return 'ON_TRACK';
}

function buildKanbanBody(ind, throughputRows) {
  const lines = [];
  lines.push(`**Digest settimanale di processo (Kanban)** · ${isoDate(startOfTodayUTC())}`);
  lines.push('');
  lines.push('🚦 **Flusso continuo** (nessuno sprint)');
  lines.push('');
  lines.push(`- 🏃 WIP (in lavorazione): **${ind.wip}**`);
  lines.push(`- 🔴 Bloccati: **${ind.blocked}**`);
  lines.push(`- 🔴 Scaduti: **${ind.overdue}**`);
  lines.push(`- 🟠 In scadenza (≤ ${CONFIG.dueSoonDays}g): **${ind.dueSoon}**`);
  lines.push(`- 🚧 Impediment aperti: **${ind.impediments}**`);
  lines.push(`- ✅ Completati settimana scorsa: **${ind.lastFullWeek}**`);
  lines.push('');
  if (ind.overdue > 0) lines.push('> ⚠️ Presenza di item scaduti: stato **Off track**.');
  else if (ind.blocked > 0 || ind.impediments > 0 || ind.dueSoon > 0) lines.push('> ⚠️ Item bloccati, impediment o scadenze imminenti: stato **At risk**.');
  else lines.push('> ✅ Nessuna criticità rilevata: stato **On track**.');
  lines.push('');
  const recent = (throughputRows || []).slice(-4);
  if (recent.length) {
    const max = Math.max(1, ...recent.map(r => r.completed));
    lines.push('📈 **Throughput (ultime settimane)**');
    lines.push('');
    lines.push('| Settimana (dal) | Completati |');
    lines.push('|---|---|');
    for (const r of recent) lines.push(`| ${r.label} | \`${bar(max > 0 ? (r.completed / max) * 100 : 0, 10)}\` ${r.completed} |`);
    lines.push('');
  }
  lines.push('_Generato automaticamente — vedi guide [Alert](https://github.com/agic-sandbox/.github/blob/main/docs/04-project-alerts.md) · [Processo](https://github.com/agic-sandbox/.github/blob/main/docs/05-automazioni-processo.md)._');
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
  console.log(`Trovati ${projects.length} project aperti. Genero il digest (Scrum/Kanban) sui progetti con item...\n`);
  let posted = 0, skipped = 0, errored = 0;

  for (const p of projects) {
    if (p.itemCount === 0) { skipped++; continue; }
    try {
      const fields = await getFields(p.id);
      if (!fields[CONFIG.fieldNames.status]) { skipped++; continue; } // non gestito a board
      const items = await getAllItems(p.id);
      const method = projectMethod(fields);

      let status, body, sd, td, logExtra;
      if (method === 'scrum') {
        const ind = computeIndicators(items, fields);
        const velocityRows = velocityByIteration(items, fields);
        status = deriveStatus(ind);
        body = buildBody(ind, velocityRows);
        sd = ind.cur ? isoDate(ind.cur.start) : isoDate(startOfTodayUTC());
        td = ind.cur ? isoDate(new Date(ind.cur.end.getTime() - 86400000)) : null;
        logExtra = `scaduti:${ind.overdue}, impediment:${ind.impediments}, sprint:${ind.completionPct ?? 'n/d'}%`;
      } else {
        const throughputRows = throughputByWeek(items, 6);
        const ind = computeKanbanIndicators(items, throughputRows);
        status = deriveKanbanStatus(ind);
        body = buildKanbanBody(ind, throughputRows);
        sd = isoDate(startOfTodayUTC());
        td = null;
        logExtra = `scaduti:${ind.overdue}, wip:${ind.wip}, bloccati:${ind.blocked}`;
      }

      console.log(`#${p.number} ${p.title} [${method}] -> ${status} (${logExtra})`);
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
