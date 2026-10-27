# Test-only interpretations

This app implements NOVUM Network Intrusion as published in coordinated System Reference revision `2026-10-27-r4`. These choices are **playtest implementation assumptions**, not additions to tabletop canon. The assumption-set identifier in every run and export is `test-1`.

- The scenario establishes the initial network connection. The app does not model re-entry, reconnection, an enemy Hacker, or combat elsewhere.
- When Breach reaches 10 on the same NET Action as a possible Pursuit catch, objective completion wins. Pursuit still advances on the action that first reaches Trace 6, unless Breach 10 has completed.
- Fortify occupies the segment immediately behind the Hacker when invoked, provided that segment is ahead of Pursuit and greater than zero. One arrival of Pursuit at that segment is prevented, consuming the position. A later Fortify replaces an earlier one.
- If one successful advancement crosses multiple Resource Nodes, the player may stop at the earliest and discard the rest of the advancement, or pass all crossed nodes and continue. Later nodes remain available on a future action only if the player stopped before reaching them.
- Nodes represent one extracted playtest reward each. No NOVUM credit value, charge restoration, or lasting equipment benefit is assigned. Remaining active nodes at the end are counted as left uncollected.
- The generator assigns one element per segment among positions 1–9. This prevents collisions and leaves the objective at 10. It does not bias encounter placement by difficulty or tier.
- ICE responses draw from a deterministic sequence derived from the network seed and are revealed only after each player choice. Digital d20 rolls use local browser randomness.

Questions about Fortify, simultaneous outcomes, node crossing, reconnection, and specialist ownership remain for Planning. Edit the assumption-set identifier when changing these interpretations, and retain old run metadata for analysis.
