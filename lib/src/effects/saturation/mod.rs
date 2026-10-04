use std::f64::consts::LN_2;

use wasm_bindgen::prelude::*;

use crate::utilities::common::biquad::Biquad;
use crate::utilities::common::state::State;
use crate::utilities::constants::DEFAULT_SAMPLE_RATE;
use crate::utilities::helpers::rbj::rbj_lowpass;

const MAX_DRIVE_DB: f32 = 48.0;
const MAX_OUTPUT_GAIN_DB: f32 = 24.0;
const MIN_TONE_HZ: f32 = 200.0;

/// Below this input difference, ADAA falls back to evaluating the curve directly.
const ADAA_EPSILON: f64 = 1.0e-5;

/// Cutoff of the DC blocker that removes the offset created by asymmetric curves.
const DC_BLOCKER_HZ: f32 = 10.0;

/// Offset that makes the tube curve asymmetric (adds even harmonics).
const TUBE_BIAS: f64 = 0.25;

const MODE_SOFT: u32 = 0;
const MODE_TUBE: u32 = 1;
const MODE_TAPE: u32 = 2;

/// ln(cosh(x)), computed without overflowing for large |x|.
fn ln_cosh(x: f64) -> f64 {
    let a = x.abs();
    a + (-2.0 * a).exp().ln_1p() - LN_2
}

/// Saturation with first-order antiderivative anti-aliasing (ADAA).
///
/// Instead of evaluating the waveshaping curve f(x) directly, ADAA outputs
/// (F(x[n]) - F(x[n-1])) / (x[n] - x[n-1]), where F is the antiderivative of f.
/// This strongly reduces aliasing at a fraction of the cost of oversampling.
///
/// Curves (`mode`):
/// - 0 = soft: tanh. Smooth, symmetric, odd harmonics.
/// - 1 = tube: biased tanh. Asymmetric, adds even harmonics. A DC blocker removes the offset.
/// - 2 = tape: x / (1 + |x|). Gentler knee, compresses more gradually.
///
/// `drive` (dB) pushes the signal into the curve. `tone` is a lowpass after the curve
/// (Hz, 0 = off). `mix` blends the dry and saturated signal. `output_gain` (dB) is
/// applied to the saturated signal. The saturated signal is also scaled by
/// 1 / sqrt(drive), which keeps the perceived loudness roughly constant.
#[wasm_bindgen]
pub struct Saturation {
    sample_rate: f32,

    drive_db: f32,
    mode: u32,
    tone_hz: f32,
    mix: f32,
    output_gain_db: f32,

    drive: f64,
    compensation: f32,
    output_gain: f32,

    previous_input: f64,

    tone: Biquad,
    tone_state: State,
    tone_enabled: bool,

    dc_coefficient: f32,
    dc_previous_input: f32,
    dc_previous_output: f32,
}

#[wasm_bindgen]
impl Saturation {
    fn sanitize(value: f32, min: f32, max: f32, fallback: f32) -> f32 {
        if value.is_finite() {
            value.clamp(min, max)
        } else {
            fallback.clamp(min, max)
        }
    }

    fn curve(&self, x: f64) -> f64 {
        match self.mode {
            MODE_TUBE => (x + TUBE_BIAS).tanh() - TUBE_BIAS.tanh(),
            MODE_TAPE => x / (1.0 + x.abs()),
            _ => x.tanh(),
        }
    }

    fn antiderivative(&self, x: f64) -> f64 {
        match self.mode {
            MODE_TUBE => ln_cosh(x + TUBE_BIAS) - TUBE_BIAS.tanh() * x,
            MODE_TAPE => x.abs() - x.abs().ln_1p(),
            _ => ln_cosh(x),
        }
    }

    fn update_drive(&mut self) {
        self.drive = 10.0_f64.powf(self.drive_db as f64 / 20.0);
        self.compensation = (1.0 / self.drive.sqrt()) as f32;
    }

