# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [22.0.3] - 2026-09-01

### Changed

- **The `homepage` in the manifest points at this library's own documentation page** rather than at
  the site root. It is the link a registry shows beside the package and the one a reader clicks from
  it, and landing on a front page they then have to search is a worse answer than landing on the
  reference for the package they were already looking at. Metadata only — no code, no types, no
  styles change, and nothing a consumer imports is affected.

## [22.0.2] - 2026-08-08

### Fixed

- Documentation links now point at the canonical localized URLs. The README linked to `https://hubui.dev/<path>` with no locale prefix and no trailing slash, and both forms are 301-redirected, so every reader arriving from npm or GitHub landed on a redirect instead of the canonical page.

## [22.0.1] - 2026-07-28

### Added

- Test suite for the diff/patch/clone utilities and multi-object undo/redo: `cloneDeep` isolation (nested structures, Dates), `createDefaultDiff`/`applyDefaultPatch` round-trips across representative shapes (nested objects, array insert/remove/reorder, key deletion, null transitions, deep nesting), `estimateBytes` sanity, and store-level coverage for independent per-object timelines, no-op transactions and redo invalidation after transactional commits. No runtime changes.

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
