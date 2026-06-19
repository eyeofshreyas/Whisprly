#[allow(deprecated)]
use cpal::{
    traits::{DeviceTrait, HostTrait, StreamTrait},
    SampleFormat,
};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};

pub fn record(stop: Arc<AtomicBool>, chunk_tx: std::sync::mpsc::Sender<Vec<f32>>) {
    let host = cpal::default_host();

    // Use the default input device — PipeWire/PulseAudio handles device
    // routing correctly on modern Linux; no need to prefer hw: directly.
    let device = match host.default_input_device() {
        Some(d) => {
            eprintln!("[audio] using device: {}", d.description().ok().map(|d| d.name().to_owned()).unwrap_or_else(|| "unknown".into()));
            d
        }
        None => { eprintln!("[audio] No input device found"); return; }
    };

    let config = match device.default_input_config() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Could not get input config: {e}");
            return;
        }
    };

    let sample_rate = config.sample_rate();
    let channels = config.channels();
    let samples: Arc<Mutex<Vec<f32>>> = Arc::new(Mutex::new(Vec::new()));

    let stream = {
        let buf = samples.clone();
        let err_fn = |e| eprintln!("Audio stream error: {e}");

        match config.sample_format() {
            SampleFormat::F32 => device.build_input_stream(
                &config.into(),
                move |data: &[f32], _| {
                    if let Ok(mut b) = buf.lock() {
                        b.extend_from_slice(data);
                    }
                },
                err_fn,
                None,
            ),
            SampleFormat::I16 => device.build_input_stream(
                &config.into(),
                move |data: &[i16], _| {
                    let floats: Vec<f32> = data.iter().map(|&s| s as f32 / i16::MAX as f32).collect();
                    if let Ok(mut b) = buf.lock() {
                        b.extend(floats);
                    }
                },
                err_fn,
                None,
            ),
            SampleFormat::U16 => device.build_input_stream(
                &config.into(),
                move |data: &[u16], _| {
                    let floats: Vec<f32> = data.iter()
                        .map(|&s| (s as f32 / u16::MAX as f32) * 2.0 - 1.0)
                        .collect();
                    if let Ok(mut b) = buf.lock() {
                        b.extend(floats);
                    }
                },
                err_fn,
                None,
            ),
            SampleFormat::I32 => device.build_input_stream(
                &config.into(),
                move |data: &[i32], _| {
                    let floats: Vec<f32> = data.iter().map(|&s| s as f32 / i32::MAX as f32).collect();
                    if let Ok(mut b) = buf.lock() {
                        b.extend(floats);
                    }
                },
                err_fn,
                None,
            ),
            fmt => {
                eprintln!("Unsupported sample format: {fmt:?}");
                return;
            }
        }
    };

    let stream = match stream {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Failed to build input stream: {e}");
            return;
        }
    };

    if let Err(e) = stream.play() {
        eprintln!("Failed to start stream: {e}");
        return;
    }

    while !stop.load(Ordering::Relaxed) {
        std::thread::sleep(std::time::Duration::from_millis(10));
    }

    drop(stream);

    let raw_samples = samples.lock().unwrap().clone();
    let rms = if raw_samples.is_empty() { 0.0 } else {
        (raw_samples.iter().map(|&s| s*s).sum::<f32>() / raw_samples.len() as f32).sqrt()
    };
    eprintln!("[audio] captured {} samples, RMS={:.4}", raw_samples.len(), rms);

    // Convert to mono and resample to 16kHz
    let mono = to_mono(&raw_samples, channels as usize);
    let mut resampled = resample_to_16k(&mono, sample_rate);

    // Normalize audio volume to standard 0.8 peak amplitude
    normalize_audio(&mut resampled);

    // Trim leading/trailing silence and apply minimum-duration gate.
    // Each speech frame is 480 samples = 30ms at 16kHz.
    // Fewer than 17 frames (< 510ms) = accidental press; discard.
    let trimmed = trim_silence(&resampled);
    if !trimmed.is_empty() && !is_silent(trimmed) {
        let speech_frames = trimmed.chunks(480)
            .filter(|frame| is_speech_frame(frame))
            .count();
        if speech_frames >= 17 {
            chunk_tx.send(trimmed.to_vec()).ok();
        } else {
            eprintln!("[audio] discarding: only {} speech frames (need ≥17)", speech_frames);
        }
    }
}

