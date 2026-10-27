# Test-only interpretations

Canonical mode implements NOVUM Network Intrusion as published in coordinated System Reference revision `2026-10-27-r4`. These choices are **playtest implementation assumptions**, not additions to tabletop canon. Canonical runs retain assumption-set identifier `test-1`. Streamlined runs use `streamlined-test-1`.

- The scenario establishes the initial network connection. The app does not model re-entry, reconnection, an enemy Hacker, or combat elsewhere.
- When Breach reaches 10 on the same NET Action as a possible Pursuit catch, objective completion wins. Pursuit still advances on the action that first reaches Trace 6, unless Breach 10 has completed.
- Fortify occupies the segment immediately behind the Hacker when invoked, provided that segment is ahead of Pursuit and greater than zero. One arrival of Pursuit at that segment is prevented, consuming the position. A later Fortify replaces an earlier one.
- If one successful advancement crosses multiple Resource Nodes, the player may stop at the earliest and discard the rest of the advancement, or pass all crossed nodes and continue. Later nodes remain available on a future action only if the player stopped before reaching them.
- Nodes represent one extracted playtest reward each. No NOVUM credit value, charge restoration, or lasting equipment benefit is assigned. Remaining active nodes at the end are counted as left uncollected.
- The generator assigns one element per segment among positions 1–9. This prevents collisions and leaves the objective at 10. It does not bias encounter placement by difficulty or tier.
- ICE responses draw from a deterministic sequence derived from the network seed and are revealed only after each player choice. Digital d20 rolls use local browser randomness.

Questions about Fortify, simultaneous outcomes, node crossing, reconnection, and specialist ownership remain for Planning. Edit the assumption-set identifier when changing these interpretations, and retain old run metadata for analysis.

## Streamlined Intrusion — experimental, not canon (`streamlined-test-1`)

The v0.1.4 app offers a separate Streamlined ruleset for comparing flow and outcome with Canonical mode. It has no Barriers or Tunnel and may target Breach 8 or 10. A successful Cautious or Aggressive action applies its normal Trace, then resolves crossed positions in order. ICE at a crossed position interrupts the same NET Action: victory or compatible one-charge Bypass resumes the remaining movement; defeat stops at that ICE and loses the rest. Draws immediately replay without extra action or Trace. A new Basic Program check is required to retry active ICE; failure gives no free confrontation. Multiple ICE resolve in position order. Resource Nodes and Sentries keep their existing decisions and consequences within the same movement action. End-of-action Pursuit advances only once; immediate penalties still apply. The existing test-only objective-before-catch precedence remains.

Streamlined Cautious defaults to a TEST-ONLY +2 check modifier; Aggressive defaults +0. Both remain editable independently of Canonical's +0/+0 defaults. Neither alters Breach, Trace, Pursuit, specialist charge costs, natural-roll overrides, or the network-tier DV. Both modes retain three shared specialist charges. The mode, objective and modifiers are recorded at run creation; a later setup change cannot rewrite them. Historical runs without a mode or objective are interpreted as Canonical/Breach 10. Generator placements remain unique and within positions 1 through one less than the selected objective. No claim is made that the experimental rules are approved for NOVUM tabletop canon.
