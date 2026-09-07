# DISABLED 2026-09-07 — this script must never run from the SL Auto repository.
#
# What it used to do: build THIS codebase with NEXT_PUBLIC_BRAND=demo and deploy
# it to Cloud Run service `appraisio-demo` in project `appraisio-demo-ca`, which
# serves https://lionheart-appraisal.com.
#
# Why that was wrong: Lionheart Appraisal is a separate product in its own
# repository, with its own Firebase project and its own GitHub Actions deploy.
# Two codebases pointing at one Cloud Run service means the last deploy wins, so
# running this overwrote Lionheart's site with a build of SL Auto. That is how
# « Dashboard · SL-auto » appeared in Lionheart's browser tab on 2026-09-06:
# the sidebar took the demo brand while the page title took SL Auto's hardcoded
# name, and the shipped bundle carried BOTH firms' identities.
#
# The demo brand has since been removed from src/lib/brand.ts, so this script
# could no longer even produce a Lionheart-branded build — it would publish a
# fully SL-Auto-branded app onto Lionheart's domain, which is worse.
#
# To deploy Lionheart: push to main in the lionheart-appraisal repository, or
# run its workflow (`gh workflow run deploy.yml -R younesnaji00-rgb/lionheart-appraisal`).
# To deploy SL Auto: push to main here; Firebase App Hosting builds apphosting.yaml.

Write-Host ""
Write-Host "  This script is disabled." -ForegroundColor Red
Write-Host ""
Write-Host "  It deployed SL Auto's code to Lionheart Appraisal's production URL." -ForegroundColor Yellow
Write-Host "  Lionheart now lives in its own repository and deploys itself:" -ForegroundColor Yellow
Write-Host ""
Write-Host "    gh workflow run deploy.yml -R younesnaji00-rgb/lionheart-appraisal" -ForegroundColor Cyan
Write-Host ""
exit 1
