# Migration Guide: v1 to v2

## Package Rename

The package has been renamed from `jquery-image-annotate` to `annotate-image`.

```diff
- npm install jquery-image-annotate
+ npm install annotate-image
```

## Import Paths

v2 provides multiple entry points. Import only what you need:

| Entry point | Description |
|-------------|-------------|
| `annotate-image` | Core vanilla JS API (no dependencies) |
| `annotate-image/jquery` | jQuery adapter (`$.fn.annotateImage`) |
| `annotate-image/react` | React 18+ component |
| `annotate-image/vue` | Vue 3+ component |
| `annotate-image/css` | Styles (required for all entry points) |

```js
// Core
import { annotate } from 'annotate-image';

// jQuery
import 'annotate-image/jquery';

// React
import { AnnotateImage } from 'annotate-image/react';

// Vue
import { AnnotateImage } from 'annotate-image/vue';

// CSS (always needed)
import 'annotate-image/css';
```

## Removed Options

The following options from v1 have been removed:

| v1 Option | v2 Replacement |
|-----------|----------------|
| `useAjax` | Omit `api` for static mode, provide `api` for server persistence |
| `getUrl` | `api.load` |
| `saveUrl` | `api.save` |
| `deleteUrl` | `api.delete` |

### Before (v1)

```js
$('#img').annotateImage({
  useAjax: true,
  getUrl: '/api/notes',
  saveUrl: '/api/notes/save',
  deleteUrl: '/api/notes/delete',
});
```

### After (v2)

```js
$('#img').annotateImage({
  api: {
    load: '/api/notes',
    save: '/api/notes/save',
    delete: '/api/notes/delete',
  },
});
```

Each `api` field also accepts a function for full control:

```js
$('#img').annotateImage({
  api: {
    load: () => fetch('/api/notes').then(r => r.json()),
    save: (note) => fetch('/api/notes', {
      method: 'POST',
      body: JSON.stringify(note),
      headers: { 'Content-Type': 'application/json' },
    }).then(r => r.json()),
    delete: (note) => fetch(`/api/notes/${note.id}`, { method: 'DELETE' }),
  },
});
```

## New Lifecycle Callbacks

v2 adds callbacks for annotation lifecycle events:

```js
annotate(img, {
  onChange(notes) { /* any mutation: load, save, delete, clear */ },
  onSave(note)   { /* after a note is saved (new or edited) */ },
  onDelete(note) { /* after a note is deleted */ },
  onLoad(notes)  { /* after notes are loaded */ },
  onError(ctx)   { /* { type, error, note? } — on API failure */ },
});
```

Callbacks receive `NoteData` objects (internal fields `view` and `editable` stripped).

## New Method: `getNotes()`

Returns current annotations as `NoteData[]` (without internal fields):

```js
const instance = annotate(img, { notes: [...] });
const current = instance.getNotes();
```

## Removed Dependencies

- **jQuery UI** — No longer required. Drag and resize use vanilla pointer events.
- **jQuery** — Optional. Only needed if using the jQuery adapter (`annotate-image/jquery`).

## Framework Wrappers

v2 adds native React and Vue components. These are thin wrappers around the core that handle mounting, unmounting, and event forwarding.

### React (18+)

```tsx
import { useRef } from 'react';
import { AnnotateImage } from 'annotate-image/react';
import type { AnnotateImageRef } from 'annotate-image/react';

function App() {
  const ref = useRef<AnnotateImageRef>(null);
  return (
    <AnnotateImage
      ref={ref}
      src="/photo.jpg"
      width={800}
      height={600}
      notes={[]}
      editable
      onChange={(notes) => console.log(notes)}
    />
  );
}
```

### Vue (3+)

```vue
<script setup>
import { ref } from 'vue';
import { AnnotateImage } from 'annotate-image/vue';

const annotator = ref();
</script>

<template>
  <AnnotateImage
    ref="annotator"
    src="/photo.jpg"
    :width="800"
    :height="600"
    :notes="[]"
    editable
    @change="(notes) => console.log(notes)"
  />
</template>
```

## Automatic Scaling

v2 automatically scales annotations to match the rendered image size. If your image is displayed smaller than its natural dimensions (via CSS or HTML attributes), annotations position correctly without any configuration.

Annotation coordinates are always stored in natural image pixels. The plugin computes a scale factor at render time.

Dynamic resizing is enabled by default via `ResizeObserver`. Disable with `autoResize: false`.

## Build System

- Bower and Grunt have been removed.
- Build uses npm scripts and esbuild.
- Output includes ESM and IIFE bundles plus TypeScript declarations.
- See [Build Output](../readme.md#build-output) in the README.
