import { HistoryPatchOperation } from './history-types';
import { applyDefaultPatch, cloneDeep, createDefaultDiff, estimateBytes } from './history-utils';

/**
 * Asserts that applying the default diff between two values reproduces the target value.
 *
 * @param previous Source value.
 * @param next Target value.
 */
function expectRoundTrip(previous: unknown, next: unknown): void {
	const forward = createDefaultDiff(previous, next);
	expect(applyDefaultPatch(previous, forward)).toEqual(next);

	const backward = createDefaultDiff(next, previous);
	expect(applyDefaultPatch(next, backward)).toEqual(previous);
}

describe('cloneDeep', () => {
	it('returns primitives, null and undefined unchanged', () => {
		expect(cloneDeep(42)).toBe(42);
		expect(cloneDeep('text')).toBe('text');
		expect(cloneDeep(true)).toBe(true);
		expect(cloneDeep(null)).toBeNull();
		expect(cloneDeep(undefined)).toBeUndefined();
	});

	it('deep clones nested objects without sharing references', () => {
		const source = { user: { name: 'Alice', meta: { tags: ['admin'] } } };
		const clone = cloneDeep(source);

		expect(clone).toEqual(source);
		expect(clone).not.toBe(source);
		expect(clone.user).not.toBe(source.user);
		expect(clone.user.meta).not.toBe(source.user.meta);
		expect(clone.user.meta.tags).not.toBe(source.user.meta.tags);
	});

	it('deep clones arrays of objects', () => {
		const source = [{ id: 1 }, { id: 2, nested: [3, 4] }];
		const clone = cloneDeep(source);

		expect(clone).toEqual(source);
		expect(clone[0]).not.toBe(source[0]);
		expect(clone[1].nested).not.toBe(source[1].nested);
	});

	it('preserves Date instances', () => {
		const source = { createdAt: new Date('2026-07-28T10:00:00.000Z') };
		const clone = cloneDeep(source);

		expect(clone.createdAt).toBeInstanceOf(Date);
		expect(clone.createdAt.getTime()).toBe(source.createdAt.getTime());
		expect(clone.createdAt).not.toBe(source.createdAt);
	});

	it('isolates mutations between the source and the clone', () => {
		const source = { name: 'Alice', tags: ['admin'] };
		const clone = cloneDeep(source);

		clone.name = 'Bob';
		clone.tags.push('editor');
		expect(source.name).toBe('Alice');
		expect(source.tags).toEqual(['admin']);

		source.tags.push('owner');
		expect(clone.tags).toEqual(['admin', 'editor']);
	});
});

describe('estimateBytes', () => {
	it('matches the serialized JSON length of known values', () => {
		expect(estimateBytes({})).toBe(2);
		expect(estimateBytes([])).toBe(2);
		expect(estimateBytes('abc')).toBe(5);
		expect(estimateBytes(123)).toBe(3);
		expect(estimateBytes({ a: 1 })).toBe(7);
	});

	it('grows with the amount of content', () => {
		const small = estimateBytes({ rows: [1] });
		const large = estimateBytes({ rows: Array.from({ length: 100 }, (_, index) => index) });

		expect(large).toBeGreaterThan(small);
	});
});

describe('createDefaultDiff', () => {
	it('returns an empty diff for identical values', () => {
		expect(createDefaultDiff(1, 1)).toEqual([]);
		expect(createDefaultDiff('a', 'a')).toEqual([]);
		expect(createDefaultDiff({ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] })).toEqual([]);
		expect(createDefaultDiff({}, {})).toEqual([]);
	});

	it('produces a scoped set operation for a primitive property change', () => {
		expect(createDefaultDiff({ a: 1, b: 2 }, { a: 1, b: 3 })).toEqual([{ op: 'set', path: ['b'], value: 3 }]);
	});

	it('produces set and remove operations for added and deleted keys', () => {
		const operations = createDefaultDiff({ removed: 1, kept: 2 }, { kept: 2, added: 3 });

		expect(operations).toContainEqual({ op: 'remove', path: ['removed'] });
		expect(operations).toContainEqual({ op: 'set', path: ['added'], value: 3 });
		expect(operations).toHaveLength(2);
	});

	it('produces deep paths for nested changes', () => {
		const operations = createDefaultDiff({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } });

		expect(operations).toEqual([{ op: 'set', path: ['a', 'b', 'c'], value: 2 }]);
	});

	it('produces indexed operations for array growth and trims removals from the tail', () => {
		expect(createDefaultDiff({ items: [1] }, { items: [1, 2, 3] })).toEqual([
			{ op: 'set', path: ['items', 1], value: 2 },
			{ op: 'set', path: ['items', 2], value: 3 }
		]);

		expect(createDefaultDiff({ items: [1, 2, 3] }, { items: [1] })).toEqual([
			{ op: 'remove', path: ['items', 2] },
			{ op: 'remove', path: ['items', 1] }
		]);
	});

	it('replaces the whole value when the container type changes', () => {
		expect(createDefaultDiff({ a: [1, 2] }, { a: { b: 1 } })).toEqual([{ op: 'set', path: ['a'], value: { b: 1 } }]);
		expect(createDefaultDiff({ a: { b: 1 } }, { a: [1, 2] })).toEqual([{ op: 'set', path: ['a'], value: [1, 2] }]);
		expect(createDefaultDiff({ a: 1 }, { a: { b: 1 } })).toEqual([{ op: 'set', path: ['a'], value: { b: 1 } }]);
	});

	it('produces a root-level set for primitive roots', () => {
		expect(createDefaultDiff(1, 2)).toEqual([{ op: 'set', path: [], value: 2 }]);
	});

	it('clones diffed values so later source mutations do not leak into operations', () => {
		const next = { a: { flag: true } };
		const operations = createDefaultDiff({}, next);

		next.a.flag = false;

		expect(operations).toEqual([{ op: 'set', path: ['a'], value: { flag: true } }]);
	});
});

