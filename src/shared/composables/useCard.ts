// Vue bindings for a card page's ctx (`@clipbus/plugin-sdk/view`).
//
// A card page starts from the startup snapshot the Host injects before any
// script runs (`ctx.renderer.context(contract)`) and then follows the Host
// events: `item.changed` (tags, pin state, attachments) and `env.changed`
// (theme, language). Every subscription made here ends when the component
// unmounts, so the preview workbench can remount pages freely.

import { onUnmounted, shallowRef, type ShallowRef } from "vue";
import { ctx } from "@clipbus/plugin-sdk/view";
import type { AttachmentContract, PluginAttachment, PluginEnv, PluginItemSnapshot } from "@clipbus/plugin-sdk";

export interface CardState<T> {
  /** The card item; replaced on every `item.changed`. */
  readonly item: ShallowRef<PluginItemSnapshot>;
  /** This card's attachment; re-read when `item.changed` shows a newer version. */
  readonly attachment: ShallowRef<PluginAttachment<T>>;
  /** Theme, locale and platform; replaced on every `env.changed`. */
  readonly env: ShallowRef<PluginEnv>;
}

/** Run `stop` when the calling component unmounts. */
export function stopOnUnmount(stop: () => void): void {
  onUnmounted(stop);
}

export function useCard<T>(contract: AttachmentContract<T>): CardState<T> {
  const context = ctx.renderer.context(contract);
  const item = shallowRef(context.item);
  const attachment = shallowRef(context.attachment);
  const env = shallowRef(context.env);

  // The snapshot in item.changed carries attachment references only; when
  // this card's reference has a new `updatedAt`, read the payload again.
  async function refreshAttachment(snapshot: PluginItemSnapshot): Promise<void> {
    const current = attachment.value;
    const ref = snapshot.attachments.find(
      (candidate) => candidate.type === current.type && candidate.key === current.key && candidate.own === current.own,
    );
    if (ref === undefined || ref.updatedAt === current.updatedAt) {
      return;
    }
    const fresh = await contract.get(ctx, { key: current.key });
    const match = fresh.find((candidate) => candidate.own === current.own);
    if (match !== undefined) {
      attachment.value = match;
    }
  }

  stopOnUnmount(ctx.item.onChange((snapshot) => {
    item.value = snapshot;
    refreshAttachment(snapshot).catch((error: unknown) => ctx.log.warn("attachment refresh failed", error));
  }));
  stopOnUnmount(ctx.env.onChange((next) => {
    env.value = next;
  }));

  return { item, attachment, env };
}

/** Handle presses of one Host-drawn card button while the component is mounted. */
export function useCardButton(id: string, handler: () => void | Promise<void>): void {
  stopOnUnmount(ctx.renderer.onButton(id, () => {
    Promise.resolve(handler()).catch((error: unknown) => ctx.log.error(`button ${id} failed`, error));
  }));
}
