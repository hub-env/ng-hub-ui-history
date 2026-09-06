import { HistoryPatchOperation } from './history-types';

/**
 * Creates a deep clone using structuredClone when available.
 */
export function cloneDeep<T>(value: T): T {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}

	return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Estimates memory usage using serialized JSON length.
 */
export function estimateBytes(value: unknown): number {
	return JSON.stringify(value).length;
}

/**
 * Creates default diff patch operations from previous and next values.
 */
export function createDefaultDiff(previous: unknown, next: unknown): HistoryPatchOperation[] {
	const operations: HistoryPatchOperation[] = [];
	diffRecursive(previous, next, [], operations);
	return operations;
}

/**
 * Applies default patch operations over the current value.
 */
export function applyDefaultPatch<T>(current: T, operations: HistoryPatchOperation[]): T {
	const draft = cloneDeep(current) as unknown;

	for (const operation of operations) {
		if (operation.path.length === 0) {
			if (operation.op === 'remove') {
				return undefined as T;
			}
			return cloneDeep(operation.value) as T;
		}

		const parentPath = operation.path.slice(0, -1);
		const key = operation.path[operation.path.length - 1];
		const parent = ensureParentContainer(draft, parentPath, key);

		if (Array.isArray(parent)) {
			const index = Number(key);
			if (operation.op === 'remove') {
				if (index >= 0 && index < parent.length) {
					parent.splice(index, 1);
				}
			} else {
				parent[index] = cloneDeep(operation.value);
			}
			continue;
		}

		if (operation.op === 'remove') {
			delete (parent as Record<string, unknown>)[String(key)];
		} else {
			(parent as Record<string, unknown>)[String(key)] = cloneDeep(operation.value);
		}
	}

	return draft as T;
}

/**
 * Performs recursive structural diff across primitives, arrays and objects.
 */
function diffRecursive(
	previous: unknown,
	next: unknown,
	path: Array<string | number>,
	operations: HistoryPatchOperation[]
): void {
	if (Object.is(previous, next)) {
		return;
	}

	if (!isObjectLike(previous) || !isObjectLike(next)) {
		operations.push({ op: 'set', path, value: cloneDeep(next) });
		return;
	}

	if (Array.isArray(previous) && Array.isArray(next)) {
		diffArrays(previous, next, path, operations);
		return;
	}

	if (Array.isArray(previous) || Array.isArray(next)) {
		operations.push({ op: 'set', path, value: cloneDeep(next) });
		return;
	}

	if (!isPlainObject(previous) || !isPlainObject(next)) {
		if (!areOpaqueValuesEqual(previous, next)) {
			operations.push({ op: 'set', path, value: cloneDeep(next) });
		}
		return;
	}

	diffObjects(previous as Record<string, unknown>, next as Record<string, unknown>, path, operations);
}

/**
 * Diffs arrays index by index and trims removed tail items.
 */
function diffArrays(
	previous: unknown[],
	next: unknown[],
	path: Array<string | number>,
	operations: HistoryPatchOperation[]
): void {
	const commonLength = Math.min(previous.length, next.length);

	for (let index = 0; index < commonLength; index += 1) {
		diffRecursive(previous[index], next[index], [...path, index], operations);
	}

	if (next.length > previous.length) {
		for (let index = previous.length; index < next.length; index += 1) {
			operations.push({ op: 'set', path: [...path, index], value: cloneDeep(next[index]) });
		}
	}

	if (previous.length > next.length) {
		for (let index = previous.length - 1; index >= next.length; index -= 1) {
			operations.push({ op: 'remove', path: [...path, index] });
		}
	}
}

/**
 * Diffs plain objects by checking added, removed and updated keys.
 */
function diffObjects(
	previous: Record<string, unknown>,
	next: Record<string, unknown>,
	path: Array<string | number>,
	operations: HistoryPatchOperation[]
): void {
	const previousKeys = new Set(Object.keys(previous));
	const nextKeys = new Set(Object.keys(next));

	for (const key of previousKeys) {
		if (!nextKeys.has(key)) {
			operations.push({ op: 'remove', path: [...path, key] });
		}
	}

	for (const key of nextKeys) {
		if (!previousKeys.has(key)) {
			operations.push({ op: 'set', path: [...path, key], value: cloneDeep(next[key]) });
			continue;
		}

		diffRecursive(previous[key], next[key], [...path, key], operations);
	}
}

/**
 * Checks if value is an object-like structure.
 */
function isObjectLike(value: unknown): value is Record<string, unknown> | unknown[] {
	return value !== null && typeof value === 'object';
}

/**
 * Checks whether a value can be diffed key by key.
 *
 * Anything else — Date, Map, Set, RegExp, typed arrays, class instances — keeps its payload
 * outside its own enumerable keys, so walking it reports no difference at all and the change
 * is silently dropped. Those are compared and replaced as a whole value instead.
 */
function isPlainObject(value: object): boolean {
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

/**
 * Compares two values the diff handles as opaque, so an instance rebuilt with the same content
 * (a fresh Date for the same instant, a Set re-created from the same members) is not recorded as
 * a change and does not leave a history entry that undoes nothing.
 *
 * Unknown shapes fall back to `false`: reporting a change that did not happen only costs an
 * entry, while missing one loses the consumer's data.
 */
function areOpaqueValuesEqual(previous: object, next: object): boolean {
	if (Object.getPrototypeOf(previous) !== Object.getPrototypeOf(next)) {
		return false;
	}

	if (previous instanceof Date) {
		return Object.is(previous.getTime(), (next as Date).getTime());
	}

	if (previous instanceof RegExp) {
		return previous.source === (next as RegExp).source && previous.flags === (next as RegExp).flags;
	}

	if (previous instanceof Set) {
		const nextSet = next as Set<unknown>;
		return previous.size === nextSet.size && [...previous].every((item) => nextSet.has(item));
	}

	if (previous instanceof Map) {
		const nextMap = next as Map<unknown, unknown>;
		return (
			previous.size === nextMap.size &&
			[...previous].every(([key, value]) => nextMap.has(key) && Object.is(nextMap.get(key), value))
		);
	}

	return false;
}

/**
 * Ensures parent container exists for a patch target path.
 */
function ensureParentContainer(
	root: unknown,
	parentPath: Array<string | number>,
	nextKey: string | number
): Record<string, unknown> | unknown[] {
	let current = root as Record<string, unknown> | unknown[];

	for (let index = 0; index < parentPath.length; index += 1) {
		const key = parentPath[index];
		const nextPathKey = parentPath[index + 1] ?? nextKey;
		const isArrayKey = typeof nextPathKey === 'number' || /^\d+$/.test(String(nextPathKey));

		if (Array.isArray(current)) {
			const arrayIndex = Number(key);
			if (current[arrayIndex] === undefined || current[arrayIndex] === null) {
				current[arrayIndex] = isArrayKey ? [] : {};
			}
			current = current[arrayIndex] as Record<string, unknown> | unknown[];
			continue;
		}

		const stringKey = String(key);
		if (
			(current as Record<string, unknown>)[stringKey] === undefined ||
			(current as Record<string, unknown>)[stringKey] === null
		) {
			(current as Record<string, unknown>)[stringKey] = isArrayKey ? [] : {};
		}
		current = (current as Record<string, unknown>)[stringKey] as Record<string, unknown> | unknown[];
	}

	return current;
}
