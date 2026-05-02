use cpal::{
    traits::{DeviceTrait, HostTrait, StreamTrait},
    SampleFormat,
};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};

pub struct RecordingResult {
    pub samples: Vec<f32>,
    pub sample_rate: u32,
    pub channels: u16,
}

pub fn record(stop: Arc<AtomicBool>) -> RecordingResult {
    let host = cpal::default_host();

    let device = match host.default_input_device() {
        Some(d) => d,
        None => {
            eprintln!("No input device found");
            return RecordingResult { samples: vec![], sample_rate: 16000, channels: 1 };
        }
    };

    let config = match device.default_input_config() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Could not get input config: {e}");
            return RecordingResult { samples: vec![], sample_rate: 16000, channels: 1 };
        }
    };

    let sample_rate = config.sample_rate().0;
    let channels = config.channels();
    let samples: Arc<Mutex<Vec<f32>>> = Arc::new(Mutex::new(Vec::new()));

    let stream = {
        let buf = samples.clone();
        let err_fn = |e| eprintln!("Audio stream error: {e}");

        match config.sample_format() {
            SampleFormat::F32 => device.build_input_stream(
                &config.into(),
                move |data: &[f32], _| { buf.lock().unwrap().extend_from_slice(data); },
                err_fn,
                None,
            ),
            SampleFormat::I16 => device.build_input_stream(
                &config.into(),
                move |data: &[i16], _| {
                    let floats: Vec<f32> = data.iter().map(|&s| s as f32 / i16::MAX as f32).collect();
                    buf.lock().unwrap().extend(floats);
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
                    buf.lock().unwrap().extend(floats);
                },
                err_fn,
                None,
            ),
            SampleFormat::I32 => device.build_input_stream(
                &config.into(),
                move |data: &[i32], _| {
                    let floats: Vec<f32> = data.iter().map(|&s| s as f32 / i32::MAX as f32).collect();
                    buf.lock().unwrap().extend(floats);
                },
                err_fn,
                None,
            ),
            fmt => {
                eprintln!("Unsupported sample format: {fmt:?}");
                return RecordingResult { samples: vec![], sample_rate, channels };
            }
        }
    };

    let stream = match stream {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Failed to build input stream: {e}");
            return RecordingResult { samples: vec![], sample_rate, channels };
        }
    };

    if let Err(e) = stream.play() {
        eprintln!("Failed to start stream: {e}");
        return RecordingResult { samples: vec![], sample_rate, channels };
    }

    while !stop.load(Ordering::Relaxed) {
        std::thread::sleep(std::time::Duration::from_millis(10));
    }

    drop(stream);

    let data = samples.lock().unwrap().clone();
    RecordingResult { samples: data, sample_rate, channels }
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

// Always returns 16 kHz mono WAV — what Whisper is trained on.
pub fn to_wav(result: RecordingResult) -> Vec<u8> {
    use std::io::Cursor;

    let mono = to_mono(&result.samples, result.channels as usize);
    let resampled = resample_to_16k(&mono, result.sample_rate);

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
        for &s in &resampled {
            let sample = (s * i16::MAX as f32).clamp(i16::MIN as f32, i16::MAX as f32) as i16;
            writer.write_sample(sample).expect("WAV write failed");
        }
        writer.finalize().expect("WAV finalize failed");
    }

    buf
}
