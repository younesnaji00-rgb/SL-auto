# Deploy the white-label DEMO (Lionheart Appraisal, Canadian showcase) to Cloud Run.
#
# What it does:
#   1. Copies .env.demo -> .env.production so the Next.js build bakes the
#      demo brand + demo Firebase project into the client bundle.
#   2. gcloud run deploy from source (Cloud Build, Dockerfile at repo root).
#   3. Deletes .env.production again (it must NEVER be committed — the
#      firm's App Hosting build would otherwise pick up demo values).
#   4. Redeploys the Firebase Hosting proxy (demo-hosting/) that fronts the
#      service at lionheart-appraisal.com. Hosting's CDN caches Next's static
#      HTML for a year (s-maxage=31536000), so without this purge the custom
#      domain keeps serving the previous revision's HTML — and its stale
#      JS chunk hashes — after every Cloud Run deploy.
#
# Usage:  powershell -File scripts\deploy-demo.ps1

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$envProd = Join-Path $repo '.env.production'
Copy-Item (Join-Path $repo '.env.demo') $envProd -Force
Write-Host '.env.production staged from .env.demo'

try {
  gcloud run deploy appraisio-demo `
    --source . `
    --project appraisio-demo-ca `
    --region northamerica-northeast1 `
    --allow-unauthenticated `
    --memory 1Gi `
    --cpu 1 `
    --min-instances 0 `
    --max-instances 2 `
    --set-secrets "GOOGLE_GENAI_API_KEY=GOOGLE_GENAI_API_KEY:latest" `
    --quiet
  if ($LASTEXITCODE -ne 0) { throw "gcloud run deploy failed ($LASTEXITCODE)" }
} finally {
  Remove-Item $envProd -Force -ErrorAction SilentlyContinue
  Write-Host '.env.production removed'
}

# Purge the Hosting CDN so lionheart-appraisal.com serves the new revision.
Push-Location (Join-Path $repo 'demo-hosting')
try {
  npx firebase-tools deploy --only hosting --project appraisio-demo-ca
  if ($LASTEXITCODE -ne 0) { throw "firebase hosting deploy failed ($LASTEXITCODE)" }
  Write-Host 'Hosting proxy redeployed (CDN purged).'
} finally {
  Pop-Location
}
