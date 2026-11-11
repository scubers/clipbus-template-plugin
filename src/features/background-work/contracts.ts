import { defineMessage } from "@clipbus/plugin-sdk";

export const LOCAL_DIGEST_TASK = "local-digest";
export const BACKGROUND_ROUNDS = 1_000_000;

export interface LocalDigestOptions { rounds: number; }
export interface LocalDigestResult extends LocalDigestOptions { sha256: string; }

// A small foreground message and the Worker reuse one implementation;
// this message does not forward to an already running Worker.
export const localDigest = defineMessage<{ text: string; rounds: number }, LocalDigestResult>("template.localDigest");
