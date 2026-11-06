# Sound references

The template includes three standalone versions of the same short tone:

| File | Encoding |
|---|---|
| `copied.wav` | PCM16 WAV, mono, 44.1 kHz |
| `copied.mp3` | MPEG-1 Layer III, VBR |
| `copied.aiff` | PCM16 AIFF, mono, 44.1 kHz |

Choose **Format** in the preview card or the gallery's **System** section, adjust **Volume**, then press **Play sound**. The Runtime sound probe receives the same selection. Choices are remembered locally; WAV is the initial default. Browser preview records requests without producing sound. Each click makes one request and remains subject to the Host's shared busy slot and rate limit.

Runtime code can select the bundled reference explicitly:

```ts
await playCopiedSound(ctx, 50, "mp3");
```

The AIFF and MP3 files were converted from `copied.wav`. To regenerate them during development with ffmpeg:

```sh
ffmpeg -i sounds/copied.wav -map_metadata -1 -c:a pcm_s16be sounds/copied.aiff
ffmpeg -i sounds/copied.wav -map_metadata -1 -c:a libmp3lame -q:a 5 -id3v2_version 3 sounds/copied.mp3
```

ffmpeg is not needed to build, install or run the template. All three audio files ship with a standalone export.
