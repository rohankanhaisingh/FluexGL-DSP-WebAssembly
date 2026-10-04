use wasm_bindgen::prelude::*;

use crate::utilities::common::biquad::Biquad;
use crate::utilities::common::state::State;
use crate::utilities::constants::DEFAULT_SAMPLE_RATE;
use crate::utilities::helpers::rbj::{
    rbj_bandpass, rbj_highpass, rbj_highshelf, rbj_lowpass, rbj_lowshelf, rbj_notch, rbj_peaking,
};

/// Maximum number of bands per equalizer.
pub const MAX_BANDS: usize = 8;

const MIN_FREQUENCY: f32 = 10.0;
const MIN_Q: f32 = 0.1;
const MAX_Q: f32 = 24.0;
const MAX_GAIN_DB: f32 = 24.0;

const BAND_PEAKING: u32 = 0;
const BAND_LOW_SHELF: u32 = 1;
const BAND_HIGH_SHELF: u32 = 2;
const BAND_LOW_PASS: u32 = 3;
const BAND_HIGH_PASS: u32 = 4;
const BAND_NOTCH: u32 = 5;
const BAND_BAND_PASS: u32 = 6;

#[derive(Clone, Copy)]
struct Band {
    band_type: u32,
    frequency: f32,
    gain_db: f32,
    q: f32,
    enabled: bool,
    coefficients: Biquad,
    state: State,
}

impl Band {
    fn disabled() -> Band {
        Band {
            band_type: BAND_PEAKING,
            frequency: 1000.0,
            gain_db: 0.0,
            q: 0.7071,
            enabled: false,
            coefficients: Biquad::passthrough(),
            state: State::new(),
        }
    }
}

/// A parametric equalizer with up to eight bands, processed in series.
///
/// Band types: 0 = peaking, 1 = low shelf, 2 = high shelf, 3 = lowpass,
/// 4 = highpass, 5 = notch, 6 = bandpass. The gain only applies to the
/// peaking and shelf types.
#[wasm_bindgen]
pub struct Equalizer {
    sample_rate: f32,
    bands: [Band; MAX_BANDS],
    output_gain_db: f32,
    output_gain: f32,
}

#[wasm_bindgen]
impl Equalizer {
    fn sanitize_sample_rate(sample_rate: f32) -> f32 {
        if sample_rate.is_finite() {
            sample_rate.max(1.0)
        } else {
            DEFAULT_SAMPLE_RATE
        }
    }

    fn sanitize(value: f32, min: f32, max: f32, fallback: f32) -> f32 {
        if value.is_finite() {
            value.clamp(min, max)
        } else {
            fallback.clamp(min, max)
        }
    }

