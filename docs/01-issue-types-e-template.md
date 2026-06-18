# 01 — Issue Types e Template

Come sono organizzati i tipi di issue nell'organizzazione `agic-sandbox` e come funzionano i
template (Issue Form) condivisi.

## Issue Types (tipi di work item)

Definiti a livello di **organizzazione** in *Settings → Issue Types*. Sono condivisi da tutte le repo:

| Tipo | Scopo |
|------|-------|
| **Epic** | Obiettivo di business strategico (raggruppa Feature) |
| **Feature** | Blocco di valore, si scompone in User Story |
| **User story** | Requisito dal punto di vista utente, con acceptance criteria |
| **Task** | Attivita tecnica/operativa tracciabile |
| **Bug** | Difetto con repro steps e triage |
| **Impediment** | Ostacolo che blocca il team |
| **Spike** | Indagine time-boxed per ridurre incertezza |

Il tipo si imposta sull'issue (sidebar destra, campo **Type**) oppure automaticamente scegliendo
il template corrispondente.

## Issue Template (Issue Form)

I template vivono nella repo speciale **`agic-sandbox/.github`**, in `.github/ISSUE_TEMPLATE/`.
Sono **Issue Form** in formato `.yml`: form guidati con campi obbligatori, dropdown e placeholder.

Un template per tipo:

| File | Tipo | Campi obbligatori |
|------|------|-------------------|
| `1-epic.yml` | Epic | Visione, Valore atteso |
| `2-feature.yml` | Feature | Obiettivo, Valore di business |
| `3-user-story.yml` | User story | Description, Acceptance criteria |
| `4-task.yml` | Task | Descrizione attivita |
| `5-bug.yml` | Bug | Repro steps, Current, Expected |
| `6-impediment.yml` | Impediment | Descrizione, Azioni |
| `7-spike.yml` | Spike | Obiettivo, Domande, Timebox |

Ogni form imposta automaticamente il **Type** tramite la chiave `type:` nel front-matter.

### Regola di propagazione (importante)

- I template della repo `.github` valgono come **default per TUTTE le repo dell'org**.
- ⚠️ La repo `.github` **deve essere `public`**: i default non vengono ereditati se e private/internal.
- Se una repo ha una **propria** cartella `.github/ISSUE_TEMPLATE/`, quella **sostituisce** i default.

## Campi org-level vs campi nel form

Alcuni attributi NON stanno nei form perche esistono come **Issue Field org-level** (sidebar issue):
Priority, Severity, Effort level, Detected in production, Bug categorization, Story Points, ecc.
Questo evita duplicazioni e li rende utilizzabili nei filtri/raggruppamenti dei Project.

| Dove valorizzare | Campi |
|------------------|-------|
| **Nel form** (corpo issue) | Repro steps, Acceptance criteria, descrizioni, checklist |
| **Nella sidebar** (Issue Field) | Priority, Severity, Effort level, Story Points, ... |

## Come modificare i template

1. Modifica i file `.yml` in `.github/ISSUE_TEMPLATE/` della repo `.github`.
2. Sintassi: https://docs.github.com/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms
3. Le modifiche si propagano subito a tutte le repo (sono default org-wide).
