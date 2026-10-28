# NOVUM Network Intrusion Playtest

Version **0.2.1** implements the published NOVUM Network Intrusion first-playtest rules, canon revision `2026-10-29-r2`. The standalone PWA is a tabletop play aid, not a facility simulation or Foundry module. The [System Reference](https://github.com/jlabruna/novum-canon/blob/main/docs/system/SYSTEM_REFERENCE.md) governs the rules.

The 0.2.1 update renames the displayed Level 2 Feat to **Device Exploit**. Saved Hacker progression uses the numeric acquired Feat level, so existing profiles need no migration; historical runs retain their recorded version and canon. Combat Hacking and the proposed universal difficulty ladder are adjudicated outside this intrusion play aid. Network Intrusion checks, encounter difficulty and balance are unchanged.

## Play

Open [Network Intrusion](https://jlabruna.github.io/novum-hacking-playtest/). In **Hacker Setup**, enter INT and Program and choose the **highest Network Intrusion Feat actually acquired**. Higher positions include prerequisites; reaching a character level alone does not grant a Feat. The example ability preset changes INT and Program only. New runs snapshot setup, so later changes do not rewrite them.

Generate a network by choosing Easy/Standard/Hard difficulty, independent T1–T4 tier, GM-controlled Facility Alert 0–3 and optional reproducible seed. Review the visible encounter track, then begin. The objective is Breach 10. Alert sets starting Trace; detection occurs at Trace 8. One physical Main Action gives two NET Actions. Cautious is check +2, +2 Breach on success and +2 Trace on either result. Aggressive is check +0, +3 Breach on success, +2 Trace on success and +3 on failure. Diagnostic roll modifiers can be changed in Setup; nondefault values are recorded in reports and are not a canon change.

ICE resolves during movement. Resource Node extraction costs an additional NET Action; skipped and failed nodes remain unavailable unless Backdoor restarts the same intrusion. Sentries are one-use and cost one Breach plus one Trace or immediate Pursuit; Spoof prevents both. The GM determines node rewards and real-world consequences. The app never automatically raises Facility Alert because of minigame outcomes.

| Highest acquired Feat | Memory | Intrusion Programs | Tabletop ability |
| --- | ---: | --- | --- |
| None | 0 | None | Basic intrusion remains available to a Hacker trained in Program. |
| Intrusion Protocol (minimum 1) | 2 | Trace Removal, Fortify, Spoof, Override | — |
| Device Exploit (minimum 2) | 2 | Same | Close-range Open, Lock, Blind. |
| Expanded Capacity (minimum 4) | 3 | Same | Device Exploit reaches Medium. |
| Security Subversion (minimum 6) | 3 | Adds ICE Bypass | Device Exploit gains Disable. |
| Logic Bomb (minimum 8) | 3 | Same | One physically planted security contingency; Free Action trigger resets Alert to 0. |
| Backdoor (minimum 10) | 3 | Same | One chosen restart when Pursuit would eject the Hacker. |

Specialist Programs are unlocked by Feats and cost one Memory each. There are no specialist software tiers, purchases or preparation slots. ICE Bypass works at any network tier once acquired. Device Exploit is a one-roll, one-device tabletop ability, not a Network Intrusion action; a live feed grants visibility but does not extend the Hacker's own range. Logic Bomb is also adjudicated at the tabletop. The PWA displays these abilities but does not simulate them.

Backdoor pauses at qualifying Pursuit ejection for a player choice. Using it immediately restarts the same terminal and layout, restores feat-derived Memory, resets Breach to 0 and Trace to the GM's current Alert, and deactivates Pursuit. Collected nodes and rewards stay collected and cannot pay twice; failed/skipped nodes reopen. It can be used once per original intrusion. Declining or later ejection locks that terminal for the rest of the mission by default. Voluntary disconnection also locks that terminal. A different terminal is a separate encounter.

## History, backup and offline use

The old Canonical and experimental Streamlined modes are unavailable for new play. Existing runs, their original rulesets, versions, assumptions, actions and outcomes remain in local IndexedDB and in backup/export files. Existing active old-format runs retain their original engine path and can be finished or archived under those rules. Logs identify historical conditions instead of recalculating them as current canon. Backup import remains replace-only with an explicit confirmation.

Open once while connected to cache the complete app shell; close and reopen after an update. Install on iPhone through Safari's **Share → Add to Home Screen**. Settings retains sound on/off and volume 0–100%, using the approved v0.1.6 tactical sounds. Export backups regularly because browser data can be erased. No account, telemetry or cloud sync is used.

## Development

Requires Node 18 or later. `npm run verify` runs syntax, deterministic tests, production build and offline asset checks. `npm run balance:canon -- 500` reproduces the fixed-policy profile comparison in `validation/balance-v020.json`; its results are observations, not rule changes. `.github/workflows/pages.yml` publishes `dist/` to GitHub Pages when `main` changes. The app uses versioned relative imports and a release-specific service worker cache. [ASSUMPTIONS.md](ASSUMPTIONS.md) records implementation details and historical compatibility; [AUDIO.md](AUDIO.md) documents the preserved sound set.
