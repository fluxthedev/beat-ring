# Surface audio initialization failures

## Summary
When audio setup throws inside `hooks/use-beat-sequencer.ts`, the catch block currently sets `samplesLoaded` to `true`. The UI only displays the error message while `samplesLoaded` is `false`, so the failure disappears without feedback. Users just see the loader vanish with the transport stopped.

## Acceptance Criteria
- Failing to initialize audio leaves the UI in an error state so the "Error initializing audio" message is visible.
- The normal loaded path is not re-entered after a failure unless a retry succeeds.
- (Optional) Provide guidance or a retry mechanism if initialization cannot proceed.

## Implementation Notes
- Update the failure handling logic in `hooks/use-beat-sequencer.ts` to avoid setting `samplesLoaded` to `true` when initialization fails.
- Confirm the `BeatSequencer` component renders the existing error message when an initialization error occurs.
- Consider whether a retry button or instructions are helpful after an error.
