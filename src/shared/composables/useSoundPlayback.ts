import { onUnmounted, ref, watch } from "vue";
import { PLUGIN_SOUND_LIMITS } from "@clipbus/plugin-sdk";
import { isSoundFormat, type SoundFormat } from "../sound";

const KEY = "template.soundVolume";
const FORMAT_KEY = "template.soundFormat";

function storedFormat(value: string | null): SoundFormat {
  return isSoundFormat(value) ? value : "wav";
}

function storedVolume(value: string | null): number {
  const volume = value === null ? NaN : Number(value);
  return Number.isInteger(volume) && volume >= 0 && volume <= PLUGIN_SOUND_LIMITS.fullVolume
    ? volume : PLUGIN_SOUND_LIMITS.fullVolume;
}

/** The plugin's card pages share this preference through their own localStorage. */
export function useSoundPlayback() {
  const volume = ref(storedVolume(localStorage.getItem(KEY)));
  const format = ref(storedFormat(localStorage.getItem(FORMAT_KEY)));
  const stop = watch(volume, (value) => localStorage.setItem(KEY, String(value)));
  const stopFormat = watch(format, (value) => localStorage.setItem(FORMAT_KEY, value));
  const receive = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) volume.value = storedVolume(event.newValue);
    if (event.key === FORMAT_KEY || event.key === null) format.value = storedFormat(event.newValue);
  };
  window.addEventListener("storage", receive);
  onUnmounted(() => { stop(); stopFormat(); window.removeEventListener("storage", receive); });
  return { volume, format };
}
