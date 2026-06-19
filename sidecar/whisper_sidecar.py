#!/usr/bin/env python3
"""
Local transcription sidecar using faster-whisper.
Called by the Rust backend as: python whisper_sidecar.py <audio_file> [--language <lang>] [--prompt <prompt>]
Prints the transcript to stdout.
"""
import sys
import argparse
from faster_whisper import WhisperModel

def main():
    parser = argparse.ArgumentParser(description="Local Whisper transcriber sidecar.")
    parser.add_argument("audio_file", help="Path to the WAV audio file to transcribe.")
    parser.add_argument("--language", default=None, help="Force language code (e.g. en, es).")
    parser.add_argument("--prompt", default=None, help="Initial transcription prompt for context.")
    args = parser.parse_args()

    model = WhisperModel("base", device="cpu", compute_type="int8")
    
    segments, _ = model.transcribe(
        args.audio_file,
        beam_size=5,
        language=args.language,
        initial_prompt=args.prompt
    )

    text = " ".join(seg.text.strip() for seg in segments)
    print(text, end="")

if __name__ == "__main__":
    main()
