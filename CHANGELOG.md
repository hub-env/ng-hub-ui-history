# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [22.0.0] - 2026-06-17

### Changed

- Aligned with Angular 22.
- README documentation standardized.


## [0.1.0] - 2026-06-17

### Added

- Initial release of `ng-hub-ui-history`, a signal-based history store for Angular.
- `createHistoryStore<T, K>(config?)` factory that creates a multi-object history store.
- `HistoryStoreConfig<T, K>` with `maxEntries`, `maxBytes`, `keySelector`, and optional
  custom `diff`/`patch` strategies.
- Multi-object tracking keyed by a configurable key type (`string | number` by default).
- Reactive `states` signal exposing the current snapshot of every tracked object.
- `registerObject(id, initialState)` and `registerFromObject(initialState)` registration helpers.
- `commit(id, newState, options?)` and `commitFromObject(newState, options?)` commit helpers,
  returning `false` when no change is detected.
- Linear `undo(id)` / `redo(id)` navigation with redo invalidation after a new manual commit.
- `canUndo(id)` / `canRedo(id)` availability checks.
- `getState(id)` returning the current immutable state.
- `history(id)` returning readonly `HistoryMetadata` (pointer, length, bytes, per-entry info).
- Transaction support via `beginTransaction(id, label?)` and `endTransaction(id)` to collapse
  multiple commits into a single history entry.
- `watchForm(id, form, options?)` to auto-commit Angular Reactive Forms value changes; returns
  an unsubscribe function. Supports `WatchFormOptions` (`label`, `skipInitial`).
- `clearHistory(id)` to reset the timeline while keeping the current state as the new base.
- Efficient storage using forward/backward diff patches instead of full snapshots.
- Retention controls bounded by maximum entries and approximate memory bytes.
- Exported public types: `HistoryStore`, `HistoryStoreConfig`, `HistoryEntry`,
  `HistoryCommitOptions`, `HistoryMetadata`, `HistoryPatchOperation`, `WatchFormOptions`.
