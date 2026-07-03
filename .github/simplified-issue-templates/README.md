# Simplified issue templates

Questa cartella contiene una versione **semplificata** dei 7 issue template dell'organizzazione,
pensata per progetti con un approccio **più leggero** (meno campi, solo l'essenziale).

> ⚠️ **Importante:** questa cartella sta dentro `.github` ma **fuori** da `ISSUE_TEMPLATE/`,
> quindi GitHub **non** la tratta come set di template dell'organizzazione: questi file **non
> compaiono** nel selettore delle issue e non interferiscono con l'anteprima dei template completi.
> Restano **inerti** finché non vengono copiati nella root `.github/ISSUE_TEMPLATE/` di un repo di
> progetto (vedi sotto). Questo è voluto: i progetti standard dell'org continuano a vedere solo i 7
> template completi.

## Cosa contiene

Stessi **tipi di issue** dei template completi (Epic, Feature, User story, Task, Bug, Impediment,
Spike), ma con i **soli campi essenziali**:

| File | Tipo | Campi |
|------|------|-------|
| `1-epic.yml` | Epic | Obiettivo/Visione · Valore atteso |
| `2-feature.yml` | Feature | Obiettivo · Valore di business |
| `3-user-story.yml` | User story | Description · Acceptance criteria |
| `4-task.yml` | Task | Descrizione attività · Checklist (opz.) |
| `5-bug.yml` | Bug | Repro steps · Comportamento attuale · Comportamento atteso |
| `6-impediment.yml` | Impediment | Descrizione · Azioni |
| `7-spike.yml` | Spike | Obiettivo · Domande · Timebox |

Il campo `type:` è identico ai template completi: la **classificazione dell'issue non cambia**,
cambia solo la quantità di campi del form.

## Come attivare il set semplificato in un progetto

Per far usare a un repo di progetto la versione semplificata **al posto** di quella completa:

1. Nel repo di progetto crea la cartella `.github/ISSUE_TEMPLATE/` (se non esiste).
2. **Copia i file** `.yml` di questa cartella `simplified-issue-templates/` nella root
   `.github/ISSUE_TEMPLATE/` del repo di progetto.
3. Fai commit e push.

Da quel momento, per quel repo il selettore mostrerà **solo i 7 template semplificati**: la cartella
`ISSUE_TEMPLATE/` del repo **sovrascrive** i default dell'org `.github`.

### Esempio (dalla root del repo di progetto)

```bash
# clona/entra nel repo di progetto, poi:
mkdir -p .github/ISSUE_TEMPLATE
# copia i file semplificati presi da agic-sandbox/.github
curl -sSL https://raw.githubusercontent.com/agic-sandbox/.github/main/.github/simplified-issue-templates/1-epic.yml -o .github/ISSUE_TEMPLATE/1-epic.yml
# ...ripeti per 2-feature.yml ... 7-spike.yml
git add .github/ISSUE_TEMPLATE && git commit -m "chore: usa issue template semplificati" && git push
```

> Nota: l'override è **tutto-o-niente**. Se un repo definisce una propria cartella
> `ISSUE_TEMPLATE/`, i default dell'org non vengono più ereditati per quel repo. Copia quindi
> **tutti** i template che vuoi rendere disponibili (semplificati e/o completi a scelta).

## Manutenzione

Se aggiorni i template completi in `.github/ISSUE_TEMPLATE/`, valuta se allineare anche questi
semplificati. I due set sono indipendenti per scelta.
