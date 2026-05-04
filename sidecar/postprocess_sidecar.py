#!/usr/bin/env python3
"""
Post-processing sidecar: polishes raw Whisper transcripts via Ollama.
Reads raw text from stdin, writes corrected text to stdout.
If Ollama is not running or the model is unavailable, prints input unchanged.
"""
import sys
import argparse
import json
import urllib.request
import urllib.error

OLLAMA_MODEL = "gemma4-4b"
OLLAMA_URL   = "http://localhost:11434/api/chat"


def system_prompt(mode: str) -> str:
    mode_rule = {
        "email": "Format as a professional email with greeting and sign-off.",
        "code":  "Strip all punctuation. Preserve camelCase and snake_case.",
    }.get(mode, "Standard paragraph formatting.")
    return (
        "You are a transcript editor. The input is raw speech-to-text output.\n"
        "Your job:\n"
        "1. Fix punctuation — add commas, periods, question marks where appropriate.\n"
        "2. Remove filler words: um, uh, like, you know, so, basically, literally.\n"
        "3. Fix capitalization of proper nouns, acronyms, and sentence starts.\n"
        "4. Do NOT change the meaning, add content, or rephrase sentences.\n"
        "5. Output ONLY the corrected text. No preamble, no explanation, no quotes.\n"
        f"{mode_rule}"
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", default="prose", choices=["prose", "email", "code"])
    args = parser.parse_args()

    raw = sys.stdin.read()

    try:
        payload = json.dumps({
            "model": OLLAMA_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt(args.mode)},
                {"role": "user",   "content": raw},
            ],
            "stream": False,
            "options": {"temperature": 0.0, "num_predict": 512},
        }).encode()

        req = urllib.request.Request(
            OLLAMA_URL,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())

        text = data["message"]["content"].strip()
        print(text if text else raw, end="")

    except Exception:
        print(raw, end="")


if __name__ == "__main__":
    main()
