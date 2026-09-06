# Functionalities of History Library

This table details the functionalities of the `ng-hub-ui-history` library and indicates which ones are covered by interactive examples.

The package ships no component and no directive: its whole surface is the `createHistoryStore` factory, the store object it returns, and the types around them.

## Factory and configuration

| Category | Functionality | Example Covered |
| :--- | :--- | :---: |
| **Factory** | `createHistoryStore<T, K>(config?)` | ✅ |
| **Retention** | `maxEntries` (default `100`) | ✅ |
| | `maxBytes` (default `512000`) | ✅ |
| | Oldest entries dropped first when a limit is passed | ✅ |
| **Keying** | `keySelector` resolver | ❌ |
| **Strategies** | Custom `diff` strategy | ❌ |
| | Custom `patch` strategy | ❌ |

## Store API (`HistoryStore<T, K>`)

| Category | Functionality | Example Covered |
| :--- | :--- | :---: |
| **State** | `states` signal | ✅ |
| | `getState(id)` | ❌ |
| **Registration** | `registerObject(id, initialState)` | ✅ |
| | `registerFromObject(initialState)` | ❌ |
| **Commits** | `commit(id, newState, options?)` | ✅ |
| | `commitFromObject(newState, options?)` | ❌ |
| | `HistoryCommitOptions.label` | ✅ |
| | `false` returned when the state is unchanged | ❌ |
| **Timeline** | `undo(id)` | ✅ |
| | `redo(id)` | ✅ |
| | `canUndo(id)` / `canRedo(id)` | ✅ |
| | Redo entries discarded by a new commit | ❌ |
| | `clearHistory(id)` | ❌ |
| **Introspection** | `history(id)` metadata (pointer, length, bytes) | ✅ |
| | Per-entry `label`, `timestamp` and `bytes` | ✅ |
| **Transactions** | `beginTransaction(id, label?)` | ✅ |
| | `endTransaction(id)` | ✅ |
| | Commits inside a transaction leave no entry of their own | ✅ |
| **Reactive Forms** | `watchForm(id, form, options?)` | ✅ |
| | `WatchFormOptions.label` | ✅ |
| | `WatchFormOptions.skipInitial` | ❌ |
| | Returned unsubscribe callback | ✅ |

## Diffing semantics

| Category | Functionality | Example Covered |
| :--- | :--- | :---: |
| **Shapes** | Nested objects | ✅ |
| | Array append | ✅ |
| | Array removal and reordering | ❌ |
| | Key deletion and `null` transitions | ❌ |
| | `Date`, `Set`, `Map` and `RegExp` replaced as a whole | ❌ |

## Exported types

| Category | Functionality | Example Covered |
| :--- | :--- | :---: |
| **Types** | `HistoryStore` | ✅ |
| | `HistoryStoreConfig` | ✅ |
| | `HistoryCommitOptions` | ✅ |
| | `WatchFormOptions` | ✅ |
| | `HistoryMetadata` | ✅ |
| | `HistoryEntry` | ❌ |
| | `HistoryPatchOperation` | ❌ |

---

_Note: ✅ indicates an active interactive example or playground control is available in the documentation. ❌ indicates functionality exists but is only shown as a code snippet, or not shown at all._
