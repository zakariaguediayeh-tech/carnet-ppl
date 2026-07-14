# Carnet PPL Coach — PWA installable

Coach d'entraînement PPL guidé (séances animées avec GIF, chrono de repos, surcharge progressive). Version orange. Installable comme "app" sur Android/iOS via GitHub Pages.

## Fichiers (à mettre à la racine du dépôt)
- `index.html` — l'application complète (GIF inclus, fonctionne hors-ligne)
- `manifest.webmanifest` — métadonnées d'installation
- `sw.js` — service worker (cache hors-ligne)
- `icon-192.png`, `icon-512.png` — icônes de l'app

## Publier sur GitHub Pages
1. Dans ton dépôt GitHub, remplace les anciens fichiers par ceux-ci (Add file → Upload files → glisser-déposer → Commit).
2. Settings → Pages → Source « Deploy from a branch », branche `main`, dossier `/ (root)`, Save.
3. Attends ~1 min. L'app est en ligne sur `https://<ton-user>.github.io/<repo>/`.

## Mettre à jour (important)
Le cache hors-ligne a été passé en `v2` : à la prochaine ouverture, l'ancienne version verte sera automatiquement remplacée par la nouvelle. Si tu vois encore l'ancienne, ferme puis rouvre l'app une fois (connecté à internet).

## Installer sur le téléphone
- Android (Chrome) : ouvre le lien → menu ⋮ → « Installer l'application ».
- iPhone (Safari) : Partager → « Sur l'écran d'accueil ».

Tes données restent sur l'appareil (Export/Import JSON dans l'onglet Stats pour sauvegarder ou changer d'appareil).

## Vrai APK (optionnel)
https://www.pwabuilder.com → colle l'URL GitHub Pages → génère le package Android.
