import { Signal } from '@angular/core';
import { FormGroup } from '@angular/forms';

/**
 * Represents an operation in a diff patch.
 */
export interface HistoryPatchOperation {
	/** Operation kind: set a value or remove a value at path. */
	op: 'set' | 'remove';
	/** Path represented as object keys/array indexes. */
	path: Array<string | number>;
	/** Value to write when op is set. */
	value?: unknown;
}

/**
 * Defines a single history entry with forward and backward patches.
 */
export interface HistoryEntry {
	/** Optional label set by caller for UX and debugging. */
	label?: string;
	/** Unix epoch in milliseconds for entry creation. */
	timestamp: number;
	/** Patch that moves from previous state to next state. */
	forward: HistoryPatchOperation[];
	/** Patch that moves from next state back to previous state. */
	backward: HistoryPatchOperation[];
	/** Approximate memory footprint used for retention rules. */
	bytes: number;
}

/**
 * Provides optional metadata for commit operations.
 */
export interface HistoryCommitOptions {
	/** Optional label used in history metadata and UI. */
	label?: string;
}

/**
 * Configures how object keys are obtained and how memory limits are enforced.
 */
export interface HistoryStoreConfig<T, K> {
	/** Maximum number of entries per object history. */
	maxEntries?: number;
	/** Maximum approximate bytes per object history. */
	maxBytes?: number;
	/** Optional custom key resolver for object-driven helpers. */
	keySelector?: (state: T) => K;
	/** Optional custom diff strategy provided by consumers. */
	diff?: (previous: T, next: T) => HistoryPatchOperation[];
	/** Optional custom patch strategy provided by consumers. */
	patch?: (current: T, operations: HistoryPatchOperation[]) => T;
}

/**
 * Exposes readonly metadata for history introspection.
 */
export interface HistoryMetadata {
	/** Current pointer where -1 means base snapshot with no entry applied. */
	pointer: number;
	/** Total entries retained in memory. */
	length: number;
	/** Accumulated approximate bytes retained in memory. */
	bytes: number;
	/** Human-readable entries metadata. */
	entries: Array<Pick<HistoryEntry, 'label' | 'timestamp' | 'bytes'>>;
}

/**
 * Defines options for automatic form watching.
 */
export interface WatchFormOptions {
	/** Optional label used for each automatic commit. */
	label?: string;
	/** Whether to ignore the first value emission from form changes. */
	skipInitial?: boolean;
}

/**
 * Represents the public API of the history store.
 */
export interface HistoryStore<T, K> {
	/** Reactive dictionary of current states keyed by object id. */
	readonly states: Signal<Map<K, T>>;
	/** Registers a new tracked object with its initial state. */
	registerObject(id: K, initialState: T): void;
	/** Registers using a configured key selector. */
	registerFromObject(initialState: T): K;
	/** Commits a new state snapshot for an existing object id. */
	commit(id: K, newState: T, options?: HistoryCommitOptions): boolean;
	/** Commits using configured key selector. */
	commitFromObject(newState: T, options?: HistoryCommitOptions): boolean;
	/** Reverts one step back for the selected object id. */
	undo(id: K): boolean;
	/** Re-applies one step forward when redo history still exists. */
	redo(id: K): boolean;
	/** Returns whether undo is currently possible for object id. */
	canUndo(id: K): boolean;
	/** Returns whether redo is currently possible for object id. */
	canRedo(id: K): boolean;
	/** Returns current immutable state for object id. */
	getState(id: K): T | undefined;
	/** Returns readonly metadata for object history. */
	history(id: K): HistoryMetadata;
	/** Begins a transaction that merges multiple commits into one entry. */
	beginTransaction(id: K, label?: string): void;
	/** Ends an open transaction and stores a single consolidated entry. */
	endTransaction(id: K): boolean;
	/** Watches a reactive form and auto-commits value changes for the object id. */
	watchForm(id: K, form: FormGroup, options?: WatchFormOptions): () => void;
	/** Clears all history entries for a given object and keeps current state as base. */
	clearHistory(id: K): void;
}
