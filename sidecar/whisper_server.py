#!/usr/bin/env python3
"""
Persistent Local Whisper Server using faster-whisper.
Exposes a POST /transcribe endpoint on localhost:11435.
Loads the Whisper model into memory once on startup.
"""
import json
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from faster_whisper import WhisperModel

print("Initializing persistent faster-whisper model ('base')...", flush=True)
try:
    model = WhisperModel("base", device="cpu", compute_type="int8")
    print("Whisper model loaded successfully.", flush=True)
except Exception as e:
    print(f"Error loading Whisper model: {e}", file=sys.stderr, flush=True)
    sys.exit(1)

class WhisperHTTPHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress default server logs on stdout/stderr to keep CLI neat
        pass

    def do_POST(self):
        if self.path == "/transcribe":
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length == 0:
                    self.send_response(400)
                    self.end_headers()
                    self.wfile.write(b"Empty request body")
                    return

                post_data = self.rfile.read(content_length)
                req = json.loads(post_data.decode('utf-8'))

                audio_file = req.get("file")
                language = req.get("language")
                prompt = req.get("prompt")

                if not audio_file or not os.path.exists(audio_file):
                    self.send_response(400)
                    self.end_headers()
                    self.wfile.write(b"Audio file not found")
                    return

                # Perform in-memory transcription
                segments, _ = model.transcribe(
                    audio_file,
                    beam_size=5,
                    language=language,
                    initial_prompt=prompt
                )
                text = " ".join(seg.text.strip() for seg in segments)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = json.dumps({"text": text})
                self.wfile.write(response.encode('utf-8'))

            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(f"Server error: {e}".encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run_server():
    port = 11435
    server_address = ('127.0.0.1', port)
    httpd = HTTPServer(server_address, WhisperHTTPHandler)
    print(f"Transcription server running on http://127.0.0.1:{port}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    print("Shutting down transcription server...", flush=True)

if __name__ == '__main__':
    run_server()