    fn coefficients(&self, band: &Band) -> Biquad {
        let sr = self.sample_rate;
        let f = band.frequency;
        let q = band.q;
        let g = band.gain_db;

        match band.band_type {
            BAND_LOW_SHELF => rbj_lowshelf(sr, f, q, g),
            BAND_HIGH_SHELF => rbj_highshelf(sr, f, q, g),
            BAND_LOW_PASS => rbj_lowpass(sr, f, q),
            BAND_HIGH_PASS => rbj_highpass(sr, f, q),
            BAND_NOTCH => rbj_notch(sr, f, q),
            BAND_BAND_PASS => rbj_bandpass(sr, f, q),
            _ => rbj_peaking(sr, f, q, g),
        }
    }

    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32) -> Equalizer {
        Equalizer {
            sample_rate: Self::sanitize_sample_rate(sample_rate),
            bands: [Band::disabled(); MAX_BANDS],
            output_gain_db: 0.0,
            output_gain: 1.0,
        }
    }

    /// Configures a band. Indices outside 0..8 are ignored. The filter state of the
    /// band is kept, so changing a band while audio plays does not click.
    pub fn set_band(&mut self, index: u32, band_type: u32, frequency: f32, gain_db: f32, q: f32, enabled: bool) {
        let index = index as usize;

        if index >= MAX_BANDS {
            return;
        }

        let nyquist = self.sample_rate * 0.5 * 0.99;
        let previous = self.bands[index];

        let mut band = Band {
            band_type: if band_type <= BAND_BAND_PASS { band_type } else { BAND_PEAKING },
            frequency: Self::sanitize(frequency, MIN_FREQUENCY, nyquist, previous.frequency),
            gain_db: Self::sanitize(gain_db, -MAX_GAIN_DB, MAX_GAIN_DB, previous.gain_db),
            q: Self::sanitize(q, MIN_Q, MAX_Q, previous.q),
            enabled,
            coefficients: Biquad::passthrough(),
            state: previous.state,
        };

        band.coefficients = self.coefficients(&band);

        // Start from a clean state when a band is switched on, to avoid stale history.
        if enabled && !previous.enabled {
            band.state.reset();
        }

        self.bands[index] = band;
    }

    pub fn set_output_gain(&mut self, gain_db: f32) {
        self.output_gain_db = Self::sanitize(gain_db, -MAX_GAIN_DB, MAX_GAIN_DB, self.output_gain_db);
        self.output_gain = 10.0_f32.powf(self.output_gain_db / 20.0);
    }

    pub fn reset(&mut self) {
        for band in self.bands.iter_mut() {
            band.state.reset();
        }
    }

    pub fn process(&mut self, buffer: &mut [f32]) {
        for sample in buffer.iter_mut() {
            let mut x = *sample;

            for band in self.bands.iter_mut() {
                if band.enabled {
                    x = band.coefficients.process_sample(&mut band.state, x);
                }
            }

            x *= self.output_gain;
            *sample = if x.is_finite() { x } else { 0.0 };
        }
    }

    pub fn get_output_gain(&self) -> f32 { self.output_gain_db }
    pub fn get_band_count(&self) -> u32 { MAX_BANDS as u32 }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Gain (as a linear ratio) of the equalizer for a sine at `frequency`, measured as RMS out / RMS in.
    fn sine_peak(eq: &mut Equalizer, frequency: f32) -> f32 {
        let sr = 48000.0;
        let input: Vec<f32> = (0..48000).map(|i| (2.0 * std::f32::consts::PI * frequency * i as f32 / sr).sin()).collect();
        let mut buffer = input.clone();

        eq.process(&mut buffer);

        // Skip the first half, so the filters have settled.
        let rms = |b: &[f32]| (b.iter().map(|v| v * v).sum::<f32>() / b.len() as f32).sqrt();
        rms(&buffer[24000..]) / rms(&input[24000..])
    }

    #[test]
    fn disabled_equalizer_is_transparent() {
        let mut eq = Equalizer::new(48000.0);
        assert!((sine_peak(&mut eq, 1000.0) - 1.0).abs() < 1.0e-3);
    }

    #[test]
    fn peaking_band_boosts_its_center_frequency() {
        let mut eq = Equalizer::new(48000.0);
        eq.set_band(0, BAND_PEAKING, 1000.0, 6.0, 1.0, true);

        let gain_db = 20.0 * sine_peak(&mut eq, 1000.0).log10();
        assert!((gain_db - 6.0).abs() < 0.1, "gain {gain_db}");
    }

    #[test]
    fn low_shelf_cuts_low_frequencies_only() {
        let mut eq = Equalizer::new(48000.0);
        eq.set_band(0, BAND_LOW_SHELF, 200.0, -12.0, 0.7071, true);

        let low_db = 20.0 * sine_peak(&mut eq, 30.0).log10();
        eq.reset();
        let high_db = 20.0 * sine_peak(&mut eq, 8000.0).log10();

        assert!((low_db + 12.0).abs() < 0.5, "low {low_db}");
        assert!(high_db.abs() < 0.2, "high {high_db}");
    }
}
