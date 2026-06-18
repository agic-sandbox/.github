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

| Template | Tipo (Issue Type) | A cosa serve |
|---|---|---|
| `1-epic.md` | **Epic** | Elemento strategico di alto livello: obiettivo di business che raggruppa piu Feature |
| `2-feature.md` | **Feature** | Elemento strategico intermedio: blocco di valore, si scompone in User Story |
| `3-user-story.md` | **User story** | Requisito dal punto di vista dell'utente, con acceptance criteria verificabili |
| `4-task.md` | **Task** | Attivita concreta e tracciabile, tipicamente tecnica/operativa |
| `5-bug.md` | **Bug** | Difetto, con passi di riproduzione e campi per il triage |
| `6-impediment.md` | **Impediment** | Ostacolo che blocca il team, con azioni e risoluzione |
| `7-spike.md` | **Spike** | Indagine/ricerca time-boxed per ridurre incertezza |

Ogni template imposta automaticamente il campo **Type** dell'issue tramite la chiave `type:`
nel front-matter YAML.

### Gerarchia consigliata

```
Epic  →  Feature  →  User story  →  Task
                                 →  Bug (difetti)
Spike        → indagini a supporto di Story/Feature
Impediment   → ostacoli trasversali che bloccano il lavoro
```

---

## Come si usano

1. In una repo dell'organizzazione vai su **Issues → New issue**
   (oppure apri `https://github.com/agic-sandbox/<repo>/issues/new/choose`).
2. Scegli il template corrispondente al tipo di elemento che vuoi creare.
3. Compila le sezioni: i commenti `<!-- ... -->` sono suggerimenti e non vengono mostrati
   nell'issue pubblicata.

---

## Come modificare i template

- I file sono **Markdown** con front-matter YAML (`name`, `about`, `title`, `type`, `labels`).
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
