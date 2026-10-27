# NOVUM Network Intrusion Playtest

A standalone, local-first tabletop playtest PWA. Canonical mode implements the linear Breach 0–10 intrusion, security elements, Program checks, ICE, Trace/Pursuit, specialist charges, and optional Resource Nodes from NOVUM canon revision `2026-10-27-r4`. It is separate from NOVUM's private canon and Foundry repositories. The test-only interpretations are in [ASSUMPTIONS.md](ASSUMPTIONS.md).

## Play

Set a Hacker's INT modifier, Program rank and specialist Program tiers. Choose difficulty, network tier and an optional reproducible seed. Review the complete generated network, then begin. Fog of Network defaults on for new sessions as an app-only playtest variant; Settings can restore canonical full visibility. Each run records its visibility mode and app version. Two NET Actions consume one physical Main Action. Results and chronological action logs are stored in IndexedDB on this device. The Playtest Log filters actual sessions and offers Summary/Detailed copy, share/text export and JSON export. Settings includes full backup/import and history clearing.

Version 0.1.4 adds a **Ruleset** selector on Generate Network. **Canonical** retains Barriers, Tunnel, separate ICE actions, and Breach 10. **Streamlined (Experimental — Not Canon)** generates no Barriers, omits Tunnel, and resolves ICE within a successful Cautious or Aggressive movement action. Choose a Breach target of 8 or 10 (default 10). A defeated ICE stops movement at its position; a later successful Basic Program check retries it. Compatible ICE Bypass clears it without an additional NET Action. Resource Nodes, Sentries, Trace, Pursuit and the three shared charges continue to work. The complete seeded network remains visible before Begin Intrusion. These changes do not alter published NOVUM rules.

Hacker Setup keeps separate TEST-ONLY Cautious/Aggressive modifiers for each mode: Canonical defaults +0/+0, Streamlined defaults +2/+0. Both are adjustable and snapshotted per run, so changing setup later does not change an active or historical intrusion. Older runs are read as Canonical, Breach 10, with their original modifiers. The Log's Summary and Detailed reports identify exact ruleset, target, modifiers, difficulty, tier and visibility groups; they also show ICE interactions, actual movement, NET actions and Main-action rounds. Compare like configurations rather than treating a mixed total as a single ruleset's completion rate.

Tier 1–4 Hacker presets configure focused INT/Program values and all five specialist tiers; manual changes and existing v0.1.1 profiles remain available and persist locally. Hacker tier and network tier are independent.

Version 0.1.3 added quiet, optional synthesized feedback, a full-width Trace track and prominent terminal results. Settings stores sound on/off and volume (25% initially). Hacker Setup offers independent −6…+6 **TEST-ONLY** Cautious and Aggressive check modifiers. Tunnel, extraction and specialist effects retain their Canonical behavior. Each run captures its modifiers when it starts. Summary and Detailed reports include an export timestamp and per-run configurations; detailed events include the complete check breakdown. The Log has a confirmed **Clear Completed Runs** action that leaves the active intrusion and configuration intact.

The included Hacker is an **example configuration**, not an official character. A network's tier sets DV 14/16/18/20, while Easy/Standard/Hard sets component counts independently. Special Programs require a tier at least equal to the network tier and spend the shared three charges. No software-tier check bonus is added.

## iPhone

Open the published GitHub Pages URL in **Safari**, tap **Share → Add to Home Screen**, enable **Open as Web App** if offered, and tap **Add**. Open it once while connected so the app shell caches; then it can run offline. Finish a sample intrusion, open **Playtest Log → Copy Playtest Data**, and paste the report into a NOVUM Planning chat. ChatGPT is not required to play. Keep regular **Settings → Export Backup** files; removing site data or the installed app may erase local sessions.

## Development and publishing

Requires Node 24, with no external runtime or build dependencies.

```sh
npm run verify
```

The static site is produced in `dist/`. `.github/workflows/pages.yml` tests and publishes that directory when `main` changes. Set repository **Settings → Pages → Build and deployment → GitHub Actions** once. The site uses relative versioned assets so it runs beneath a repository URL prefix. The service worker precaches the complete shell, fetches navigations fresh when online and falls back offline; each release should update the app version, asset query and cache identifier. Close and reopen after an update. IndexedDB survives a routine update.

Version 0.1.2 added a compact mobile action surface, matching Breach/Pursuit tracks, tabbed events/map, and iPhone safe-area spacing. Updates preserve IndexedDB history; old sessions are labelled legacy full/unspecified rather than retroactively fog-enabled. Existing runs without modifier metadata are read as canonical +0/+0. Audio starts only after a user gesture; iPhone output, including silent-switch behavior, needs device testing.

No backend, account, telemetry, cloud sync or licensed Foundry runtime is involved. The icon is a generic concentric motif, not a reproduction of the NOVUM logo. The palette follows the private Visual Identity Guide; local font fallbacks avoid a network dependency.
