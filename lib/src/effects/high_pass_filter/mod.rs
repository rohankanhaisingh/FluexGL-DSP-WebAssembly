use wasm_bindgen::prelude::*;

use crate::utilities::common::biquad::Biquad;
use crate::utilities::common::state::State;
use crate::utilities::helpers::filter_params::normalize_highpass_params;
use crate::utilities::helpers::rbj::rbj_highpass;
use crate::utilities::helpers::sanitize_sample_rate::sanitize_sample_rate;

use crate::utilities::constants::*;

#[wasm_bindgen]
pub struct HighPassFilter {
    sample_rate: f32,
    cutoff: f32,
    q: f32,
    max_freq: f32,
    biquad: Biquad,
    state: State,
}

#[wasm_bindgen]
impl HighPassFilter {
    fn set_passthrough(&mut self) {
        self.biquad = Biquad::passthrough();
    }

    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32, cutoff: f32, q: f32) -> HighPassFilter {
        let sr = sanitize_sample_rate(sample_rate);

        let mut hp = HighPassFilter {
            sample_rate: sr,
            cutoff: if cutoff.is_finite() {
                cutoff.max(0.0)
            } else {
                DEFAULT_CUTOFF
            },
            q: if q.is_finite() {
                q.max(MIN_RESONANCE)
            } else {
                DEFAULT_RESONANCE
            },
            // Requested behavior: default max frequency equals sample rate.
            max_freq: sr,
            biquad: Biquad::passthrough(),
            state: State::new(),
        };

        hp.update_coefficients();
        hp
    }

    pub fn set_cutoff(&mut self, cutoff: f32) {
        if cutoff.is_finite() {
            self.cutoff = cutoff.max(0.0);
            self.update_coefficients();
        }
    }

    pub fn set_q(&mut self, q: f32) {
        if q.is_finite() {
            self.q = q.max(MIN_RESONANCE);
            self.update_coefficients();
        }
    }

    pub fn set_sample_rate(&mut self, sample_rate: f32) {
        self.sample_rate = sanitize_sample_rate(sample_rate);
        self.update_coefficients();
    }

    pub fn set_max_freq(&mut self, max_freq: f32) {
        if max_freq.is_finite() {
            self.max_freq = max_freq.max(0.0);
            self.update_coefficients();
        }
    }

    pub fn reset(&mut self) {
        self.state.reset();
    }

    fn update_coefficients(&mut self) {
        let Some((frequency_cutoff, resonance, sample_rate)) = normalize_highpass_params(
            self.sample_rate,
            self.cutoff,
            self.q,
            self.max_freq,
        ) else {
            self.set_passthrough();
            return;
        };

        self.sample_rate = sample_rate;
        self.biquad = rbj_highpass(sample_rate, frequency_cutoff, resonance);
    }

    pub fn process(&mut self, buffer: &mut [f32]) {
        for sample in buffer.iter_mut() {
            *sample = self.biquad.process_sample(&mut self.state, *sample);
        }
    }
}
