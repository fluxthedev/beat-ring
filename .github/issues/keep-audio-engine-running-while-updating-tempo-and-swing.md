# Keep audio engine running while updating tempo and swing

## Summary
Changing the tempo or swing currently retriggers the heavy audio initialization effect in `hooks/use-beat-sequencer.ts`, which tears down and rebuilds the entire Tone.js graph. This causes playback to pause and the loading UI to flash on every small adjustment. We should keep the transport update lightweight so that tempo and swing tweaks remain smooth.

## Acceptance Criteria
- Audio initialization only runs when the selected kit changes, not when tempo or swing is updated.
- Existing effects continue to keep the Tone.Transport BPM and swing values synchronized with state changes.
- Adjusting tempo or swing while audio is playing no longer pauses playback or shows the loading indicator.

## Implementation Notes
- Narrow the dependency list for the audio initialization effect in `hooks/use-beat-sequencer.ts` and guard it with a kit reference.
- Verify that the dedicated effects that update BPM and swing still cover all update paths after the dependency change.
- Manually test playback while adjusting tempo and swing to confirm the transport keeps running smoothly.
