# .github — Default org templates per agic-sandbox

Questa repository **speciale** contiene i file di configurazione condivisi a livello di
organizzazione **agic-sandbox**. Tutto cio che si trova qui viene applicato automaticamente a
**tutte le repository dell'organizzazione** che non definiscono una propria versione dello stesso file.

> ℹ️ Perche esiste: per definire **una volta sola** i template delle issue (e altri file di
> community) ed averli disponibili in ogni progetto, senza doverli ricreare in ogni repo.

---

## Issue templates (tipi di issue creabili)

I template si trovano in [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/) e definiscono i
**tipi di work item** selezionabili quando si crea una nuova issue in qualsiasi repo dell'org.

Sono realizzati come **Issue Forms** (`.yml`): form strutturati con campi separati, campi
**obbligatori**, dropdown e placeholder guidati. Quando l'utente compila il form, le risposte
vengono convertite in Markdown nel corpo dell'issue.

| Template | Tipo (Issue Type) | A cosa serve | Campi obbligatori |
|---|---|---|---|
| `1-epic.yml` | **Epic** | Elemento strategico di alto livello: obiettivo di business che raggruppa piu Feature | Visione, Valore atteso |
| `2-feature.yml` | **Feature** | Elemento strategico intermedio: blocco di valore, si scompone in User Story | Obiettivo, Valore di business |
| `3-user-story.yml` | **User story** | Requisito dal punto di vista dell'utente, con acceptance criteria verificabili | Description, Acceptance criteria |
| `4-task.yml` | **Task** | Attivita concreta e tracciabile, tipicamente tecnica/operativa | Descrizione attivita |
| `5-bug.yml` | **Bug** | Difetto, con passi di riproduzione e campi per il triage | Repro steps, Current, Expected |
| `6-impediment.yml` | **Impediment** | Ostacolo che blocca il team, con azioni e risoluzione | Descrizione, Azioni |
| `7-spike.yml` | **Spike** | Indagine/ricerca time-boxed per ridurre incertezza | Obiettivo, Domande, Timebox |

Ogni template imposta automaticamente il campo **Type** dell'issue tramite la chiave `type:`
nel front-matter del form.

### Gerarchia consigliata

```
Epic  →  Feature  →  User story  →  Task
                                 →  Bug (difetti)
Spike        → indagini a supporto di Story/Feature
Impediment   → ostacoli trasversali che bloccano il lavoro
```

---

## Campi org-level (sidebar issue)

Alcuni attributi **non** sono nel form perche esistono come **Issue Field a livello di
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
- **Override locale**: se una repo ha una propria cartella `.github/ISSUE_TEMPLATE/`, i suoi
  template **sostituiscono** completamente questi default per quella repo.

---

## Requisiti tecnici (importante)

- Questa repository **deve essere `public`**: i default community health file (inclusi gli
  issue template) vengono ereditati dalle altre repo **solo** se la `.github` e pubblica.
  Le repo di progetto restano invece private/internal: qui non va inserito nulla di sensibile.
- I **tipi di issue** (Epic, Feature, ecc.) sono definiti a livello di organizzazione in
  *Settings → Issue Types*; i template qui presenti li **pre-selezionano** ma non li creano.

---

## Integrazione con i GitHub Projects

I tipi e i template sono indipendenti dalle board. Per la gestione Scrum (sprint, backlog,
stati, story points) si usa il Project template dell'organizzazione, applicato alle singole repo.

Un'automazione (**Project Alerts**) aggiorna inoltre un campo `🚨 Alert` sugli item dei Project
in base a 8 regole (item scaduti, bug critici, impediment, ecc.): vedi [docs/04](docs/04-project-alerts.md).

---

## Documentazione dei processi

Guide operative su progetti, template e issue: vedi [docs/](docs/README.md).

- [Issue Types e Template](docs/01-issue-types-e-template.md)
- [Creazione progetti da template](docs/02-creazione-progetti-da-template.md)
- [Viste, filtri e Scrum](docs/03-viste-filtri-scrum.md)
- [Project Alerts (automazione)](docs/04-project-alerts.md)
- [Automazioni di processo (digest, metriche)](docs/05-automazioni-processo.md)
