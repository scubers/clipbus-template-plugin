/** SSE data framing shared by the background example and the live model test. */
export async function* sseData(body: AsyncIterable<Uint8Array>, signal?: AbortSignal): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let line = "";
  let skipLf = false;
  let fields: string[] = [];
  let eventSize = 0;
  for await (const bytes of body) {
    signal?.throwIfAborted();
    for (const char of decoder.decode(bytes, { stream: true })) {
      if (skipLf) { skipLf = false; if (char === "\n") continue; }
      if (char === "\r" || char === "\n") {
        skipLf = char === "\r";
        if (line === "") {
          const data = fields.length > 0 ? fields.join("\n") : undefined;
          fields = []; eventSize = 0;
          if (data !== undefined) yield data;
        } else if (line === "data" || line.startsWith("data:")) {
          let value = line === "data" ? "" : line.slice(5);
          if (value.startsWith(" ")) value = value.slice(1);
          fields.push(value);
        }
        line = "";
      } else {
        line += char;
        if (++eventSize > 64 * 1024) throw new Error("HTTP demo event is too large");
      }
    }
  }
  // SSE requires a blank line: an unterminated event at EOF is not dispatched.
}
