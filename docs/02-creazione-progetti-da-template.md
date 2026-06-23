# 02 — Creazione progetti da template

Come creare un nuovo GitHub Project di lavoro a partire dal template Scrum dell'organizzazione,
con viste e campi gia preconfigurati.

## Il template ufficiale

**`agic_scrum_template`** (GitHub Project dell'organizzazione, marcato come *template*).

Contiene gia, pronti all'uso:
- **7 viste**: Backlog, Sprint backlog, Sprint board, Sprint breakdown, Roadmap, Bug tracking, Impediment tracking
- **Campi**: Status (stati Scrum), Priority, Effort level, Story Points, Iteration, Severity, ecc.
- **0 item** (e pulito)

## Come funziona un "template" di Project

Quando crei un progetto dal template, GitHub fa una **copia una-tantum** del template:
viste, campi e configurazione vengono duplicati al momento della creazione.

> ⚠️ **Limite**: e una copia **congelata**. Se in futuro modifichi il template, i progetti
> gia creati **non** si aggiornano. Le viste non sono modificabili via API, quindi non esiste
> un modo per "ri-sincronizzare". Conseguenza pratica: **stabilizza il template prima** di
> creare i progetti di lavoro.

## Metodo A — Da UI (semplice)

1. Vai su *Organizzazione → Projects → New project*.
2. Nella sezione **Templates** scegli **`agic_scrum_template`**.
3. Dai un nome (convenzione: `agic-<cliente>-<progetto>`).
4. Aggancia la repo: nel progetto, *Settings → Manage access / Repositories* oppure aggiungi
   le issue con `Add items`.

## Metodo B — Da script (ripetibile, consigliato)

Lo script `new-project-from-template.ps1` (in questa cartella `docs/`) clona il template via API
e, opzionalmente, aggancia subito una repo.

```powershell
./new-project-from-template.ps1 -Title "agic-cliente-progetto" -RepoToLink "agic-sandbox/nome-repo"
```

Cosa fa:
1. `copyProjectV2` dal template → nuovo progetto con le 7 viste e i campi gia presenti
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

- I **nuovi** progetti creati dal template ereditano il campo 🚨 Alert e vengono processati in automatico.
- I progetti **gia esistenti** prima dell'aggiunta del campo richiedono un `setup` una-tantum (vedi guida 04).

## Manutenzione del template

Se vuoi evolvere lo standard (nuove viste, filtri, campi):
1. Modifica un progetto "di riferimento" gia configurato come vuoi.
2. Clonalo con `copyProjectV2`, svuotalo e marcalo come template (`markProjectV2AsTemplate`).
3. Aggiorna `TEMPLATE_PID` nello script `new-project-from-template.ps1`.

Questo evita di ricostruire le viste a mano: si riusa il lavoro gia fatto su un progetto reale.
