# Sand Friction

`sand-friction.wav` is an original synthesized granular friction effect, not a
field recording or a third-party download. No external sample was used.

- Generator: `scripts/generate-sand-friction.cjs`
- Format: mono, 32000 Hz, 16-bit PCM, 2.98 seconds, 190764 bytes
- Construction: short aperiodic, filtered micro-impacts with a quiet friction
  bed and an overlapped loop join; no oscillator tone or continuous loud hiss
- Playback: opt-in, decoded once, silent on contact, gain/playback rate/filter
  controlled by pointer speed, audio-clock fade after motion stops
- Lifecycle: pointer release, hiding the page, leaving sand mode or disabling
  sound ends playback. No microphone, recording or upload is involved.

Regenerate with `node scripts/generate-sand-friction.cjs` from the repository root.
