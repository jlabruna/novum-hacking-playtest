# NOVUM Network Intrusion tactical audio (v0.1.6)

All effects are original Web Audio synthesis in `src/audio.js`; the PWA makes no audio network requests. The six auditioned references are implemented with their specified waveforms, frequencies, envelopes and relative gains:

| Cue | Approved reference | Nominal duration |
| --- | --- | --- |
| Button | Holographic click, Concept 01 | 150 ms |
| Program success | Layered digital confirmation, Concept 01 | 250 ms |
| Program failure | Low digital rejection, Concept 01 | 320 ms |
| Objective complete | Warm harmonic resolution, **v2** | about 1.6 s including the final harmonic; short delay tail |
| Ejection | Three gated low error pulses, **v4** | 350 ms |
| Detection | Single low harmonic warning, **v5** | 700 ms |

The noise transients use a reusable deterministically filled buffer. A bounded compressor supports the mix, and ejection uses a mild waveshaper where available. The success cue has a short, finite-feedback delay; its routing disconnects after the tail. Phone speakers receive audible low harmonics above sub-bass. Master volume follows the stored 0-100% setting (zero is silent), and each new cue stops the previous one.

New matching effects: ICE encounter, ICE win, ICE loss, Sentry, Memory expenditure, Resource extraction and Pursuit advancement. The app chooses exactly one cue for an interaction: success/ejection > detection > resolved encounter/resource/memory > Pursuit advance > Program result > button. Revisiting a saved result is ordinary navigation and does not replay terminal audio. Program sounds do not stack over a terminal outcome. Browser restrictions mean a user gesture is needed to unlock audio. Unavailable or suspended audio never changes gameplay.

Run `npm run verify` to test event priority, sound settings, oscillator cleanup, offline packaging and unchanged intrusion rules. Web Audio mocks test routing and levels; real loudness and compatibility on physical iPhone Safari, iPhone silent-switch modes and Bluetooth devices require listening tests.