    fn update_tone(&mut self) {
        let nyquist = self.sample_rate * 0.5 * 0.99;

        self.tone_enabled = self.tone_hz >= MIN_TONE_HZ && self.tone_hz < nyquist;
        self.tone = if self.tone_enabled {
            rbj_lowpass(self.sample_rate, self.tone_hz, 0.7071)
        } else {
            Biquad::passthrough()
        };
    }

    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32, drive_db: f32, mode: u32, tone_hz: f32, mix: f32, output_gain_db: f32) -> Saturation {
        let sr = if sample_rate.is_finite() { sample_rate.max(1.0) } else { DEFAULT_SAMPLE_RATE };

        let mut saturation = Saturation {
            sample_rate: sr,

            drive_db: Self::sanitize(drive_db, 0.0, MAX_DRIVE_DB, 12.0),
            mode: if mode <= MODE_TAPE { mode } else { MODE_SOFT },
            tone_hz: Self::sanitize(tone_hz, 0.0, sr * 0.5, 0.0),
            mix: Self::sanitize(mix, 0.0, 1.0, 1.0),
            output_gain_db: Self::sanitize(output_gain_db, -MAX_OUTPUT_GAIN_DB, MAX_OUTPUT_GAIN_DB, 0.0),

            drive: 1.0,
            compensation: 1.0,
            output_gain: 1.0,

            previous_input: 0.0,

            tone: Biquad::passthrough(),
            tone_state: State::new(),
            tone_enabled: false,

            dc_coefficient: 1.0 - (2.0 * std::f32::consts::PI * DC_BLOCKER_HZ / sr),
            dc_previous_input: 0.0,
            dc_previous_output: 0.0,
        };

        saturation.update_drive();
        saturation.update_tone();
        saturation.output_gain = 10.0_f32.powf(saturation.output_gain_db / 20.0);
        saturation
    }

    pub fn set_drive(&mut self, drive_db: f32) {
        self.drive_db = Self::sanitize(drive_db, 0.0, MAX_DRIVE_DB, self.drive_db);
        self.update_drive();
    }

    pub fn set_mode(&mut self, mode: u32) {
        self.mode = if mode <= MODE_TAPE { mode } else { MODE_SOFT };
    }

    pub fn set_tone(&mut self, tone_hz: f32) {
        self.tone_hz = Self::sanitize(tone_hz, 0.0, self.sample_rate * 0.5, self.tone_hz);
        self.update_tone();
    }

    pub fn set_mix(&mut self, mix: f32) {
        self.mix = Self::sanitize(mix, 0.0, 1.0, self.mix);
    }

    pub fn set_output_gain(&mut self, output_gain_db: f32) {
        self.output_gain_db = Self::sanitize(output_gain_db, -MAX_OUTPUT_GAIN_DB, MAX_OUTPUT_GAIN_DB, self.output_gain_db);
        self.output_gain = 10.0_f32.powf(self.output_gain_db / 20.0);
    }

    pub fn reset(&mut self) {
        self.previous_input = 0.0;
        self.tone_state.reset();
        self.dc_previous_input = 0.0;
        self.dc_previous_output = 0.0;
    }

    pub fn process(&mut self, buffer: &mut [f32]) {
        for sample in buffer.iter_mut() {
            let dry = *sample;
            let x = dry as f64 * self.drive;
            let previous = self.previous_input;

            let shaped = if (x - previous).abs() < ADAA_EPSILON {
                self.curve(0.5 * (x + previous))
            } else {
                (self.antiderivative(x) - self.antiderivative(previous)) / (x - previous)
            };

            self.previous_input = x;

            let mut y = shaped as f32;

            // DC blocker: y[n] = x[n] - x[n-1] + R * y[n-1]
            let dc_input = y;
            y = dc_input - self.dc_previous_input + self.dc_coefficient * self.dc_previous_output;
            self.dc_previous_input = dc_input;
            self.dc_previous_output = y;

            if self.tone_enabled {
                y = self.tone.process_sample(&mut self.tone_state, y);
            }

            y *= self.compensation * self.output_gain;

            let mixed = dry * (1.0 - self.mix) + y * self.mix;
            *sample = if mixed.is_finite() { mixed } else { 0.0 };
        }
    }

    pub fn get_drive(&self) -> f32 { self.drive_db }
    pub fn get_mode(&self) -> u32 { self.mode }
    pub fn get_tone(&self) -> f32 { self.tone_hz }
    pub fn get_mix(&self) -> f32 { self.mix }
    pub fn get_output_gain(&self) -> f32 { self.output_gain_db }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn antiderivatives_match_curves() {
        // The numerical derivative of F must equal f for every curve.
        for mode in [MODE_SOFT, MODE_TUBE, MODE_TAPE] {
            let s = Saturation::new(48000.0, 0.0, mode, 0.0, 1.0, 0.0);

            for &x in &[-3.0, -1.0, -0.2, 0.3, 1.5, 4.0] {
                let h = 1.0e-5;
                let derivative = (s.antiderivative(x + h) - s.antiderivative(x - h)) / (2.0 * h);
                assert!((derivative - s.curve(x)).abs() < 1.0e-4, "mode {mode}, x {x}");
            }
        }
    }

    #[test]
    fn output_is_bounded_and_finite() {
        let mut s = Saturation::new(48000.0, 36.0, MODE_SOFT, 0.0, 1.0, 0.0);
        let mut buffer: Vec<f32> = (0..512).map(|i| ((i as f32) * 0.05).sin() * 4.0).collect();

        s.process(&mut buffer);

        assert!(buffer.iter().all(|v| v.is_finite() && v.abs() < 2.0));
    }
}
