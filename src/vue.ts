import { defineComponent, ref, shallowRef, computed, onMounted, onBeforeUnmount, watch, h } from 'vue';
import { AnnotateImage as AnnotateImageCore } from './annotate-image';
import type { AnnotationNote, NoteData, AnnotateErrorContext } from './types';

/**
 * Vue component for image annotation.
 * Wraps the vanilla AnnotateImage core with reactive state and Vue events.
 *
 * @remarks SSR-safe — renders a plain `<img>` on the server. DOM manipulation
 * only runs in onMounted (client-side).
 */
export const AnnotateImage = defineComponent({
  name: 'AnnotateImage',

  props: {
    /** Image source URL. */
    src: { type: String, required: true },
    /** Image width in pixels. Required if image may not be loaded yet. */
    width: { type: Number },
    /** Image height in pixels. Required if image may not be loaded yet. */
    height: { type: Number },
    /** Image alt text for accessibility. */
    alt: { type: String },
    /** Annotations to render. */
    notes: { type: Array as () => AnnotationNote[] },
    /** Enable annotation editing. Default: true. */
    editable: { type: Boolean, default: true },
  },

  emits: {
    save: (_note: NoteData) => true,
    delete: (_note: NoteData) => true,
    load: (_notes: NoteData[]) => true,
    change: (_notes: NoteData[]) => true,
    error: (_context: AnnotateErrorContext) => true,
  },

  setup(props, { emit, expose }) {
    const imgRef = shallowRef<HTMLImageElement | null>(null);
    const instanceRef = shallowRef<AnnotateImageCore | null>(null);
    const currentNotes = ref<NoteData[]>([]);

    function createInstance(): void {
      if (!imgRef.value) return;

      try {
        const instance = new AnnotateImageCore(imgRef.value, {
          editable: props.editable,
          notes: props.notes ? props.notes.slice() : [],
          onChange: (notes) => {
            currentNotes.value = notes;
            emit('change', notes);
          },
          onSave: (note) => emit('save', note),
          onDelete: (note) => emit('delete', note),
          onLoad: (notes) => emit('load', notes),
          onError: (ctx) => emit('error', ctx),
        });
        instanceRef.value = instance;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        emit('error', { type: 'load' as const, error });
      }
    }

    function destroyInstance(): void {
      instanceRef.value?.destroy();
      instanceRef.value = null;
    }

    onMounted(() => {
      createInstance();
    });

    onBeforeUnmount(() => {
      destroyInstance();
    });

    // src change: destroy and recreate
    watch(
      () => props.src,
      () => {
        destroyInstance();
        createInstance();
      },
    );

    // notes change: update in place
    const serializedNotes = computed(() => JSON.stringify(props.notes ?? []));
    watch(serializedNotes, () => {
      instanceRef.value?.setNotes(props.notes ? props.notes.slice() : []);
    });

    // editable change: update in place
    watch(
      () => props.editable,
      (newEditable) => {
        instanceRef.value?.setEditable(newEditable);
      },
    );

    /** Enter add-note mode. */
    const add = () => instanceRef.value?.add();
    /** Remove all annotations. */
    const clear = () => instanceRef.value?.clear();
    /** Return current annotations (internal fields stripped). */
    const getNotes = () => instanceRef.value?.getNotes() ?? [];

    expose({ add, clear, getNotes, notes: currentNotes });

    return () =>
      h('img', {
        ref: imgRef,
        src: props.src,
        width: props.width,
        height: props.height,
        alt: props.alt,
      });
  },
});