/// Dynamically scale audio gain to 0.8 peak amplitude to optimize for Whisper feature encoder.
pub fn normalize_audio(samples: &mut [f32]) {
    let mut max_peak = 0.0f32;
    for &s in samples.iter() {
        let abs = s.abs();
        if abs > max_peak {
            max_peak = abs;
        }
    }
    if max_peak > 0.01 && max_peak < 0.8 {
        let multiplier = 0.8 / max_peak;
        for s in samples.iter_mut() {
            *s *= multiplier;
        }
        eprintln!("[audio] normalized gain by multiplier: {:.2}", multiplier);
    }
}

/// Trim leading and trailing silence from the audio samples using 30ms (480-sample) frames.
pub fn trim_silence(samples: &[f32]) -> &[f32] {
    let mut start = 0;
    while start + 480 <= samples.len() {
        if is_speech_frame(&samples[start..start + 480]) {
            break;
        }
        start += 480;
    }

    let mut end = samples.len();
    while end >= start + 480 {
        if is_speech_frame(&samples[end - 480..end]) {
            break;
        }
        end -= 480;
    }

    if start >= end {
        &[]
    } else {
        &samples[start..end]
    }
}

/// Returns true when the recording is effectively silent (no speech detected).
/// RMS of 0.015 sits comfortably above ambient noise (~0.002–0.008) but below
/// even quiet whispering (~0.02+), so accidental short presses are suppressed.
pub fn is_silent(samples: &[f32]) -> bool {
    if samples.is_empty() {
        return true;
    }
    let rms = (samples.iter().map(|&s| s * s).sum::<f32>() / samples.len() as f32).sqrt();
    rms < 0.015
}

/// Returns true when the frame contains detectable speech.
/// Uses two RMS thresholds with hysteresis:
/// - Above SPEECH_THRESHOLD → definitely speech
/// - Below SILENCE_THRESHOLD → definitely silence
/// - Between the two → carry over previous state (handled by the Chunker)
pub fn is_speech_frame(frame: &[f32]) -> bool {
    const SPEECH_THRESHOLD: f32 = 0.02;
    if frame.is_empty() {
        return false;
    }
    let rms = (frame.iter().map(|&s| s * s).sum::<f32>() / frame.len() as f32).sqrt();
    rms >= SPEECH_THRESHOLD
}

// Mix all channels down to mono.
fn to_mono(samples: &[f32], channels: usize) -> Vec<f32> {
    if channels == 1 {
        return samples.to_vec();
    }
    samples.chunks(channels)
        .map(|frame| frame.iter().sum::<f32>() / channels as f32)
        .collect()
}

// Linear-interpolation resample to 16 kHz — good enough for voice.
fn resample_to_16k(samples: &[f32], from_rate: u32) -> Vec<f32> {
    if from_rate == 16000 {
        return samples.to_vec();
    }
    let ratio = from_rate as f64 / 16000.0;
    let out_len = (samples.len() as f64 / ratio).ceil() as usize;
    (0..out_len).map(|i| {
        let pos = i as f64 * ratio;
        let idx = pos as usize;
        let frac = (pos - idx as f64) as f32;
        let a = samples.get(idx).copied().unwrap_or(0.0);
        let b = samples.get(idx + 1).copied().unwrap_or(a);
        a + (b - a) * frac
    }).collect()
}

/// Encode a 16kHz mono f32 sample buffer to WAV bytes.
/// Used by the coordinator to encode Chunker output for transcription.
pub fn to_wav_from_samples(samples: Vec<f32>) -> Vec<u8> {
    use std::io::Cursor;
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate: 16000,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let mut buf: Vec<u8> = Vec::new();
    {
        let cursor = Cursor::new(&mut buf);
        let mut writer = hound::WavWriter::new(cursor, spec).expect("WAV writer init failed");
        for &s in &samples {
            let sample = (s * i16::MAX as f32).clamp(i16::MIN as f32, i16::MAX as f32) as i16;
            writer.write_sample(sample).expect("WAV write failed");
        }
        writer.finalize().expect("WAV finalize failed");
    }
    buf
}

