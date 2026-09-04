Placeholder so `firebase deploy --only hosting` finds the public dir on a
fresh checkout. Every request is rewritten to the Cloud Run service (see
firebase.json rewrites) — nothing is ever served from here. Without a
tracked file git drops the empty directory and the deploy fails with
"Directory 'public' for Hosting does not exist".
