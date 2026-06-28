FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

EXPOSE 11435

# ponytail: device="cpu" in server.py; for GPU change to "cuda" and use nvidia/cuda base image
CMD ["python", "server.py"]
