#!/usr/bin/env node
// Downloads the correct Ollama binary for the current build platform.
// Only needed on Linux (AppImage bundles it); Windows installs at runtime via winget.
import https from 'https';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.platform !== 'linux') {
  console.log('fetch-ollama: skipping (not Linux)');
  process.exit(0);
}

const binDir = path.join(__dirname, '..', 'src-tauri', 'binaries');
const dest   = path.join(binDir, 'ollama-x86_64-unknown-linux-gnu');

if (fs.existsSync(dest)) {
  console.log('fetch-ollama: ollama binary already present, skipping download');
  process.exit(0);
}

fs.mkdirSync(binDir, { recursive: true });

// Ollama >= 0.2 ships as ollama-linux-amd64.tar.zst (not a standalone binary)
const url = 'https://github.com/ollama/ollama/releases/latest/download/ollama-linux-amd64.tar.zst';
const archiveDest = path.join(binDir, 'ollama-linux-amd64.tar.zst');

console.log(`fetch-ollama: downloading ${url}`);

function download(url, dest, redirects) {
  if (redirects > 10) { console.error('Too many redirects'); process.exit(1); }
  https.get(url, { headers: { 'User-Agent': 'wisperflow-build' } }, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      return download(res.headers.location, dest, redirects + 1);
    }
    if (res.statusCode !== 200) {
      console.error(`HTTP ${res.statusCode}`);
      process.exit(1);
    }
    const out = fs.createWriteStream(dest);
    res.pipe(out);
    out.on('finish', () => {
      out.close();
      extractBinary();
    });
  }).on('error', (e) => { console.error(e); process.exit(1); });
}

function extractBinary() {
  console.log('fetch-ollama: extracting binary from archive...');
  const tmpDir = path.join(binDir, '_ollama_extract');
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    // Extract the archive; ollama binary lives at bin/ollama inside the tarball
    execSync(`tar --use-compress-program=zstd -xf "${archiveDest}" -C "${tmpDir}"`, { stdio: 'inherit' });
    const extracted = path.join(tmpDir, 'bin', 'ollama');
    if (!fs.existsSync(extracted)) {
      // Fallback: search for the ollama binary anywhere in the extracted tree
      const found = execSync(`find "${tmpDir}" -name ollama -type f`).toString().trim().split('\n')[0];
      if (!found) { console.error('fetch-ollama: could not find ollama binary in archive'); process.exit(1); }
      fs.renameSync(found, dest);
    } else {
      fs.renameSync(extracted, dest);
    }
    fs.chmodSync(dest, 0o755);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.rmSync(archiveDest, { force: true });
  }
  console.log('fetch-ollama: done');
}

download(url, archiveDest, 0);
