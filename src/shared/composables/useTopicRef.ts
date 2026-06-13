import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import { bindTopicTo, type TopicLike } from '@clipbus/plugin-sdk/dom';

/**
 * Bind a SDK Topic or OptionalTopic to a Vue readonly ref.
 *
 * - Initialises synchronously from `topic.current()` (may be `undefined`).
 * - Subscribes on mount, unsubscribes on unmount.
 * - TypeScript enforces the exact field path from the typeRef — no more silent
 *   path drift (e.g. `value?.attachment.payloadJson` vs `value?.payloadJson`).
 *
 * @example
 * const attachmentPayload = useTopicRef(clipbus.item.attachment);
 * const payloadJson = computed(() => attachmentPayload.value?.attachment.payloadJson);
 */
export function useTopicRef<T>(topic: TopicLike<T>): Readonly<Ref<T | undefined>> {
  const state = ref<T | undefined>(topic.current()) as Ref<T | undefined>;
  let unsub: (() => void) | null = null;

  onMounted(() => {
    unsub = bindTopicTo(topic, (v) => { state.value = v; });
  });

  onUnmounted(() => {
    unsub?.();
    unsub = null;
  });

  return state as Readonly<Ref<T | undefined>>;
}
