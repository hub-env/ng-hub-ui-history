# ng-hub-ui-history

**Español** | [English](./README.md)

Store de historial basado en Signals para Angular, con soporte multi-objeto, undo/redo, transacciones y seguimiento automático de formularios reactivos.

## Documentación y ejemplos en vivo

Este paquete forma parte de [Hub UI](https://hubui.dev/en/), una colección de bibliotecas de componentes Angular para aplicaciones standalone.

- Documentación: https://hubui.dev/en/history/overview/
- Ejemplos en vivo: https://hubui.dev/en/history/examples/
- Hub UI: https://hubui.dev/en/

## 🧩 Familia de bibliotecas `ng-hub-ui`

Esta biblioteca forma parte del ecosistema **ng-hub-ui**:

- [**ng-hub-ui-action-sheet**](https://www.npmjs.com/package/ng-hub-ui-action-sheet)
- [**ng-hub-ui-avatar**](https://www.npmjs.com/package/ng-hub-ui-avatar)
- [**ng-hub-ui-badges**](https://www.npmjs.com/package/ng-hub-ui-badges)
- [**ng-hub-ui-board**](https://www.npmjs.com/package/ng-hub-ui-board)
- [**ng-hub-ui-breadcrumbs**](https://www.npmjs.com/package/ng-hub-ui-breadcrumbs)
- [**ng-hub-ui-buttons**](https://www.npmjs.com/package/ng-hub-ui-buttons)
- [**ng-hub-ui-calendar**](https://www.npmjs.com/package/ng-hub-ui-calendar)
- [**ng-hub-ui-ds**](https://www.npmjs.com/package/ng-hub-ui-ds)
- [**ng-hub-ui-forms**](https://www.npmjs.com/package/ng-hub-ui-forms)
- [**ng-hub-ui-history**](https://www.npmjs.com/package/ng-hub-ui-history) ← Estás aquí
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

## 📋 Tabla de contenidos

- [Descripción](#descripción)
- [Características](#características)
- [Instalación](#instalación)
- [Uso rápido](#uso-rápido)
- [Referencia de la API](#referencia-de-la-api)
- [Registro de cambios](#registro-de-cambios)
- [Contribución](#contribución)
- [Soporte](#soporte)
- [Licencia](#licencia)

## Descripción

`ng-hub-ui-history` es un store de historial basado en Signals para aplicaciones Angular.
Rastrea de forma independiente el estado de cualquier número de objetos, cada uno
identificado por una clave configurable, y expone una signal `states` totalmente reactiva
que siempre refleja la instantánea actual de todos los objetos rastreados.

El store es exclusivo de Angular: se apoya en `signal`/`computed` de `@angular/core` y
`watchForm` recibe un `FormGroup` de `@angular/forms`. Ambos se declaran como dependencias
peer, así que no puede usarse en un proyecto que no sea Angular.

En lugar de almacenar instantáneas completas por cada cambio, el store registra parches
de diferencias (forward/backward) compactos, lo que mantiene bajo el uso de memoria a la
vez que permite la navegación lineal undo/redo. La retención está limitada tanto por un
número máximo de entradas como por un presupuesto aproximado de memoria. El store también
ofrece transacciones para colapsar muchas actualizaciones en una única entrada de historial
y un helper `watchForm` que confirma automáticamente los cambios de valor de los
formularios reactivos de Angular.

Esta biblioteca no incluye componentes visuales — es un paquete puramente de
lógica/store, por lo que no tiene sección de variables CSS.

## Características

- Seguimiento multi-objeto mediante un tipo de clave configurable.
- Entradas de historial eficientes que usan parches de diferencias en lugar de instantáneas completas.
- Undo/redo con comportamiento de timeline lineal.
- Invalidación del redo cuando se realizan nuevos commits manuales tras un undo.
- Controles de retención por número de entradas y bytes aproximados de memoria.
- Soporte de transacciones para agrupar muchas actualizaciones en una única entrada de historial.
- Estrategias de diff/patch personalizables de forma opcional.
- Integración automática con formularios reactivos mediante `watchForm`.
- Signal `states` reactiva que expone la instantánea actual de cada objeto rastreado.

## Instalación

```bash
npm install ng-hub-ui-history
```

**Dependencias peer:** `@angular/common`, `@angular/core`, `@angular/forms` (`>=18.0.0`) y `rxjs` (`>=7.5.0`).

## Uso rápido

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

// Registra un objeto para empezar a rastrear su historial.
store.registerObject('a-1', { id: 'a-1', name: 'Initial' });

// Confirma un nuevo estado. Devuelve false cuando el estado no cambia, salvo con una
// transacción abierta: ahí siempre devuelve true y todavía no registra nada.
store.commit('a-1', { id: 'a-1', name: 'Edited' }, { label: 'Rename' });

// Navega por el timeline.
store.undo('a-1'); // -> { id: 'a-1', name: 'Initial' }
store.redo('a-1'); // -> { id: 'a-1', name: 'Edited' }

// Lee el estado actual en cualquier momento.
const current = store.getState('a-1');

// Reacciona a los cambios mediante la signal.
const all = store.states(); // Map<string, Note>
```

### Transacciones

```ts
store.beginTransaction('a-1', 'Bulk edit');
store.commit('a-1', { id: 'a-1', name: 'Step 1' });
store.commit('a-1', { id: 'a-1', name: 'Step 2' });
store.endTransaction('a-1'); // Se almacena como una única entrada de historial.
```

### Seguimiento de un formulario reactivo

```ts
const form = new FormGroup({ name: new FormControl('Initial') });
store.registerObject('form-1', form.value as Note);

// Confirma automáticamente cada cambio de valor; devuelve una función para cancelar la suscripción.
const stop = store.watchForm('form-1', form, { skipInitial: true, label: 'Form edit' });

// Más adelante, detén el seguimiento.
stop();
```

## Referencia de la API

### `createHistoryStore<T, K>(config?)`

Crea una instancia del store de historial. `T` es el tipo del objeto rastreado y `K` es el
tipo de clave (por defecto `string | number`).

**`HistoryStoreConfig<T, K>`**

| Opción        | Tipo                                                          | Por defecto | Descripción                                              |
| ------------- | ------------------------------------------------------------- | ----------- | -------------------------------------------------------- |
| `maxEntries`  | `number`                                                      | `100`       | Número máximo de entradas por historial de objeto.       |
| `maxBytes`    | `number`                                                      | `512000`    | Bytes aproximados máximos por historial de objeto.       |
| `keySelector` | `(state: T) => K`                                             | —           | Resolutor de clave usado por los helpers `*FromObject`.  |
| `diff`        | `(previous: T, next: T) => HistoryPatchOperation[]`           | integrado   | Estrategia de diff personalizada opcional.               |
| `patch`       | `(current: T, operations: HistoryPatchOperation[]) => T`      | integrado   | Estrategia de patch personalizada opcional.              |

### API del store (`HistoryStore<T, K>`)

| Miembro                                 | Devuelve              | Descripción                                                                       |
| --------------------------------------- | --------------------- | --------------------------------------------------------------------------------- |
| `states`                                | `Signal<Map<K, T>>`   | Diccionario reactivo de estados actuales indexados por id de objeto.              |
| `registerObject(id, initialState)`      | `void`                | Registra un objeto rastreado e inicia un timeline nuevo.                          |
| `registerFromObject(initialState)`      | `K`                   | Registra usando el `keySelector` configurado; devuelve el id resuelto.            |
| `commit(id, newState, options?)`        | `boolean`             | Confirma una nueva instantánea. Devuelve `false` cuando no hubo cambios; dentro de una transacción abierta solo actualiza el estado actual y devuelve `true`. |
| `commitFromObject(newState, options?)`  | `boolean`             | Confirma usando el `keySelector` configurado.                                     |
| `undo(id)`                              | `boolean`             | Revierte un paso. Devuelve `false` en la base del timeline.                       |
| `redo(id)`                              | `boolean`             | Reaplica un paso. Devuelve `false` cuando no existe entrada de redo.              |
| `canUndo(id)`                           | `boolean`             | Indica si el undo es posible actualmente.                                         |
| `canRedo(id)`                           | `boolean`             | Indica si el redo es posible actualmente.                                         |
| `getState(id)`                          | `T \| undefined`      | Estado actual inmutable, o `undefined` cuando no está registrado.                 |
| `history(id)`                           | `HistoryMetadata`     | Metadatos de solo lectura (puntero, longitud, bytes, información por entrada).     |
| `beginTransaction(id, label?)`          | `void`                | Inicia una transacción que fusiona los commits siguientes en una única entrada.   |
| `endTransaction(id)`                    | `boolean`             | Finaliza la transacción, almacenando una única entrada consolidada.               |
| `watchForm(id, form, options?)`         | `() => void`          | Confirma automáticamente los cambios del formulario reactivo; devuelve una función para cancelar la suscripción. |
| `clearHistory(id)`                      | `void`                | Borra todas las entradas y mantiene el estado actual como nueva base.             |

### `HistoryCommitOptions`

| Propiedad | Tipo     | Descripción                                                  |
| --------- | -------- | ------------------------------------------------------------ |
| `label`   | `string` | Etiqueta opcional almacenada en los metadatos del historial y la UI. |

### `WatchFormOptions`

| Propiedad     | Tipo      | Descripción                                          |
| ------------- | --------- | ---------------------------------------------------- |
| `label`       | `string`  | Etiqueta opcional usada para cada commit automático. |
| `skipInitial` | `boolean` | Indica si se debe ignorar la primera emisión de valor. |

### `HistoryMetadata`

| Propiedad | Tipo                                                          | Descripción                                            |
| --------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| `pointer` | `number`                                                      | Puntero actual; `-1` indica la instantánea base.       |
| `length`  | `number`                                                      | Total de entradas retenidas en memoria.                |
| `bytes`   | `number`                                                      | Bytes aproximados acumulados retenidos.                |
| `entries` | `Array<Pick<HistoryEntry, 'label' \| 'timestamp' \| 'bytes'>>` | Metadatos legibles por entrada.                        |

Tipos exportados adicionales: `HistoryEntry`, `HistoryPatchOperation`.

## Registro de cambios

Consulta [CHANGELOG.md](./CHANGELOG.md) para el historial completo de versiones.

## Contribución

¡Toda contribución es bienvenida! Así puedes ayudar:

### Primeros pasos

```bash
# Clona el repositorio
git clone https://github.com/carlos-morcillo/ng-hub-ui-history.git
cd ng-hub-ui-history

# Instala las dependencias
npm install

# Ejecuta los tests
npm run test
```

### Guía de contribución

1. **Haz un fork** del repositorio
2. **Crea** una rama de funcionalidad: `git checkout -b feature/amazing-feature`
3. **Añade tests** para tus cambios
4. **Asegúrate** de que todos los tests pasan: `npm run test`
5. **Confirma** tus cambios: `git commit -m 'Add amazing feature'`
6. **Sube** tu rama: `git push origin feature/amazing-feature`
7. **Envía** una pull request

### Reportar incidencias

Al reportar errores, incluye por favor:

- Versión de Angular
- Pasos para reproducir
- Comportamiento esperado vs. real
- Ejemplo mínimo de reproducción (StackBlitz preferido)

## Soporte

¿Te gusta esta biblioteca? Puedes apoyarnos invitándonos a un café ☕:
[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/carlosmorcillo)

- Documentación Hub UI: https://hubui.dev/en/history/overview/
- Ejemplos en vivo: https://hubui.dev/en/history/examples/

## Licencia

Este proyecto está licenciado bajo la licencia MIT - consulta el archivo [LICENSE](LICENSE) para más detalles.

MIT © ng-hub-ui contributors
