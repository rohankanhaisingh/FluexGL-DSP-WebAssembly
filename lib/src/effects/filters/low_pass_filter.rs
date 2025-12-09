/**
 * Low pass filter. 
 * 
 * This filter is a very basic filter
 * passing only low frequencies through.
 * The roll-off is set to 6 dB, which is the natural
 * way of filters.
 */

use std::f32::consts::PI;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct LowPass {
    sample_rate: f32,
    cutoff: f32,
    alpha: f32,
    min_freq: f32,
    z1: f32,
}

#[wasm_bindgen]
impl LowPass {
    pub fn new(sample_rate: f32, cutoff: f32) -> LowPass {
        let mut low_pass_filter: LowPass = LowPass {
            sample_rate,
            cutoff,
            alpha: 0.0,
            min_freq: 10.0,
            z1: 0.0,
        };

        low_pass_filter.update_coefficients();
        low_pass_filter
    }

    pub fn set_cutoff(&mut self, cutoff: f32) {
        self.cutoff = cutoff;
        self.update_coefficients();
    }

    pub fn set_min_freq(&mut self, min_freq: f32) {
        self.min_freq = min_freq;
        self.update_coefficients();
    }

    pub fn set_sample_rate(&mut self, sample_rate: f32) {
        self.sample_rate = sample_rate;
        self.update_coefficients();
    }  

    pub fn reset(&mut self) {
        self.z1 = 0.0;
    }

    fn update_coefficients(&mut self) {
        let mut fc: f32 = self.cutoff;

        if fc < self.min_freq {
            fc = self.min_freq;
        }

        if fc > self.sample_rate * 0.45 {
            fc = self.sample_rate * 0.45;
        }

        let omega: f32 = 2.0 * PI * fc;

        self.alpha = omega / (omega + self.sample_rate);
    }

    pub fn process(&mut self, buffer: &mut [f32]) {
        let mut y_previous: f32 = self.z1;

        let alpha: &f32 = &self.alpha;

        for sample in buffer.iter_mut() {
            let input: f32 = *sample;
            let y: f32 = y_previous + alpha * (input - y_previous);

            y_previous = y;
            *sample = y;
        }

        self.z1 = y_previous;
    }
}
