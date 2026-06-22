# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

jQuery Image Annotation Plugin - creates Flickr-like comment annotations on images embedded in web pages. Users can draw rectangular regions on images, add text notes, and save/load annotations via AJAX or static data. Licensed under GNU GPL v2.

**Runtime dependencies:** jQuery 3.x/4.x.

## Build Commands

```sh
# Install all dependencies
npm install

# Build (type-check, bundle core + jQuery adapters, minify CSS)
npm run build

# Type-check only (no emit)
npm run build:check

# Clean dist directory only
npm run clean

# Run unit tests (Vitest + jsdom)
npm test

# Run unit tests against jQuery 4
npm run test:jquery4

# Run e2e tests (Playwright, requires build first)
npm run test:e2e
```

## Architecture

The plugin is written in TypeScript with vanilla DOM internals. jQuery is only used in the thin adapter layer (`src/jquery.annotate.ts`) that registers `$.fn.annotateImage`. Drag/resize uses vanilla pointer events (`src/interactions.ts`).

### Repository Structure

```
src/
  index.ts                - Core entry point (annotate() factory, type exports)
  types.ts                - Shared interfaces (AnnotationNote, AnnotateImageOptions, InteractionHandlers)
  annotate-image.ts       - AnnotateImage class (canvas, load/save, hover, add note, destroy)
  annotate-edit.ts        - AnnotateEdit class (edit mode, drag/resize area, form, save/delete/cancel)
  annotate-view.ts        - AnnotateView class (annotation display, hover, click-to-edit)
  interactions.ts         - Vanilla drag/resize via pointer events (InteractionHandlers)
  jquery.annotate.ts      - jQuery adapter ($.fn.annotateImage registration + destroy dispatch)
  annotation.css          - Plugin styles (icons are inline SVG data URIs)
demo/
  index.html              - Demo index page with links to all demos
  jquery-basics.html      - jQuery initialization with static notes
  vanilla-basics.html     - Core API without jQuery
  react.html              - React 18 component demo
  vue.html                - Vue 3 component demo
  ajax.html               - AJAX load/save/delete demo
  multiple-instances.html - Several instances on one page
  programmatic-api.html   - Programmatic control (add, clear, destroy, export)
  custom-labels.html      - Internationalization / icon-only mode
  scaling.html            - CSS-constrained and responsive images
  themes.html             - CSS custom property theming
  demo.css                - Shared demo page styles
  fixtures/               - Mock AJAX endpoint files (get.json, save.json, delete.json)
  images/                 - Demo-only images
test/                     - Vitest unit test suite (jsdom)
e2e/                      - Playwright e2e tests (one spec per demo page)
dist/                     - Built output (gitignored)
docs/                     - Migration plans and design documents
```

### Class Structure

- **`AnnotateImage`** (`src/annotate-image.ts`) — Orchestrates the plugin. Wraps the target image in a canvas div with view/edit overlays (image provides intrinsic sizing, overlays use CSS `inset: 0`). Loads annotations (static or via `fetch`), manages mode switching, creates icon-only "Add Note" button inside the canvas (hover-to-show, always visible on touch). Coordinates stored in natural image pixels; `toRendered()`/`toNatural()` convert between natural and scaled coordinates. Rescale is deferred during active edits. Instance stored via `$(img).data('annotateImage')`.
- **`AnnotateEdit`** (`src/annotate-edit.ts`) — Edit mode. Manages the draggable/resizable area (via injected `InteractionHandlers`), inline form with textarea, save/delete/cancel buttons. Uses `api.save`/`api.delete` callbacks for persistence.
- **`AnnotateView`** (`src/annotate-view.ts`) — View mode. Renders annotation area + tooltip, hover show/hide, click-to-edit for editable annotations. Helper functions `readInlinePosition`/`readInlineSize` read from inline styles (jsdom-compatible).

### Core API

`src/index.ts` is the vanilla entry point. It exports:
- `annotate(img, options?)` — factory function, returns `AnnotateImage` instance
- `AnnotateImage` class (for typing/instanceof)
- `AnnotationNote`, `AnnotateImageOptions` types

Unified defaults (both core and jQuery): `editable: true`, `notes: []`, `autoResize: true`.

### jQuery Adapter

`src/jquery.annotate.ts` is the jQuery entry point. It:
- Registers `$.fn.annotateImage(options)` which creates an `AnnotateImage` instance
- Supports method dispatch: `$(img).annotateImage('destroy')`
- Stores the instance via `$(img).data('annotateImage')`

### Plugin Options

```typescript
{
  editable: true,        // Enable editing
  notes: [],             // Static annotation data
  api?: {                // Server persistence (omit for static-only mode)
    load: string | (() => Promise<AnnotationNote[]>),
    save: string | ((note: NoteData) => Promise<SaveResult>),
    delete: string | ((note: NoteData) => Promise<void>),
  },
  labels?: {             // Configurable button labels (omit for English defaults)
    addNote?: string,    // default: "Add Note"
    save?: string,       // default: "OK"
    delete?: string,     // default: "Delete"
    cancel?: string,     // default: "Cancel"
    placeholder?: string // default: "" (no placeholder)
  },
  autoResize?: boolean,   // Re-scale on container resize (default: true)
  theme?: string,         // CSS theme name, sets data-theme on canvas (default: undefined)
  onError?: (context: AnnotateErrorContext) => void,
}
```

Each `api` field accepts either a URL string (shorthand for default fetch) or a function (full control). Omitting `api` entirely means static mode — no network calls.

### CSS Theming

All visual styling uses CSS custom properties defined on `.image-annotate-canvas`. The `theme` option sets `data-theme="<value>"` on the canvas element, enabling scoped theme CSS via `.image-annotate-canvas[data-theme="dark"] { ... }`. Button icons use CSS `mask-image` so their color automatically follows `--image-annotate-button-text`. See `README.md` for the full variable reference.

### Annotation Data Shape

```typescript
{ top: number, left: number, width: number, height: number, text: string, id: string, editable: boolean }
```

### Build Output

`dist/` contains the built artifacts (gitignored):
- `dist/core.js` — Core library (ESM, no dependencies)
- `dist/core.min.js` — Core library (IIFE, minified, `AnnotateImage` global)
- `dist/jquery.js` — jQuery adapter (ESM, jQuery external)
- `dist/jquery.min.js` — jQuery adapter (IIFE, minified, jQuery external)
- `dist/css/annotate.min.css` — Minified styles (icons embedded as SVG data URIs)
- `dist/types/` — TypeScript declaration files (`.d.ts`)

Package exports: `"."` (core), `"./jquery"` (jQuery adapter), `"./css"` (styles).

### CSS Classes

All classes are prefixed `image-annotate-` (e.g., `.image-annotate-canvas`, `.image-annotate-view`, `.image-annotate-edit`, `.image-annotate-area`, `.image-annotate-note`).
