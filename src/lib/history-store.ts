import { computed, Signal, signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
	HistoryCommitOptions,
	HistoryEntry,
	HistoryMetadata,
	HistoryPatchOperation,
	HistoryStore,
	HistoryStoreConfig,
	WatchFormOptions
} from './history-types';
import { applyDefaultPatch, cloneDeep, createDefaultDiff, estimateBytes } from './history-utils';

/**
 * Defines internal state for a tracked object.
 */
interface TrackedObjectState<T> {
	/** Current object state used as source for next commit. */
	currentState: T;
	/** Ordered linear history list for undo/redo navigation. */
	entries: HistoryEntry[];
	/** Current pointer in entries where -1 means base snapshot. */
	pointer: number;
	/** Cached bytes for quick memory checks. */
	bytes: number;
	/** Active transaction data when transaction mode is enabled. */
	transaction: { startState: T; label?: string } | null;
}

/**
 * Creates a signal-based history store for multiple tracked objects.
 */
export function createHistoryStore<T, K = string | number>(config: HistoryStoreConfig<T, K> = {}): HistoryStore<T, K> {
	const tracked = signal<Map<K, TrackedObjectState<T>>>(new Map());
	const states = computed<Map<K, T>>(() => {
		const map = new Map<K, T>();
		for (const [id, state] of tracked().entries()) {
			map.set(id, cloneDeep(state.currentState));
		}
		return map;
	});

	const diff = config.diff ?? ((previous: T, next: T) => createDefaultDiff(previous, next));
	const patch = config.patch ?? ((current: T, operations: HistoryPatchOperation[]) => applyDefaultPatch(current, operations));
	const maxEntries = config.maxEntries ?? 100;
	const maxBytes = config.maxBytes ?? 512_000;

	/**
	 * Returns tracked state by id or throws for invalid registration.
	 */
	function requireTrackedState(id: K): TrackedObjectState<T> {
		const state = tracked().get(id);
		if (!state) {
			throw new Error(`History object with id '${String(id)}' is not registered.`);
		}
		return state;
	}

	/**
	 * Applies immutable update to a tracked id and emits a new map instance.
	 */
	function mutateTracked(id: K, updater: (state: TrackedObjectState<T>) => TrackedObjectState<T>): void {
		const currentMap = tracked();
		const currentState = requireTrackedState(id);
		const nextMap = new Map(currentMap);
		nextMap.set(id, updater(currentState));
		tracked.set(nextMap);
	}

	/**
	 * Creates a history entry from two snapshots and optional label.
	 */
	function createHistoryEntry(previous: T, next: T, options?: HistoryCommitOptions): HistoryEntry | null {
		const forward = diff(previous, next);
		if (forward.length === 0) {
			return null;
		}

		const backward = diff(next, previous);
		return {
			label: options?.label,
			timestamp: Date.now(),
			forward,
			backward,
			bytes: estimateBytes({ forward, backward, label: options?.label })
		};
	}

	/**
	 * Ensures retention limits are respected by removing oldest entries first.
	 */
	function enforceLimits(state: TrackedObjectState<T>): TrackedObjectState<T> {
		const nextEntries = [...state.entries];
		let nextPointer = state.pointer;
		let nextBytes = state.bytes;

		while (nextEntries.length > maxEntries || nextBytes > maxBytes) {
			if (nextEntries.length === 0) {
				break;
			}
			const removed = nextEntries.shift()!;
			nextBytes -= removed.bytes;
			nextPointer -= 1;
		}

		if (nextPointer < -1) {
			nextPointer = -1;
		}

		return {
			...state,
			entries: nextEntries,
			pointer: nextPointer,
			bytes: Math.max(nextBytes, 0)
		};
	}

	/**
	 * Registers an object and starts a fresh history timeline.
	 */
	function registerObject(id: K, initialState: T): void {
		const nextMap = new Map(tracked());
		nextMap.set(id, {
			currentState: cloneDeep(initialState),
			entries: [],
			pointer: -1,
			bytes: 0,
			transaction: null
		});
		tracked.set(nextMap);
	}

	/**
	 * Registers using the configured key selector.
	 */
	function registerFromObject(initialState: T): K {
		if (!config.keySelector) {
			throw new Error('keySelector is required to use registerFromObject.');
		}
		const id = config.keySelector(initialState);
		registerObject(id, initialState);
		return id;
	}

	/**
	 * Commits a new state. Redo timeline is invalidated after pointer when needed.
	 */
	function commit(id: K, newState: T, options?: HistoryCommitOptions): boolean {
		const currentTracked = requireTrackedState(id);
		const nextSnapshot = cloneDeep(newState);

		if (currentTracked.transaction) {
			mutateTracked(id, (state) => ({
				...state,
				currentState: nextSnapshot
			}));
			return true;
		}

		const entry = createHistoryEntry(currentTracked.currentState, nextSnapshot, options);
		if (!entry) {
			return false;
		}

		mutateTracked(id, (state) => {
			const effectiveEntries = state.entries.slice(0, state.pointer + 1);
			const effectiveBytes = effectiveEntries.reduce((total, item) => total + item.bytes, 0);
			const entries = [...effectiveEntries, entry];
			const updated: TrackedObjectState<T> = {
				...state,
				currentState: nextSnapshot,
				entries,
				pointer: entries.length - 1,
				bytes: effectiveBytes + entry.bytes
			};

			return enforceLimits(updated);
		});

		return true;
	}

	/**
	 * Commits using configured key selector.
	 */
	function commitFromObject(newState: T, options?: HistoryCommitOptions): boolean {
		if (!config.keySelector) {
			throw new Error('keySelector is required to use commitFromObject.');
		}
		return commit(config.keySelector(newState), newState, options);
	}

	/**
	 * Reverts one history step by applying backward patch.
	 */
	function undo(id: K): boolean {
		const currentTracked = requireTrackedState(id);
		if (currentTracked.pointer < 0) {
			return false;
		}

		mutateTracked(id, (state) => {
			const entry = state.entries[state.pointer];
			const previousState = patch(state.currentState, entry.backward);
			return {
				...state,
				currentState: cloneDeep(previousState),
				pointer: state.pointer - 1
			};
		});

		return true;
	}

	/**
	 * Re-applies one history step by applying forward patch.
	 */
	function redo(id: K): boolean {
		const currentTracked = requireTrackedState(id);
		if (currentTracked.pointer >= currentTracked.entries.length - 1) {
			return false;
		}

		mutateTracked(id, (state) => {
			const entry = state.entries[state.pointer + 1];
			const nextState = patch(state.currentState, entry.forward);
			return {
				...state,
				currentState: cloneDeep(nextState),
				pointer: state.pointer + 1
			};
		});

		return true;
	}

	/**
	 * Returns true when object has available undo entries.
	 */
	function canUndo(id: K): boolean {
		return requireTrackedState(id).pointer >= 0;
	}

	/**
	 * Returns true when object has available redo entries.
	 */
	function canRedo(id: K): boolean {
		const state = requireTrackedState(id);
		return state.pointer < state.entries.length - 1;
	}

	/**
	 * Gets the current immutable object state.
	 */
	function getState(id: K): T | undefined {
		const state = tracked().get(id);
		return state ? cloneDeep(state.currentState) : undefined;
	}

	/**
	 * Returns readonly metadata for debugging and UI.
	 */
	function history(id: K): HistoryMetadata {
		const state = requireTrackedState(id);
		return {
			pointer: state.pointer,
			length: state.entries.length,
			bytes: state.bytes,
			entries: state.entries.map((entry) => ({
				label: entry.label,
				timestamp: entry.timestamp,
				bytes: entry.bytes
			}))
		};
	}

	/**
	 * Starts a transaction to collapse many commits into one history entry.
	 */
	function beginTransaction(id: K, label?: string): void {
		mutateTracked(id, (state) => {
			if (state.transaction) {
				throw new Error(`Transaction already started for id '${String(id)}'.`);
			}
			return {
				...state,
				transaction: {
					startState: cloneDeep(state.currentState),
					label
				}
			};
		});
	}

	/**
	 * Ends an open transaction by committing a single consolidated patch.
	 */
	function endTransaction(id: K): boolean {
		const state = requireTrackedState(id);
		if (!state.transaction) {
			return false;
		}

		let committed = false;
		mutateTracked(id, (currentState) => {
			if (!currentState.transaction) {
				return currentState;
			}

			const { startState, label } = currentState.transaction;
			const entry = createHistoryEntry(startState, currentState.currentState, { label });
			if (!entry) {
				return {
					...currentState,
					transaction: null
				};
			}

			const effectiveEntries = currentState.entries.slice(0, currentState.pointer + 1);
			const effectiveBytes = effectiveEntries.reduce((total, item) => total + item.bytes, 0);
			const entries = [...effectiveEntries, entry];
			committed = true;

			return enforceLimits({
				...currentState,
				entries,
				pointer: entries.length - 1,
				bytes: effectiveBytes + entry.bytes,
				transaction: null
			});
		});

		return committed;
	}

	/**
	 * Watches form value changes and automatically commits updates.
	 */
	function watchForm(id: K, form: FormGroup, options?: WatchFormOptions): () => void {
		let isFirstEmission = true;
		const subscription: Subscription = form.valueChanges.subscribe((value) => {
			if (isFirstEmission && options?.skipInitial === true) {
				isFirstEmission = false;
				return;
			}
			isFirstEmission = false;
			commit(id, value as T, { label: options?.label });
		});

		return () => {
			subscription.unsubscribe();
		};
	}

	/**
	 * Clears history entries and keeps current state as base.
	 */
	function clearHistory(id: K): void {
		mutateTracked(id, (state) => ({
			...state,
			entries: [],
			pointer: -1,
			bytes: 0,
			transaction: null
		}));
	}

	return {
		states: states as Signal<Map<K, T>>,
		registerObject,
		registerFromObject,
		commit,
		commitFromObject,
		undo,
		redo,
		canUndo,
		canRedo,
		getState,
		history,
		beginTransaction,
		endTransaction,
		watchForm,
		clearHistory
	};
}
