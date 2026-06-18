<#
.SYNOPSIS
  Crea un nuovo GitHub Project clonando il template org (incluse VISTE, campi, configurazione).

.DESCRIZIONE
  Usa la mutation GraphQL copyProjectV2: a differenza della funzione "Use as template" della UI,
  e' eseguibile da riga di comando in modo ripetibile. Clona dal Project template tutte le viste,
  i campi custom, le opzioni dello Status e i workflow.

  IMPORTANTE (limite GitHub): la copia e' una FOTOGRAFIA al momento della creazione.
  Modifiche successive al template NON si propagano ai progetti gia' creati (le viste non sono
  aggiornabili via API). Quindi: stabilizza il template, poi crea i progetti con questo script.

.PARAMETRO Title
  Titolo del nuovo progetto (es. "agic-clienteX-progetto").

.PARAMETRO RepoToLink
  (Opzionale) owner/repo da agganciare automaticamente al nuovo progetto.

.PARAMETRO IncludeDraftIssues
  (Opzionale) se presente, copia anche le draft issue del template.

.ESEMPIO
  ./new-project-from-template.ps1 -Title "agic-acme-shop" -RepoToLink "agic-sandbox/acme-project"
#>
param(
  [Parameter(Mandatory=$true)][string]$Title,
  [string]$RepoToLink,
  [switch]$IncludeDraftIssues
)
$ErrorActionPreference = "Stop"

# --- Config template (Project #14 "agic_scrum_template") ---
# Clonato da acme_project (#12): 7 viste preconfigurate (Backlog, Sprint backlog/board/breakdown,
# Roadmap, Bug tracking, Impediment tracking) con filtri gia impostati. 0 item demo.
$ORG_LOGIN     = "agic-sandbox"
$OWNER_ID      = "O_kgDOEGS8MQ"             # node id org agic-sandbox
$TEMPLATE_PID  = "PVT_kwDOEGS8Mc4BbB9y"     # node id Project #14 template (agic_scrum_template)

Write-Host "Clono il template '$TEMPLATE_PID' -> nuovo progetto '$Title'..."

$drafts = if($IncludeDraftIssues){ "true" } else { "false" }
$q = @"
mutation(`$src:ID!, `$owner:ID!, `$title:String!) {
  copyProjectV2(input:{ projectId:`$src, ownerId:`$owner, title:`$title, includeDraftIssues:$drafts }) {
    projectV2 { id number url title }
  }
}
"@

$res = gh api graphql -f query=$q -f "src=$TEMPLATE_PID" -f "owner=$OWNER_ID" -f "title=$Title" | ConvertFrom-Json
$p = $res.data.copyProjectV2.projectV2
if(-not $p){ Write-Error "Copia fallita."; exit 1 }
Write-Host "OK -> #$($p.number)  $($p.url)"

# --- Aggancio repo opzionale ---
if($RepoToLink){
  $repoId = gh api "repos/$RepoToLink" --jq '.node_id'
  $ql = 'mutation($p:ID!,$r:ID!){ linkProjectV2ToRepository(input:{projectId:$p, repositoryId:$r}){ repository{ name } } }'
  gh api graphql -f query=$ql -f "p=$($p.id)" -f "r=$repoId" | Out-Null
  Write-Host "Repo '$RepoToLink' agganciata al progetto."
}

Write-Host "`nNuovo progetto pronto: $($p.url)"
