#!/usr/bin/env python3
"""
Persistent local Whisper transcription server.
Loads faster-whisper 'small' model + Silero VAD once at startup.
POST /transcribe  →  {"segments": [{"text": "...", "no_speech_prob": 0.02}]}
"""
import os
import sys
from contextlib import asynccontextmanager
from typing import Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from faster_whisper import WhisperModel
from pydantic import BaseModel

_model: Optional[WhisperModel] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _model
    print("[whisper_server] Loading 'small' model (first run may download ~145MB)...", flush=True)
    try:
        _model = WhisperModel("small", device="cpu", compute_type="int8")
        print("[whisper_server] Model ready.", flush=True)
    except Exception as exc:
        print(f"[whisper_server] Failed to load model: {exc}", file=sys.stderr, flush=True)
        sys.exit(1)
    yield


app = FastAPI(lifespan=lifespan)


class TranscribeRequest(BaseModel):
    file: str
    language: Optional[str] = None
    prompt: Optional[str] = None


@app.post("/transcribe")
async def transcribe(req: TranscribeRequest):
    if not os.path.exists(req.file):
        raise HTTPException(status_code=400, detail=f"Audio file not found: {req.file}")

    try:
        segments_gen, _ = _model.transcribe(
            req.file,
            beam_size=5,
            language=req.language or None,
            initial_prompt=req.prompt or None,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 500},
        )
        segments = [
            {"text": seg.text.strip(), "no_speech_prob": seg.no_speech_prob}
            for seg in segments_gen
            if seg.text.strip()
        ]
        return {"segments": segments}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=11435, log_level="error")
