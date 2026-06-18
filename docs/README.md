# Processi GitHub — agic-sandbox

Documentazione operativa per gestire **progetti, template e issue** nell'organizzazione
`agic-sandbox` su GitHub, in modo coerente con il modello Scrum gia in uso su Azure DevOps.

## Indice

| Guida | Argomento |
|-------|-----------|
| [01 — Issue Types e Template](01-issue-types-e-template.md) | Tipi di issue org-level, Issue Form, repo `.github` |
| [02 — Creazione progetti da template](02-creazione-progetti-da-template.md) | Clonare il template Scrum, agganciare repo, script |
| [03 — Viste, filtri e Scrum](03-viste-filtri-scrum.md) | Backlog, sprint, gerarchia, iteration, filtri per tipo |

## Architettura in breve

```
Organizzazione agic-sandbox
├── Issue Types (Settings)         → Epic, Feature, User story, Task, Bug, Impediment, Spike
├── Repo .github (public)          → issue template (.yml) + queste guide
│   └── .github/ISSUE_TEMPLATE/    → 7 Issue Form, uno per tipo
├── Project template "agic_scrum_template"  → 7 viste + campi preconfigurati
└── Progetti di lavoro (1 per repo/cliente) → clonati dal template
```

## Concetti chiave (e i loro limiti)

| Concetto | Come funziona | Limite da ricordare |
|----------|---------------|---------------------|
| **Issue Types** | Definiti a livello org, condivisi da tutte le repo | — |
| **Issue Template** | Default org nella repo `.github` (deve essere **public**) | Una repo con propria cartella `ISSUE_TEMPLATE` fa override |
| **Project template** | Clonato alla creazione (viste/campi inclusi) | E una **copia**: modifiche al template NON si propagano ai progetti gia creati |
| **Viste / filtri** | Configurabili solo da UI | **Non scrivibili via API** |
| **Campi custom** | Creabili/valorizzabili via API | Le viste no |

## Per iniziare

- Creare un nuovo progetto di lavoro → vedi [Guida 02](02-creazione-progetti-da-template.md)
- Capire i tipi di issue e i form → vedi [Guida 01](01-issue-types-e-template.md)
- Configurare board, sprint e gerarchia → vedi [Guida 03](03-viste-filtri-scrum.md)
