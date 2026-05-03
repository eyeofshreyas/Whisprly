#!/usr/bin/env python3
"""
Post-processing sidecar: polishes raw Whisper transcripts.
Reads raw text from stdin, writes corrected text to stdout.
If llama_cpp or the model file is unavailable, prints input unchanged.
"""
import sys
import argparse


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", default="prose", choices=["prose", "email", "code"])
    args = parser.parse_args()

    raw = sys.stdin.read()

    try:
        from llama_cpp import Llama
        import os

        model_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "gemma-4-e2b-q4.gguf"
        )
        if not os.path.exists(model_path):
            print(raw, end="")
            return

        mode_rule = {
            "email": "Format as a professional email with greeting and sign-off.",
            "code": "Strip all punctuation. Preserve camelCase and snake_case.",
        }.get(args.mode, "Standard paragraph formatting.")

        system_prompt = (
            "You are a transcript editor. The input is raw speech-to-text output.\n"
            "Your job:\n"
            "1. Fix punctuation — add commas, periods, question marks where appropriate.\n"
            "2. Remove filler words: um, uh, like, you know, so, basically, literally.\n"
            "3. Fix capitalization of proper nouns, acronyms, and sentence starts.\n"
            "4. Do NOT change the meaning, add content, or rephrase sentences.\n"
            "5. Output ONLY the corrected text. No preamble, no explanation, no quotes.\n"
            f"{mode_rule}"
        )

        llm = Llama(model_path=model_path, n_ctx=1024, verbose=False)
        result = llm.create_chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": raw},
            ],
            max_tokens=512,
            temperature=0.0,
        )
        text = result["choices"][0]["message"]["content"].strip()
        print(text if text else raw, end="")

    except Exception:
        print(raw, end="")


if __name__ == "__main__":
    main()
