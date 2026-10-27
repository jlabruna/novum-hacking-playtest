# NOVUM Network Intrusion Playtest

A standalone, local-first tabletop playtest PWA. It implements the linear Breach 0–10 intrusion, security elements, Program checks, ICE, Trace/Pursuit, specialist charges, and optional Resource Nodes from NOVUM canon revision `2026-10-27-r4`. It is separate from NOVUM's private canon and Foundry repositories. The test-only interpretations are in [ASSUMPTIONS.md](ASSUMPTIONS.md).

## Play

Set a Hacker's INT modifier, Program rank and specialist Program tiers. Choose difficulty, network tier and an optional reproducible seed. Review the complete generated network, then begin. Fog of Network defaults on for new sessions as an app-only playtest variant; Settings can restore canonical full visibility. Each run records its visibility mode and app version. Two NET Actions consume one physical Main Action. Results and chronological action logs are stored in IndexedDB on this device. The Playtest Log filters actual sessions and offers Summary/Detailed copy, share/text export and JSON export. Settings includes full backup/import and history clearing.

Tier 1–4 Hacker presets configure focused INT/Program values and all five specialist tiers; manual changes and existing v0.1.1 profiles remain available and persist locally. Hacker tier and network tier are independent.

The included Hacker is an **example configuration**, not an official character. A network's tier sets DV 14/16/18/20, while Easy/Standard/Hard sets component counts independently. Special Programs require a tier at least equal to the network tier and spend the shared three charges. No software-tier check bonus is added.

## iPhone

Open the published GitHub Pages URL in **Safari**, tap **Share → Add to Home Screen**, enable **Open as Web App** if offered, and tap **Add**. Open it once while connected so the app shell caches; then it can run offline. Finish a sample intrusion, open **Playtest Log → Copy Playtest Data**, and paste the report into a NOVUM Planning chat. ChatGPT is not required to play. Keep regular **Settings → Export Backup** files; removing site data or the installed app may erase local sessions.

## Development and publishing

Requires Node 24, with no external runtime or build dependencies.

```sh
npm run verify
```

The static site is produced in `dist/`. `.github/workflows/pages.yml` tests and publishes that directory when `main` changes. Set repository **Settings → Pages → Build and deployment → GitHub Actions** once. The site uses relative versioned assets so it runs beneath a repository URL prefix. The service worker precaches the complete shell, fetches navigations fresh when online and falls back offline; each release should update the app version, asset query and cache identifier. Close and reopen after an update. IndexedDB survives a routine update.

Version 0.1.2 adds a compact mobile action surface, matching Breach/Pursuit tracks, tabbed events/map, and iPhone safe-area spacing. Updates preserve IndexedDB history; old sessions are labelled legacy full/unspecified rather than retroactively fog-enabled.

No backend, account, telemetry, cloud sync or licensed Foundry runtime is involved. The icon is a generic concentric motif, not a reproduction of the NOVUM logo. The palette follows the private Visual Identity Guide; local font fallbacks avoid a network dependency.
