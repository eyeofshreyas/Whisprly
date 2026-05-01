#!/usr/bin/env python3
"""
Local transcription sidecar using faster-whisper.
Called by the Rust backend as: python whisper_sidecar.py <audio_file>
Prints the transcript to stdout.
"""
import sys
from faster_whisper import WhisperModel

def main():
    if len(sys.argv) < 2:
        print("Usage: whisper_sidecar.py <audio_file>", file=sys.stderr)
        sys.exit(1)

    audio_file = sys.argv[1]

    model = WhisperModel("base", device="cpu", compute_type="int8")
    segments, _ = model.transcribe(audio_file, beam_size=5)

    text = " ".join(seg.text.strip() for seg in segments)
    print(text, end="")

if __name__ == "__main__":
    main()
