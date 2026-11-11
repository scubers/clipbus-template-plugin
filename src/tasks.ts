// Separate process entry: shared imports reuse code, not running instances.
import { definePlugin } from "@clipbus/plugin-sdk/runtime";
import { LOCAL_DIGEST_TASK } from "./features/background-work/contracts";
import { digestTask } from "./features/background-work/task";
import { HTTP_TASK, httpStreamTask } from "./features/http-work/task";

export default definePlugin({ tasks: { [LOCAL_DIGEST_TASK]: digestTask, [HTTP_TASK]: httpStreamTask } });