describe('applyDefaultPatch', () => {
	it('does not mutate the input value', () => {
		const current = { name: 'Alice', tags: ['admin'] };
		const patched = applyDefaultPatch(current, [
			{ op: 'set', path: ['name'], value: 'Bob' },
			{ op: 'remove', path: ['tags', 0] }
		]);

		expect(patched).toEqual({ name: 'Bob', tags: [] });
		expect(current).toEqual({ name: 'Alice', tags: ['admin'] });
	});

	it('replaces or clears the whole value with root-level operations', () => {
		expect(applyDefaultPatch({ a: 1 }, [{ op: 'set', path: [], value: { b: 2 } }])).toEqual({ b: 2 });
		expect(applyDefaultPatch({ a: 1 }, [{ op: 'remove', path: [] }])).toBeUndefined();
	});

	it('ignores removals of missing keys and out-of-range indexes', () => {
		const operations: HistoryPatchOperation[] = [
			{ op: 'remove', path: ['missing'] },
			{ op: 'remove', path: ['items', 9] }
		];

		expect(applyDefaultPatch({ items: [1] }, operations)).toEqual({ items: [1] });
	});

	it('creates missing parent containers, using arrays for numeric keys', () => {
		const patched = applyDefaultPatch({} as Record<string, unknown>, [{ op: 'set', path: ['a', 'b', 0], value: 'x' }]);

		expect(patched).toEqual({ a: { b: ['x'] } });
		expect(Array.isArray((patched['a'] as Record<string, unknown>)['b'])).toBe(true);
	});
});

describe('diff/patch round-trips', () => {
	it('round-trips flat objects with primitive changes', () => {
		expectRoundTrip({ a: 1, b: 'x', c: true }, { a: 2, b: 'y', c: false });
	});

	it('round-trips nested object changes', () => {
		expectRoundTrip(
			{ user: { name: 'Alice', meta: { age: 30, active: true } } },
			{ user: { name: 'Alice Doe', meta: { age: 31, active: false } } }
		);
	});

	it('round-trips array appends', () => {
		expectRoundTrip({ items: [1, 2] }, { items: [1, 2, 3, 4] });
	});

	it('round-trips removals from the middle of an array', () => {
		expectRoundTrip({ items: [1, 2, 3, 4] }, { items: [1, 3] });
	});

	it('round-trips array reorders', () => {
		expectRoundTrip({ items: [1, 2, 3] }, { items: [3, 1, 2] });
	});

	it('round-trips inserts and removals in arrays of objects', () => {
		expectRoundTrip(
			{
				rows: [
					{ id: 1, label: 'one' },
					{ id: 2, label: 'two' }
				]
			},
			{
				rows: [
					{ id: 0, label: 'zero' },
					{ id: 1, label: 'one' },
					{ id: 2, label: 'two' }
				]
			}
		);
		expectRoundTrip({ rows: [{ id: 1 }, { id: 2 }, { id: 3 }] }, { rows: [{ id: 2 }] });
	});

	it('round-trips mixed key additions and deletions', () => {
		expectRoundTrip({ keep: 1, drop: { nested: true } }, { keep: 1, added: [1, 2], other: 'x' });
	});

	it('round-trips null transitions', () => {
		expectRoundTrip({ value: null }, { value: { populated: true } });
		expectRoundTrip({ value: 'text' }, { value: null });
	});

	it('round-trips deeply nested structures', () => {
		const buildNested = (leaf: number): Record<string, unknown> => {
			let current: Record<string, unknown> = { leaf };
			for (let level = 0; level < 10; level += 1) {
				current = { [`level${level}`]: current };
			}
			return current;
		};

		expectRoundTrip(buildNested(1), buildNested(2));
	});

	it('round-trips between empty and populated objects', () => {
		expectRoundTrip({}, { a: 1, b: { c: [1, 2, 3] } });
	});

	it('supports undo/redo semantics through sequential patches', () => {
		const stateA = { name: 'Alice', tags: ['admin'], meta: { age: 30 } };
		const stateB = { name: 'Bob', tags: ['admin', 'editor'], meta: { age: 31 } };

		const forward = createDefaultDiff(stateA, stateB);
		const backward = createDefaultDiff(stateB, stateA);

		const redone = applyDefaultPatch(stateA, forward);
		expect(redone).toEqual(stateB);

		const undone = applyDefaultPatch(redone, backward);
		expect(undone).toEqual(stateA);

		expect(applyDefaultPatch(undone, forward)).toEqual(stateB);
	});
});

