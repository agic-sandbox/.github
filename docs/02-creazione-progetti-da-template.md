# 02 — Creazione progetti da template

Come creare un nuovo GitHub Project di lavoro a partire da un template dell'organizzazione,
con viste e campi gia preconfigurati.

## I template disponibili

L'organizzazione espone due Project marcati come *template*, a seconda del metodo di gestione:

| Template | Metodo | Contenuto |
|----------|--------|-----------|
| **`agic_scrum_template`** (#14) | Scrum | 8 viste (Backlog, Sprint backlog/board/breakdown, Roadmap, Bug tracking, Impediment tracking, Alert attivi); campi Status (stati Scrum), Priority, Effort level, **Story Points**, **Iteration**, Severity, Start/Target date, 🚨 Alert |
| **`agic_kanban_template`** (#21) | Kanban | viste di flusso (Board per Status con WIP, Backlog, Bug tracking, Alert attivi); campi Status (Backlog/Ready/In Progress/In Review/Done/Blocked), Priority, Effort level, Severity, Start/Target date, 🚨 Alert — **senza** Story Points e Iteration |

Entrambi partono con **0 item** (sono puliti). Scegli quello adatto al metodo del progetto.

## Come funziona un "template" di Project

Quando crei un progetto dal template, GitHub fa una **copia una-tantum** del template:
viste, campi e configurazione vengono duplicati al momento della creazione.

> ⚠️ **Limite**: e una copia **congelata**. Se in futuro modifichi il template, i progetti
> gia creati **non** si aggiornano. Le viste non sono modificabili via API, quindi non esiste
> un modo per "ri-sincronizzare". Conseguenza pratica: **stabilizza il template prima** di
> creare i progetti di lavoro.

## Metodo A — Da UI (semplice)

1. Vai su *Organizzazione → Projects → New project*.
2. Nella sezione **Templates** scegli **`agic_scrum_template`** o **`agic_kanban_template`**
   in base al metodo del progetto.
3. Dai un nome (convenzione: `agic-<cliente>-<progetto>`).
4. Aggancia la repo: nel progetto, *Settings → Manage access / Repositories* oppure aggiungi
   le issue con `Add items`.

## Metodo B — Da script (ripetibile, consigliato)

Lo script `new-project-from-template.ps1` (in questa cartella `docs/`) clona un template via API
e, opzionalmente, aggancia subito una repo. Con `-Method` scegli quale template usare.

```powershell
# Scrum (default)
./new-project-from-template.ps1 -Title "agic-cliente-progetto" -RepoToLink "agic-sandbox/nome-repo"
# Kanban
./new-project-from-template.ps1 -Title "agic-cliente-progetto" -Method kanban -RepoToLink "agic-sandbox/nome-repo"
```

Cosa fa:
1. `copyProjectV2` dal template scelto → nuovo progetto con viste e campi gia presenti
2. (opz.) `linkProjectV2ToRepository` → aggancia la repo indicata

Prerequisiti: `gh` autenticato con PAT (scope `project`, `read:org`, `repo`).

## Aggiornare progetti gia esistenti

| Cosa vuoi propagare | Possibile dopo la creazione? |
|---------------------|------------------------------|
| Nuovo **campo** o opzione di Status | ✅ Si, via API (script) |
| Modifica a **viste/filtri/chart** | ❌ No (solo a mano dalla UI) |

Per i campi e possibile uno script di allineamento additivo; per le viste, replica manuale.

## Automazioni di processo sui progetti

Sui progetti sono attive automazioni centralizzate (girano nel repo `.github`): **alert** sugli item,
**digest** settimanale e **metriche di velocity**. Dettagli nelle guide [04](04-project-alerts.md) e
[05](05-automazioni-processo.md).

- I **nuovi** progetti creati da un template ereditano il campo 🚨 Alert e vengono processati in automatico.
  Le automazioni si **adattano al metodo** del progetto (Scrum: velocity/sprint · Kanban: throughput/flusso).
- I progetti **gia esistenti** prima dell'aggiunta del campo richiedono un `setup` una-tantum (vedi guida 04).

## Manutenzione del template

Se vuoi evolvere lo standard (nuove viste, filtri, campi):
1. Modifica un progetto "di riferimento" gia configurato come vuoi.
2. Clonalo con `copyProjectV2`, svuotalo e marcalo come template (`markProjectV2AsTemplate`).
3. Aggiorna il PID corrispondente in `$TEMPLATE_PIDS` nello script `new-project-from-template.ps1`.

Questo evita di ricostruire le viste a mano: si riusa il lavoro gia fatto su un progetto reale.
