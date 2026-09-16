# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [22.0.5] - 2026-09-16

### Changed

- The repository moved to the `hub-env` organization. Issues for every Hub UI package are now
  gathered in [hub-env/hub-ui](https://github.com/hub-env/hub-ui/issues), and the `repository`, `bugs`
  and README links point at the new addresses. GitHub redirects the old ones.

## [22.0.4] - 2026-09-06

### Added

- **`FUNCTIONALITIES.md` ships with the library**, the same coverage table nine of the sibling
  packages already provide: which parts of the factory, the store and the diffing semantics a
  live example actually demonstrates, and which are only described in prose. Nothing said it
  before, so a reader had to open every example on the documentation site to find out that
  `keySelector`, `clearHistory` and the custom `diff`/`patch` strategies are documented but
  never shown.

### Fixed

- **The published manifest no longer declares a `main`.** It pointed at `src/public-api.ts`, the
  ng-packagr entry file, which never travels inside the tarball: any resolver that ignores the
  `exports` map — older bundlers, legacy Jest resolution, plain `require` — followed it straight to
  a file that is not there. Dropping the field leaves `exports`, `module` and `typings` as the only
  entry points, which is the shape ng-packagr emits for every other library in the monorepo.
- **A commit that only moves a `Date` (or a `Set`, `Map` or `RegExp`) is recorded again.** The
  default diff walked every object key by key, and those types keep their payload outside their own
  enumerable keys: `Object.keys(new Date())` is empty on both sides, so the comparison found nothing
  and produced an empty patch. The store reads an empty patch as "no change", so `commit()` returned
  `false`, the tracked state kept the old value that `getState()`/`states()` then handed back, and on
  a mixed commit `undo()` restored the other fields while leaving the new date in place — all without
  an error. Those values are now compared and replaced as a whole, which is what `structuredClone`
  already round-trips; an instance rebuilt with the same content still records no entry.

- **The English README no longer calls the package framework-agnostic.** The store is built on
  `signal`/`computed` from `@angular/core` and `watchForm` takes an `@angular/forms`
  `FormGroup`; both are declared peers, so the claim sent readers looking for a portable store
  they were never going to get. The Spanish README never made the claim, so the two also
  disagreed with each other; both now state the Angular requirement outright.
- **Both READMEs give the full rule for what `commit` returns.** They said it answers `false`
  when nothing changed and stopped there, while inside an open transaction it returns `true`
  unconditionally and records no entry — the one case where the return value cannot be read as
  "an entry was written".
- **The library-family list in both READMEs matches the packages that exist.** It still named
  `ng-hub-ui-accordion` and `ng-hub-ui-dropdown` and omitted badges, buttons, icons, loading,
  metrics, signature and toast.

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
