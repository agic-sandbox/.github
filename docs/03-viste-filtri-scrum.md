# 03 — Viste, filtri e Scrum

Come sono configurate le viste del template Scrum e come gestire sprint, gerarchia e filtri.

## Le 7 viste standard

| Vista | Layout | Filtro | Note |
|-------|--------|--------|------|
| **Backlog** | Table | `type:"Epic","Impediment",Bug,Spike` | Elementi di prodotto |
| **Sprint backlog** | Table | `iteration:@current type:"User story","Task","Bug",Impediment` | Lavoro dello sprint |
| **Sprint board** | Board | `iteration:@current type:"User story","Task","Bug","Impediment"` | Column field = Status |
| **Sprint breakdown** | Table | `type:"User story","Task","Bug",Impediment` | Group by Iteration |
| **Roadmap** | Roadmap | `type:Epic,Feature` | Group by Parent issue |
| **Bug tracking** | Table | `type:Bug` | Colonne Priority, Severity |
| **Impediment tracking** | Table | `type:Impediment` | — |

## Filtrare per sprint corrente

Il campo **Iteration** (tipo nativo) abilita il filtro dinamico:

| Filtro | Mostra |
|--------|--------|
| `iteration:@current` | sprint in corso (si aggiorna da solo) |
| `iteration:@previous` / `@next` | sprint precedente / successivo |
| `no:iteration` | item senza sprint |
| `-iteration:@current` | tutto tranne lo sprint corrente |

> Per usarlo serve un campo di tipo **Iteration** (non un single-select). Va creato e popolato
> con le iterazioni (durata sprint); GitHub calcola da solo quella "corrente".

## Filtrare per tipo

GitHub **non** permette di vincolare un campo a certi tipi di issue (a differenza di ADO). Per
ottenere lo stesso effetto, si filtrano le **viste** per tipo:

```
type:"User story","Task","Bug"
```

Cosi l'Iteration "conta" solo dove serve, anche se tecnicamente ogni issue puo averla.
Le virgolette servono per i tipi con spazio (es. `"User story"`).

## Gerarchia Epic → Feature → User story → Task

La gerarchia si basa sulle **sub-issues** (relazione parent/child), non sui filtri.

- I filtri sono **piatti**: `type:Epic` mostra solo le Epic, non i figli.
- Per vedere l'albero annidato: vista **Table** → **Group by → Parent issue** (o l'annidamento
  sub-issues). E l'equivalente del backlog gerarchico di Azure DevOps.
- ⚠️ Un filtro **non** "risale" ai genitori: filtrando per sprint potresti vedere una Story senza
  la sua Epic se l'Epic non e nello stesso sprint.

| Obiettivo | Come |
|-----------|------|
| Vedere Epic→Feature→Story annidate | Group by Parent issue (NON filtri) |
| Vedere solo un ramo | Group by Parent + scorri all'Epic |
| Filtro che include i parent | ❌ Non esiste |

## Stati (campo Status)

Il campo **Status** del Project porta il superset di stati Scrum:
New → Plannable → In analysis → Ready to work → Approved → To Do → In Progress →
Ready for qa → Validated by QA → Done → Removed.

> Differenza da ADO: lo Status e **unico e condiviso** tra tutti i tipi (non esistono stati
> per-tipo) e non c'e enforcement delle transizioni. Le viste filtrano per tipo, ma lo Status
> resta lo stesso set per tutti.

## Limiti rispetto ad Azure DevOps

| | Azure DevOps | GitHub Projects |
|---|---|---|
| Stati per work item type | Si | No (Status unico) |
| Campi vincolati al tipo | Si | No |
| Backlog gerarchico | Si | Si (sub-issues + Group by Parent) |
| Filtro che risale ai parent | Si | No |
| Burndown con linea ideale | Si | No (chart base) |
| Viste configurabili via API | n/a | No (solo UI) |
