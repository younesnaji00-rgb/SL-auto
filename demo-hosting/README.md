# Demo hosting proxy (Lionheart / appraisio-demo-ca)

Firebase Hosting front for the Cloud Run demo service, used to attach the
custom domain **lionheart-appraisal.com** with managed SSL + CDN.

- All requests rewrite to Cloud Run `appraisio-demo` (northamerica-northeast1),
  the service deployed by `scripts/deploy-demo.ps1`. Redeploying Cloud Run does
  NOT require redeploying this — the rewrite always points at the live service.
- `public/` is intentionally empty: no static file may shadow an app route.

Deploy (from this directory):

    npx firebase-tools deploy --only hosting --project appraisio-demo-ca

Custom domains are managed in Firebase console -> Hosting; the domain must
also be listed in Authentication -> Settings -> Authorized domains.
