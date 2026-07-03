# .github — Default org templates per agic-sandbox

Questa repository **speciale** contiene i file di configurazione condivisi a livello di
organizzazione **agic-sandbox**. Tutto ciò che si trova qui viene applicato automaticamente a
**tutte le repository dell'organizzazione** che non definiscono una propria versione dello stesso file.

> ℹ️ Perché esiste: per definire **una volta sola** i template delle issue (e altri file di
> community) ed averli disponibili in ogni progetto, senza doverli ricreare in ogni repo.

---

## Struttura della repository

```
.github/
├─ ISSUE_TEMPLATE/               # 7 Issue Form completi (default org, visibili nel selettore)
├─ simplified-issue-templates/  # 7 Issue Form semplificati (da copiare nei repo "light")
└─ workflows/                   # workflow schedulati delle automazioni di processo
scripts/                        # logica delle automazioni (Node 20, zero dipendenze)
├─ project-alerts.mjs           # calcola/aggiorna il campo 🚨 Alert sugli item dei Project
├─ project-digest.mjs           # pubblica lo status update settimanale sui Project
├─ project-metrics.mjs          # esporta velocity/throughput per iteration
└─ lib/projects.mjs             # funzioni condivise (GraphQL, helper Project)
metrics/
├─ velocity.csv                 # storico velocity (progetti Scrum) generato dalle automazioni
└─ throughput.csv               # storico throughput settimanale (progetti Kanban)
docs/                           # guide operative (indice in fondo a questo README)
README.md                       # questo file
```

> Le automazioni (`scripts/` + `.github/workflows/`) sono descritte in dettaglio in
> [docs/04](docs/04-project-alerts.md) e [docs/05](docs/05-automazioni-processo.md) e richiedono il
> secret **`PROJECTS_TOKEN`** (vedi *Requisiti tecnici*).

---

## Issue templates (tipi di issue creabili)

I template si trovano in [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/) e definiscono i
**tipi di work item** selezionabili quando si crea una nuova issue in qualsiasi repo dell'org.

Sono realizzati come **Issue Forms** (`.yml`): form strutturati con campi separati, campi
**obbligatori**, dropdown e placeholder guidati. Quando l'utente compila il form, le risposte
vengono convertite in Markdown nel corpo dell'issue.

| Template | Tipo (Issue Type) | A cosa serve | Campi obbligatori |
|---|---|---|---|
| `1-epic.yml` | **Epic** | Elemento strategico di alto livello: obiettivo di business che raggruppa più Feature | Visione, Valore atteso |
| `2-feature.yml` | **Feature** | Elemento strategico intermedio: blocco di valore, si scompone in User Story | Obiettivo, Valore di business |
| `3-user-story.yml` | **User story** | Requisito dal punto di vista dell'utente, con acceptance criteria verificabili | Description, Acceptance criteria |
| `4-task.yml` | **Task** | Attività concreta e tracciabile, tipicamente tecnica/operativa | Descrizione attività |
| `5-bug.yml` | **Bug** | Difetto, con passi di riproduzione e campi per il triage | Repro steps, Current, Expected |
| `6-impediment.yml` | **Impediment** | Ostacolo che blocca il team, con azioni e risoluzione | Descrizione, Azioni |
| `7-spike.yml` | **Spike** | Indagine/ricerca time-boxed per ridurre incertezza | Obiettivo, Domande, Timebox |

Ogni template imposta automaticamente il campo **Type** dell'issue tramite la chiave `type:`
nel front-matter del form.

### Versione semplificata (per progetti "leggeri")

Nella cartella [`.github/simplified-issue-templates/`](.github/simplified-issue-templates/) (dentro
`.github` ma **fuori** da `ISSUE_TEMPLATE/`) c'è un set **semplificato** degli stessi 7 template
(solo i campi essenziali), pensato per progetti con un approccio più snello.

- La cartella è **fuori** da `ISSUE_TEMPLATE/`: GitHub non la tratta come set di template dell'org,
  quindi **non compare nel selettore** e i progetti standard vedono solo i **7 completi**.
