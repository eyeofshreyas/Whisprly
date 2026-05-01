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
                move |data: &[f32], _| {
                    buf.lock().unwrap().extend_from_slice(data);
                },
                err_fn,
                None,
            ),
            SampleFormat::I16 => device.build_input_stream(
                &config.into(),
                move |data: &[i16], _| {
                    let floats: Vec<f32> =
                        data.iter().map(|&s| s as f32 / i16::MAX as f32).collect();
                    buf.lock().unwrap().extend(floats);
                },
                err_fn,
                None,
            ),
            SampleFormat::U16 => device.build_input_stream(
                &config.into(),
                move |data: &[u16], _| {
                    let floats: Vec<f32> = data
                        .iter()
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
                    let floats: Vec<f32> =
                        data.iter().map(|&s| s as f32 / i32::MAX as f32).collect();
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

pub fn to_wav(result: RecordingResult) -> Vec<u8> {
    use std::io::Cursor;

    let spec = hound::WavSpec {
        channels: result.channels,
        sample_rate: result.sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let mut buf: Vec<u8> = Vec::new();
    {
        let cursor = Cursor::new(&mut buf);
        let mut writer = hound::WavWriter::new(cursor, spec).expect("WAV writer init failed");
        for &s in &result.samples {
            let sample = (s * i16::MAX as f32).clamp(i16::MIN as f32, i16::MAX as f32) as i16;
            writer.write_sample(sample).expect("WAV write failed");
        }
        writer.finalize().expect("WAV finalize failed");
    }

    buf
}
