import { FormControl, FormGroup } from '@angular/forms';
import { createHistoryStore } from './history-store';

interface DemoState {
	name: string;
	meta: {
		age: number;
		tags: string[];
	};
}

describe('HistoryStore', () => {
	it('should commit, undo and redo with nested state', () => {
		const store = createHistoryStore<DemoState, string>();
		store.registerObject('user-1', {
			name: 'Alice',
			meta: { age: 30, tags: ['admin'] }
		});

		store.commit('user-1', {
			name: 'Alice Doe',
			meta: { age: 31, tags: ['admin', 'editor'] }
		});

		expect(store.canUndo('user-1')).toBe(true);
		expect(store.getState('user-1')?.meta.age).toBe(31);

		store.undo('user-1');
		expect(store.getState('user-1')?.name).toBe('Alice');
		expect(store.canRedo('user-1')).toBe(true);

		store.redo('user-1');
		expect(store.getState('user-1')?.meta.tags).toEqual(['admin', 'editor']);
	});

	it('should clear redo branch after manual commit', () => {
		const store = createHistoryStore<DemoState, string>();
		store.registerObject('user-2', {
			name: 'Bob',
			meta: { age: 20, tags: [] }
		});

		store.commit('user-2', { name: 'Bob A', meta: { age: 21, tags: [] } });
		store.commit('user-2', { name: 'Bob B', meta: { age: 22, tags: [] } });
		store.undo('user-2');

		expect(store.canRedo('user-2')).toBe(true);

		store.commit('user-2', { name: 'Bob C', meta: { age: 23, tags: ['new'] } });
		expect(store.canRedo('user-2')).toBe(false);
		expect(store.history('user-2').length).toBe(2);
	});

	it('should merge commits in a transaction', () => {
		const store = createHistoryStore<DemoState, string>();
		store.registerObject('user-3', {
			name: 'Carol',
			meta: { age: 40, tags: [] }
		});

		store.beginTransaction('user-3', 'Batch update');
		store.commit('user-3', { name: 'Carol A', meta: { age: 41, tags: [] } });
		store.commit('user-3', { name: 'Carol B', meta: { age: 42, tags: ['team'] } });
		store.endTransaction('user-3');

		expect(store.history('user-3').length).toBe(1);
		expect(store.getState('user-3')?.name).toBe('Carol B');

		store.undo('user-3');
		expect(store.getState('user-3')?.name).toBe('Carol');
	});

	it('should respect maxEntries limit', () => {
		const store = createHistoryStore<DemoState, string>({ maxEntries: 2 });
		store.registerObject('user-4', {
			name: 'Dan',
			meta: { age: 10, tags: [] }
		});

		store.commit('user-4', { name: 'Dan 1', meta: { age: 11, tags: [] } });
		store.commit('user-4', { name: 'Dan 2', meta: { age: 12, tags: [] } });
		store.commit('user-4', { name: 'Dan 3', meta: { age: 13, tags: [] } });

		expect(store.history('user-4').length).toBe(2);
	});

	it('should watch reactive forms and auto-commit changes', () => {
		const store = createHistoryStore<DemoState, string>();
		store.registerObject('user-5', {
			name: 'Eve',
			meta: { age: 25, tags: [] }
		});

		const form = new FormGroup({
			name: new FormControl('Eve', { nonNullable: true }),
			meta: new FormGroup({
				age: new FormControl(25, { nonNullable: true }),
				tags: new FormControl<string[]>([], { nonNullable: true })
			})
		});

		const stop = store.watchForm('user-5', form, { label: 'Form update' });
		form.patchValue({ name: 'Eve Prime' });

		expect(store.history('user-5').length).toBe(1);
		expect(store.getState('user-5')?.name).toBe('Eve Prime');

		stop();
	});

	it('should keep independent undo/redo timelines per tracked object', () => {
		const store = createHistoryStore<DemoState, string>();
		store.registerObject('user-a', { name: 'Ana', meta: { age: 30, tags: [] } });
		store.registerObject('user-b', { name: 'Ben', meta: { age: 40, tags: [] } });

		store.commit('user-a', { name: 'Ana 1', meta: { age: 31, tags: [] } });
		store.commit('user-b', { name: 'Ben 1', meta: { age: 41, tags: ['x'] } });
		store.commit('user-b', { name: 'Ben 2', meta: { age: 42, tags: ['x', 'y'] } });

		store.undo('user-a');

		expect(store.getState('user-a')?.name).toBe('Ana');
		expect(store.getState('user-b')?.name).toBe('Ben 2');
		expect(store.canRedo('user-a')).toBe(true);
		expect(store.canRedo('user-b')).toBe(false);
		expect(store.history('user-a').length).toBe(1);
		expect(store.history('user-b').length).toBe(2);

		store.undo('user-b');
		store.redo('user-a');

		expect(store.getState('user-a')?.name).toBe('Ana 1');
		expect(store.getState('user-b')?.name).toBe('Ben 1');

		const snapshot = store.states();
		expect(snapshot.get('user-a')?.name).toBe('Ana 1');
		expect(snapshot.get('user-b')?.name).toBe('Ben 1');
	});

	it('should not record an entry for a transaction without net changes', () => {
		const store = createHistoryStore<DemoState, string>();
		store.registerObject('user-6', { name: 'Fay', meta: { age: 50, tags: ['ops'] } });

		store.beginTransaction('user-6', 'No-op batch');
		store.commit('user-6', { name: 'Fay Temp', meta: { age: 51, tags: ['ops'] } });
		store.commit('user-6', { name: 'Fay', meta: { age: 50, tags: ['ops'] } });

		expect(store.endTransaction('user-6')).toBe(false);
		expect(store.history('user-6').length).toBe(0);
		expect(store.canUndo('user-6')).toBe(false);
		expect(store.commit('user-6', { name: 'Fay', meta: { age: 50, tags: ['ops'] } })).toBe(false);
	});

	it('should invalidate the redo branch when a transaction commits after undo', () => {
		const store = createHistoryStore<DemoState, string>();
		store.registerObject('user-7', { name: 'Gus', meta: { age: 60, tags: [] } });

		store.commit('user-7', { name: 'Gus 1', meta: { age: 61, tags: [] } });
		store.commit('user-7', { name: 'Gus 2', meta: { age: 62, tags: [] } });
		store.undo('user-7');

		expect(store.canRedo('user-7')).toBe(true);

		store.beginTransaction('user-7', 'Replace branch');
		store.commit('user-7', { name: 'Gus 3', meta: { age: 63, tags: ['tx'] } });
		expect(store.endTransaction('user-7')).toBe(true);

		expect(store.canRedo('user-7')).toBe(false);
		expect(store.history('user-7').length).toBe(2);
		expect(store.getState('user-7')?.name).toBe('Gus 3');

		store.undo('user-7');
		expect(store.getState('user-7')?.name).toBe('Gus 1');
	});
});
