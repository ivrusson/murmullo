use anyhow::Result;
use hound::{SampleFormat, WavSpec, WavWriter};
use std::io::Cursor;

pub fn samples_to_wav_bytes(audio_data: &[f32], sample_rate: u32) -> Result<Vec<u8>> {
    let spec = WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: SampleFormat::Int,
    };
    let mut cursor = Cursor::new(Vec::new());
    {
        let mut writer = WavWriter::new(&mut cursor, spec)?;
        for &sample in audio_data {
            let clamped = sample.clamp(-1.0, 1.0);
            writer.write_sample((clamped * i16::MAX as f32) as i16)?;
        }
        writer.finalize()?;
    }
    Ok(cursor.into_inner())
}

pub async fn transcribe_samples(
    base_url: &str,
    audio_data: &[f32],
    sample_rate: u32,
    language: Option<String>,
) -> Result<String> {
    let wav = samples_to_wav_bytes(audio_data, sample_rate)?;
    crate::pipeline::log(
        "stt",
        format!(
            "wav encoded {} samples @ {}Hz -> {} bytes",
            audio_data.len(),
            sample_rate,
            wav.len()
        ),
    );
    crate::runtime::transcribe_wav_at(base_url, wav, language).await
}