// 17 × 30ms ≈ 510ms silence before flushing a chunk
#[allow(dead_code)]
const SILENCE_THRESHOLD_FRAMES: usize = 17;
// 10 × 30ms = 300ms minimum — discard sub-word fragments
#[allow(dead_code)]
const MIN_CHUNK_FRAMES: usize = 10;

#[allow(dead_code)]
pub struct Chunker {
    sender: std::sync::mpsc::Sender<Vec<f32>>,
    buffer: Vec<f32>,
    silence_count: usize,
    has_speech: bool,
}

#[allow(dead_code)]
impl Chunker {
    pub fn new(sender: std::sync::mpsc::Sender<Vec<f32>>) -> Self {
        Chunker { sender, buffer: Vec::new(), silence_count: 0, has_speech: false }
    }

    /// Push a 30ms frame. `is_speech` is the VAD decision for this frame.
    pub fn push_frame(&mut self, frame: &[f32], is_speech: bool) {
        if is_speech {
            self.has_speech = true;
            self.silence_count = 0;
            self.buffer.extend_from_slice(frame);
        } else if self.has_speech {
            self.silence_count += 1;
            self.buffer.extend_from_slice(frame);
            if self.silence_count >= SILENCE_THRESHOLD_FRAMES {
                self.emit();
            }
        }
    }

    /// Call on hotkey release to flush any in-progress speech segment.
    pub fn flush(&mut self) {
        if self.has_speech {
            self.emit();
        }
    }

    fn emit(&mut self) {
        let frame_count = self.buffer.len() / 480;
        if frame_count >= MIN_CHUNK_FRAMES {
            self.sender.send(self.buffer.clone()).ok();
        }
        self.buffer.clear();
        self.silence_count = 0;
        self.has_speech = false;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classify_silence_as_non_speech() {
        // 480 f32 zero samples = 30ms of silence at 16kHz
        let silence = vec![0.0f32; 480];
        assert!(!is_speech_frame(&silence), "zeros must be non-speech");
    }

    #[test]
    fn classify_loud_tone_as_speech() {
        // 480 samples at 0.5 amplitude — well above speech threshold
        let tone = vec![0.5f32; 480];
        assert!(is_speech_frame(&tone), "loud tone must be speech");
    }

    #[test]
    fn chunker_emits_after_silence_threshold() {
        let (tx, rx) = std::sync::mpsc::channel();
        let mut chunker = Chunker::new(tx);

        // 20 speech frames (600ms) then 20 silence frames (600ms > 510ms threshold)
        for _ in 0..20 { chunker.push_frame(&[0.5f32; 480], true); }
        for _ in 0..20 { chunker.push_frame(&[0.0f32; 480], false); }

        let chunk = rx.try_recv().expect("chunk must be emitted after silence threshold");
        assert!(!chunk.is_empty(), "emitted chunk must have samples");
    }

    #[test]
    fn chunker_flush_emits_buffered_speech() {
        let (tx, rx) = std::sync::mpsc::channel();
        let mut chunker = Chunker::new(tx);

        for _ in 0..15 { chunker.push_frame(&[0.5f32; 480], true); }
        chunker.flush();

        rx.try_recv().expect("flush must emit buffered speech");
    }

    #[test]
    fn chunker_discards_short_chunks() {
        let (tx, rx) = std::sync::mpsc::channel();
        let mut chunker = Chunker::new(tx);

        // Only 5 frames = 150ms — below MIN_CHUNK_FRAMES (10 × 30ms = 300ms)
        for _ in 0..5 { chunker.push_frame(&[0.5f32; 480], true); }
        chunker.flush();

        assert!(rx.try_recv().is_err(), "chunk under 300ms must be discarded");
    }

    #[test]
    fn min_duration_gate_rejects_short_audio() {
        // 10 speech frames = 300ms — below 510ms gate
        let short = vec![0.5f32; 480 * 10];
        let count = short.chunks(480)
            .filter(|f| is_speech_frame(f))
            .count();
        assert!(count < 17, "10 speech frames must be below gate (got {count})");
    }

    #[test]
    fn min_duration_gate_passes_long_audio() {
        // 20 speech frames = 600ms — above 510ms gate
        let long = vec![0.5f32; 480 * 20];
        let count = long.chunks(480)
            .filter(|f| is_speech_frame(f))
            .count();
        assert!(count >= 17, "20 speech frames must pass gate (got {count})");
    }
}
