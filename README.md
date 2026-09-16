# ng-hub-ui-history

[Español](./README.es.md) | **English**

Signal-based history store for Angular with multi-object support, undo/redo, transactions, and automatic Reactive Forms tracking.

## Documentation and Live Examples

This package is part of [Hub UI](https://hubui.dev/en/), a collection of Angular component libraries for standalone apps.

- Docs: https://hubui.dev/en/history/overview/
- Live examples: https://hubui.dev/en/history/examples/
- Hub UI: https://hubui.dev/en/
- Hub UI on GitHub (issues, roadmap and contributing): https://github.com/hub-env/hub-ui

## 🧩 Library Family `ng-hub-ui`

This library is part of the **ng-hub-ui** ecosystem:

- [**ng-hub-ui-action-sheet**](https://www.npmjs.com/package/ng-hub-ui-action-sheet)
- [**ng-hub-ui-avatar**](https://www.npmjs.com/package/ng-hub-ui-avatar)
- [**ng-hub-ui-badges**](https://www.npmjs.com/package/ng-hub-ui-badges)
- [**ng-hub-ui-board**](https://www.npmjs.com/package/ng-hub-ui-board)
- [**ng-hub-ui-breadcrumbs**](https://www.npmjs.com/package/ng-hub-ui-breadcrumbs)
- [**ng-hub-ui-buttons**](https://www.npmjs.com/package/ng-hub-ui-buttons)
- [**ng-hub-ui-calendar**](https://www.npmjs.com/package/ng-hub-ui-calendar)
- [**ng-hub-ui-ds**](https://www.npmjs.com/package/ng-hub-ui-ds)
- [**ng-hub-ui-forms**](https://www.npmjs.com/package/ng-hub-ui-forms)
- [**ng-hub-ui-history**](https://www.npmjs.com/package/ng-hub-ui-history) ← You are here
- [**ng-hub-ui-icons**](https://www.npmjs.com/package/ng-hub-ui-icons)
- [**ng-hub-ui-loading**](https://www.npmjs.com/package/ng-hub-ui-loading)
- [**ng-hub-ui-metrics**](https://www.npmjs.com/package/ng-hub-ui-metrics)
- [**ng-hub-ui-milestones**](https://www.npmjs.com/package/ng-hub-ui-milestones)
- [**ng-hub-ui-modal**](https://www.npmjs.com/package/ng-hub-ui-modal)
- [**ng-hub-ui-nav**](https://www.npmjs.com/package/ng-hub-ui-nav)
- [**ng-hub-ui-paginable**](https://www.npmjs.com/package/ng-hub-ui-paginable)
- [**ng-hub-ui-panels**](https://www.npmjs.com/package/ng-hub-ui-panels)
- [**ng-hub-ui-portal**](https://www.npmjs.com/package/ng-hub-ui-portal)
- [**ng-hub-ui-signature**](https://www.npmjs.com/package/ng-hub-ui-signature)
- [**ng-hub-ui-skeleton**](https://www.npmjs.com/package/ng-hub-ui-skeleton)
- [**ng-hub-ui-sortable**](https://www.npmjs.com/package/ng-hub-ui-sortable)
- [**ng-hub-ui-stepper**](https://www.npmjs.com/package/ng-hub-ui-stepper)
- [**ng-hub-ui-toast**](https://www.npmjs.com/package/ng-hub-ui-toast)
- [**ng-hub-ui-utils**](https://www.npmjs.com/package/ng-hub-ui-utils)

## 📋 Table of Contents

- [Description](#description)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Changelog](#changelog)
- [Contribution](#contribution)
- [Support](#support)
- [License](#license)

## Description

`ng-hub-ui-history` is a signal-based history store for Angular applications. It tracks the
state of any number of objects independently, each keyed by a configurable identifier, and
exposes a fully reactive `states` signal that always reflects the current snapshot of every
tracked object.

The store is Angular-only: it is built on `signal`/`computed` from `@angular/core`, and
`watchForm` takes a `FormGroup` from `@angular/forms`. Both are declared as peer
dependencies, so it cannot be dropped into a non-Angular project.

Instead of storing full snapshots per change, the store records compact forward/backward
diff patches, which keeps memory usage low while supporting linear undo/redo navigation.
Retention is bounded by both a maximum number of entries and an approximate memory budget.
The store also provides transactions to collapse many updates into a single history entry
and a `watchForm` helper that auto-commits Angular Reactive Forms value changes.

This library ships no visual components — it is a pure logic/store package, so there is no
CSS-variables section.

## Features

- Multi-object tracking by configurable key type.
- Efficient history entries using diff patches instead of full snapshots.
- Undo/redo with linear timeline behavior.
- Redo invalidation when new manual commits happen after undo.
- Retention controls by number of entries and approximate memory bytes.
- Transaction support to group many updates into a single history entry.
- Optional custom diff/patch strategies.
- Automatic Reactive Forms integration via `watchForm`.
- Reactive `states` signal exposing the current snapshot of every tracked object.

## Installation

```bash
npm install ng-hub-ui-history
```

**Peer dependencies:** `@angular/common`, `@angular/core`, `@angular/forms` (`>=18.0.0`) and `rxjs` (`>=7.5.0`).

## Quick Start

```ts
import { createHistoryStore } from 'ng-hub-ui-history';

interface Note {
  id: string;
  name: string;
}

const store = createHistoryStore<Note, string>({
  maxEntries: 100,
  maxBytes: 250_000,
  keySelector: (state) => state.id
});

// Register an object to start tracking its history.
store.registerObject('a-1', { id: 'a-1', name: 'Initial' });

// Commit a new state. Returns false when the state is unchanged — unless a
// transaction is open, where it always returns true and records nothing yet.
store.commit('a-1', { id: 'a-1', name: 'Edited' }, { label: 'Rename' });

// Navigate the timeline.
store.undo('a-1'); // -> { id: 'a-1', name: 'Initial' }
store.redo('a-1'); // -> { id: 'a-1', name: 'Edited' }

// Read the current state at any time.
const current = store.getState('a-1');

// React to changes via the signal.
const all = store.states(); // Map<string, Note>
```

### Transactions

```ts
store.beginTransaction('a-1', 'Bulk edit');
store.commit('a-1', { id: 'a-1', name: 'Step 1' });
store.commit('a-1', { id: 'a-1', name: 'Step 2' });
store.endTransaction('a-1'); // Stored as a single history entry.
```

### Watching a Reactive Form

```ts
const form = new FormGroup({ name: new FormControl('Initial') });
store.registerObject('form-1', form.value as Note);

// Auto-commit every value change; returns an unsubscribe function.
const stop = store.watchForm('form-1', form, { skipInitial: true, label: 'Form edit' });

// Later, stop tracking.
stop();
```

## API Reference

### `createHistoryStore<T, K>(config?)`

Creates a history store instance. `T` is the tracked object type and `K` is the key type
(defaults to `string | number`).

**`HistoryStoreConfig<T, K>`**

| Option        | Type                                                          | Default   | Description                                          |
| ------------- | ------------------------------------------------------------- | --------- | ---------------------------------------------------- |
| `maxEntries`  | `number`                                                      | `100`     | Maximum number of entries per object history.        |
| `maxBytes`    | `number`                                                      | `512000`  | Maximum approximate bytes per object history.        |
| `keySelector` | `(state: T) => K`                                             | —         | Key resolver used by the `*FromObject` helpers.      |
| `diff`        | `(previous: T, next: T) => HistoryPatchOperation[]`           | built-in  | Optional custom diff strategy.                       |
| `patch`       | `(current: T, operations: HistoryPatchOperation[]) => T`      | built-in  | Optional custom patch strategy.                      |

### Store API (`HistoryStore<T, K>`)

| Member                                  | Returns               | Description                                                                 |
| --------------------------------------- | --------------------- | --------------------------------------------------------------------------- |
| `states`                                | `Signal<Map<K, T>>`   | Reactive dictionary of current states keyed by object id.                   |
| `registerObject(id, initialState)`      | `void`                | Registers a tracked object and starts a fresh timeline.                     |
| `registerFromObject(initialState)`      | `K`                   | Registers using the configured `keySelector`; returns the resolved id.      |
| `commit(id, newState, options?)`        | `boolean`             | Commits a new snapshot. Returns `false` when nothing changed; inside an open transaction it only updates the current state and returns `true`. |
| `commitFromObject(newState, options?)`  | `boolean`             | Commits using the configured `keySelector`.                                 |
| `undo(id)`                              | `boolean`             | Reverts one step. Returns `false` at the timeline base.                     |
| `redo(id)`                              | `boolean`             | Re-applies one step. Returns `false` when no redo entry exists.             |
| `canUndo(id)`                           | `boolean`             | Whether undo is currently possible.                                         |
| `canRedo(id)`                           | `boolean`             | Whether redo is currently possible.                                         |
| `getState(id)`                          | `T \| undefined`      | Current immutable state, or `undefined` when not registered.                |
| `history(id)`                           | `HistoryMetadata`     | Readonly metadata (pointer, length, bytes, per-entry info).                 |
| `beginTransaction(id, label?)`          | `void`                | Starts a transaction that merges subsequent commits into one entry.         |
| `endTransaction(id)`                    | `boolean`             | Ends the transaction, storing a single consolidated entry.                  |
| `watchForm(id, form, options?)`         | `() => void`          | Auto-commits Reactive Form value changes; returns an unsubscribe function.  |
| `clearHistory(id)`                      | `void`                | Clears all entries and keeps the current state as the new base.             |

### `HistoryCommitOptions`

| Property | Type     | Description                                       |
| -------- | -------- | ------------------------------------------------- |
| `label`  | `string` | Optional label stored in history metadata and UI. |

### `WatchFormOptions`

| Property      | Type      | Description                                          |
| ------------- | --------- | ---------------------------------------------------- |
| `label`       | `string`  | Optional label used for each automatic commit.       |
| `skipInitial` | `boolean` | Whether to ignore the first value emission.          |

### `HistoryMetadata`

| Property  | Type                                                          | Description                                        |
| --------- | ------------------------------------------------------------- | -------------------------------------------------- |
| `pointer` | `number`                                                      | Current pointer; `-1` means the base snapshot.     |
| `length`  | `number`                                                      | Total entries retained in memory.                  |
| `bytes`   | `number`                                                      | Accumulated approximate bytes retained.            |
| `entries` | `Array<Pick<HistoryEntry, 'label' \| 'timestamp' \| 'bytes'>>` | Human-readable per-entry metadata.                 |

Additional exported types: `HistoryEntry`, `HistoryPatchOperation`.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full release history.

## Contribution

We welcome all contributions! Here's how you can help:

### Getting Started

```bash
# Clone the repository
git clone https://github.com/hub-env/ng-hub-ui-history.git
cd ng-hub-ui-history

# Install dependencies
npm install

# Run tests
npm run test
```

### Contributing Guidelines

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Add tests** for your changes
4. **Ensure** all tests pass: `npm run test`
5. **Commit** your changes: `git commit -m 'Add amazing feature'`
6. **Push** to your branch: `git push origin feature/amazing-feature`
7. **Submit** a pull request

### Reporting Issues

When reporting bugs, please include:

- Angular version
- Steps to reproduce
- Expected vs actual behavior
- Minimal reproduction example (StackBlitz preferred)

## Support

Do you like this library? You can support us by buying us a coffee ☕:
[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/carlosmorcillo)

- Hub UI docs: https://hubui.dev/en/history/overview/
- Live examples: https://hubui.dev/en/history/examples/

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

MIT © ng-hub-ui contributors