- Per usarli in un progetto, si **copiano i file** nella cartella `.github/ISSUE_TEMPLATE/` del
  **repo di progetto** (l'override di repo sostituisce i default org).
- Istruzioni complete: vedi il [README di `simplified-issue-templates/`](.github/simplified-issue-templates/README.md).

### Gerarchia consigliata

```
Epic  →  Feature  →  User story  →  Task
                                 →  Bug (difetti)
Spike        → indagini a supporto di Story/Feature
Impediment   → ostacoli trasversali che bloccano il lavoro
```

---

## Campi org-level (sidebar issue)

Alcuni attributi **non** sono nel form perché esistono come **Issue Field a livello di
organizzazione** e si valorizzano dalla sidebar dell'issue (es. nei Bug):

- **Priority**, **Severity**, **Detected in production**, **Bug categorization**, **Effort level**,
  **Story Points**, ecc.

Questo evita duplicazioni tra form e campi strutturati (utili per filtri e viste nei Projects).

---

## Come si usano

1. In una repo dell'organizzazione vai su **Issues → New issue**
   (oppure apri `https://github.com/agic-sandbox/<repo>/issues/new/choose`).
2. Scegli il tipo di elemento: si apre il **form guidato** corrispondente.
3. Compila i campi. Quelli contrassegnati come obbligatori vanno valorizzati per poter creare l'issue.

---

## Come modificare i template

- I file sono **Issue Forms** in formato **YAML** (`.yml`): chiavi top-level `name`, `description`,
  `title`, `type`, `labels`, e la lista `body` con i campi (`input`, `textarea`, `dropdown`,
  `checkboxes`, `markdown`).
- Sintassi ufficiale: https://docs.github.com/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms
- Modifica i file in `.github/ISSUE_TEMPLATE/` di **questa** repository: le modifiche si
  propagano a tutte le repo dell'org.
- **Set semplificato**: i template light stanno in `.github/simplified-issue-templates/`; se li
  modifichi, valuta se allineare i corrispondenti completi (i due set sono indipendenti). Vedi il
  [README di `simplified-issue-templates/`](.github/simplified-issue-templates/README.md).
- **Override locale**: se una repo ha una propria cartella `.github/ISSUE_TEMPLATE/`, i suoi
  template **sostituiscono** completamente questi default per quella repo.
- **Blank issue**: in questa repo non c'è un `config.yml` in `ISSUE_TEMPLATE/`, quindi vale il
  comportamento di default (è possibile aprire anche issue "vuote" oltre ai form). Per disattivarle
  o aggiungere contact link si crea `.github/ISSUE_TEMPLATE/config.yml`.

---

## Requisiti tecnici (importante)

- Questa repository **deve essere `public`**: i default community health file (inclusi gli
  issue template) vengono ereditati dalle altre repo **solo** se la `.github` è pubblica.
  Le repo di progetto restano invece private/internal: qui non va inserito nulla di sensibile.
- I **tipi di issue** (Epic, Feature, ecc.) sono definiti a livello di organizzazione in
  *Settings → Issue Types*; i template qui presenti li **pre-selezionano** ma non li creano.
- Le **automazioni** (`scripts/` + `.github/workflows/`) richiedono il secret **`PROJECTS_TOKEN`**
  a livello di repo: un PAT con scope `project` + `read:org` usato per leggere/scrivere i Project
  dell'org via API. Senza questo secret i workflow schedulati falliscono.

---

## Automazioni e integrazione con i GitHub Projects

I tipi e i template sono indipendenti dalle board. Per la gestione del lavoro si usano i **Project
template** dell'organizzazione (Scrum o Kanban), applicati alle singole repo. Vedi
[docs/02](docs/02-creazione-progetti-da-template.md).

In questa repository vivono anche le **automazioni di processo**, come script Node in `scripts/`
eseguiti dai workflow schedulati in `.github/workflows/`:

| Script | Workflow | Cosa fa |
|--------|----------|---------|
| `project-alerts.mjs` | `project-alerts.yml` | Aggiorna il campo `🚨 Alert` sugli item dei Project in base a un set di regole adattato al metodo (Scrum/Kanban): item scaduti, bug critici, impediment, bloccati, ecc. |
| `project-digest.mjs` | `project-digest.yml` | Pubblica un **digest settimanale** come *status update* del Project |
| `project-metrics.mjs` | `project-metrics.yml` | Esporta **velocity** (Scrum) o **throughput** settimanale (Kanban) per progetto nel README e in `metrics/velocity.csv` / `metrics/throughput.csv` |

La logica condivisa (client GraphQL, helper sui Project) sta in `scripts/lib/projects.mjs`. Tutte le
automazioni usano il secret **`PROJECTS_TOKEN`** (vedi *Requisiti tecnici*).

Dettagli operativi: [docs/04 — Project Alerts](docs/04-project-alerts.md) e
[docs/05 — Automazioni di processo](docs/05-automazioni-processo.md).

---

## Documentazione dei processi

Guide operative su progetti, template e issue: vedi [docs/](docs/README.md).

- [Issue Types e Template](docs/01-issue-types-e-template.md)
- [Creazione progetti da template](docs/02-creazione-progetti-da-template.md)
- [Viste, filtri e Scrum](docs/03-viste-filtri-scrum.md)
- [Project Alerts (automazione)](docs/04-project-alerts.md)
- [Automazioni di processo (digest, metriche)](docs/05-automazioni-processo.md)