describe('createDefaultDiff with non-plain objects', () => {
	it('replaces the whole value when a Date changes', () => {
		const operations = createDefaultDiff(
			{ dueAt: new Date('2026-01-01T00:00:00.000Z') },
			{ dueAt: new Date('2026-12-31T00:00:00.000Z') }
		);

		expect(operations).toEqual([{ op: 'set', path: ['dueAt'], value: new Date('2026-12-31T00:00:00.000Z') }]);
		expect((operations[0] as { value: Date }).value).toBeInstanceOf(Date);
	});

	it('keeps sibling changes scoped when a Date changes alongside a primitive', () => {
		const operations = createDefaultDiff(
			{ dueAt: new Date('2026-01-01T00:00:00.000Z'), revision: 1 },
			{ dueAt: new Date('2026-12-31T00:00:00.000Z'), revision: 2 }
		);

		expect(operations).toContainEqual({ op: 'set', path: ['dueAt'], value: new Date('2026-12-31T00:00:00.000Z') });
		expect(operations).toContainEqual({ op: 'set', path: ['revision'], value: 2 });
		expect(operations).toHaveLength(2);
	});

	it('replaces the whole value when a Set, a Map or a RegExp changes', () => {
		expect(createDefaultDiff({ tags: new Set(['a']) }, { tags: new Set(['a', 'b']) })).toEqual([
			{ op: 'set', path: ['tags'], value: new Set(['a', 'b']) }
		]);
		expect(createDefaultDiff({ byId: new Map([['a', 1]]) }, { byId: new Map([['a', 2]]) })).toEqual([
			{ op: 'set', path: ['byId'], value: new Map([['a', 2]]) }
		]);
		expect(createDefaultDiff({ pattern: /a/g }, { pattern: /b/g })).toEqual([
			{ op: 'set', path: ['pattern'], value: /b/g }
		]);
	});

	it('reports no change when two distinct instances hold the same value', () => {
		expect(
			createDefaultDiff({ dueAt: new Date('2026-01-01T00:00:00.000Z') }, { dueAt: new Date('2026-01-01T00:00:00.000Z') })
		).toEqual([]);
		expect(createDefaultDiff({ tags: new Set(['a', 'b']) }, { tags: new Set(['b', 'a']) })).toEqual([]);
		expect(
			createDefaultDiff(
				{
					byId: new Map([
						['a', 1],
						['b', 2]
					])
				},
				{
					byId: new Map([
						['b', 2],
						['a', 1]
					])
				}
			)
		).toEqual([]);
		expect(createDefaultDiff({ pattern: /a/g }, { pattern: /a/g })).toEqual([]);
	});

	it('replaces the whole value when a non-plain object takes the place of a plain one', () => {
		expect(createDefaultDiff({ at: { iso: 'x' } }, { at: new Date('2026-01-01T00:00:00.000Z') })).toEqual([
			{ op: 'set', path: ['at'], value: new Date('2026-01-01T00:00:00.000Z') }
		]);
		expect(createDefaultDiff({ at: new Date('2026-01-01T00:00:00.000Z') }, { at: { iso: 'x' } })).toEqual([
			{ op: 'set', path: ['at'], value: { iso: 'x' } }
		]);
	});

	it('round-trips Dates, Sets and Maps through diff and patch', () => {
		expectRoundTrip(
			{ dueAt: new Date('2026-01-01T00:00:00.000Z'), revision: 1 },
			{ dueAt: new Date('2026-12-31T00:00:00.000Z'), revision: 2 }
		);
		expectRoundTrip({ tags: new Set(['a']) }, { tags: new Set(['a', 'b']) });
		expectRoundTrip({ byId: new Map([['a', 1]]) }, { byId: new Map([['a', 2]]) });
		expectRoundTrip(
			{ milestones: [new Date('2026-01-01T00:00:00.000Z')] },
			{ milestones: [new Date('2026-02-01T00:00:00.000Z')] }
		);
	});
});
