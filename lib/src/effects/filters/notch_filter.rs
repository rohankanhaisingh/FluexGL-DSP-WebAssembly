use wasm_bindgen::prelude::*;

use crate::utilities::common::biquad::Biquad;
use crate::utilities::common::state::State;
use crate::utilities::helpers::filter_params::normalize_notch_params;
use crate::utilities::helpers::rbj::rbj_notch;
use crate::utilities::helpers::sanitize_sample_rate::sanitize_sample_rate;

use crate::utilities::constants::*;

#[wasm_bindgen]
pub struct NotchFilter {
    sample_rate: f32,
    cutoff: f32,
    q: f32,
    min_freq: f32,
    biquad: Biquad,
    state: State,
}

#[wasm_bindgen]
impl NotchFilter {
    fn set_passthrough(&mut self) {
        self.biquad = Biquad::passthrough();
    }

    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32, cutoff: f32, q: f32) -> NotchFilter {
        let mut notch = NotchFilter {
            sample_rate: sanitize_sample_rate(sample_rate),
            cutoff: if cutoff.is_finite() { cutoff.max(0.0) } else { DEFAULT_CUTOFF },
            q: if q.is_finite() { q.max(MIN_RESONANCE) } else { DEFAULT_RESONANCE },
            min_freq: 10.0,
            biquad: Biquad::passthrough(),
            state: State::new(),
        };

        notch.update_coefficients();
        notch
    }

    pub fn set_cutoff(&mut self, cutoff: f32) {
        if cutoff.is_finite() {
            self.cutoff = cutoff.max(0.0);
        }
        self.update_coefficients();
    }

    pub fn set_q(&mut self, q: f32) {
        if q.is_finite() {
            self.q = q.max(MIN_RESONANCE);
        }
        self.update_coefficients();
    }

    pub fn set_sample_rate(&mut self, sample_rate: f32) {
        self.sample_rate = sanitize_sample_rate(sample_rate);
        self.update_coefficients();
    }

    pub fn set_min_freq(&mut self, min_freq: f32) {
        if min_freq.is_finite() {
            self.min_freq = min_freq.max(0.0);
        }
        self.update_coefficients();
    }

    pub fn reset(&mut self) {
        self.state.reset();
    }

    fn update_coefficients(&mut self) {
        let Some((frequency_cutoff, resonance, sample_rate)) = normalize_notch_params(
            self.sample_rate,
            self.cutoff,
            self.q,
            self.min_freq,
        ) else {
            self.set_passthrough();
            return;
        };

        self.sample_rate = sample_rate;
        self.biquad = rbj_notch(sample_rate, frequency_cutoff, resonance);
    }

    pub fn process(&mut self, buffer: &mut [f32]) {
        for sample in buffer.iter_mut() {
            *sample = self.biquad.process_sample(&mut self.state, *sample);
        }
    }
}
