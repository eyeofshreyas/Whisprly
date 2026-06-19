#!/usr/bin/env python3
"""
Synthetic Dataset Generator for Hinglish speech correction training.
Uses the user's Groq API key from .env to generate 1,000+ training pairs.
"""
import os
import json
import time
import urllib.request
import urllib.error

# Load Groq key from local .env if present
api_key = os.environ.get("GROQ_API")
if not api_key and os.path.exists(".env"):
    with open(".env", "r") as f:
        for line in f:
            if line.strip().startswith("GROQ_API="):
                api_key = line.split("=", 1)[1].strip()

if not api_key:
    print("Error: GROQ_API key not found. Please set the GROQ_API environment variable or write it in your .env file.")
    exit(1)

MODEL = "llama-3.3-70b-versatile" # Use Groq Llama 3.3 70B for high-quality generation
URL = "https://api.groq.com/openai/v1/chat/completions"

categories = [
    "Software Development & Coding (e.g. debugging, syntax errors, Git commands, code review)",
    "Professional Emails & Standup (e.g. status updates, scheduling meetings, client communications)",
    "Casual Friends Chat (e.g. hanging out, talking about movies, food, plans, life updates)",
    "Technical Support / Setup (e.g. app installation, system settings, database connection problems)",
    "General Office/Work Context (e.g. design discussions, task assignments, deadline follow-ups)"
]

dataset = []

def generate_batch(category, count=50):
    prompt = (
        f"You are a synthetic dataset generator. Your task is to generate exactly {count} distinct training pairs "
        f"for fine-tuning a speech-to-text post-processing model. The category is: '{category}'.\n\n"
        "Each training pair must be an object with two fields:\n"
        "1. 'clean': A natural, grammatically correct Hinglish sentence mixed with English (how the user intended to say it).\n"
        "2. 'noisy': The simulated raw Whisper output, showing typical acoustic errors (e.g. 'but' misheard as 'bada'/'bud', 'soch' as 'such', 'show' as 'shuk', 'syntax' as 'sintax', 'code' as 'cod', split words, missing capitalization, missing punctuation, filler words like 'um/uh/like' added).\n\n"
        "Output ONLY a valid JSON array of objects. Do not write any markdown code blocks (no ```json), no preamble, and no explanation. Only output raw JSON."
    )
    
    payload = json.dumps({
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "You output ONLY raw JSON arrays. Never wrap in markdown blocks, never add commentary."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 4096
    }).encode()
    
    req = urllib.request.Request(
        URL,
        data=payload,
        headers={
            "Content-Type": "application/json", 
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            content = data["choices"][0]["message"]["content"].strip()
            # If model wrapped it in markdown code block, strip it
            if content.startswith("```"):
                content = content.split("\n", 1)[1]
                if content.endswith("```"):
                    content = content.rsplit("\n", 1)[0]
            pairs = json.loads(content.strip())
            return pairs
    except Exception as e:
        print(f"\nError generating batch for category '{category}': {e}")
        return []

print("Starting generation of 1,000 synthetic training samples...")

for idx, cat in enumerate(categories):
    print(f"\n[Category {idx+1}/{len(categories)}] Generating samples for: {cat}")
    # Generate 4 batches of 50 samples for each category to get 200 samples per category
    for batch in range(4):
        print(f"  Batch {batch+1}/4...", end="", flush=True)
        pairs = generate_batch(cat, count=50)
        if pairs:
            for pair in pairs:
                dataset.append({
                    "instruction": "Clean up transcription errors, typos, and acoustic mishearings contextually. Preserve Hinglish and English words exactly as spoken. Do NOT translate to English.",
                    "input": f"<<<RAW_TRANSCRIPT_START>>>\n{pair['noisy']}\n<<<RAW_TRANSCRIPT_END>>>",
                    "output": pair["clean"]
                })
            print(f" Success ({len(pairs)} pairs added, total={len(dataset)})")
        else:
            print(" Failed")
        time.sleep(2) # Avoid rate limits to keep Groq happy

with open("hinglish_dataset.json", "w", encoding="utf-8") as f:
    json.dump(dataset, f, indent=2, ensure_ascii=False)

print(f"\nDone! Generated {len(dataset)} training samples saved to 'hinglish_dataset.json'.")
