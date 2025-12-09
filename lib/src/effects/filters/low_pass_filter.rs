use std::f32::consts::PI;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct LowPass {
    sample_rate: f32,
    cutoff: f32,
    min_freq: f32,
    a0: f32,
    b1: f32,
    z1: f32,
}

#[wasm_bindgen]
impl LowPass {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32, cutoff: f32) -> LowPass {
        let mut lp = LowPass {
            sample_rate,
            cutoff,
            min_freq: 10.0,
            a0: 0.0,
            b1: 0.0,
            z1: 0.0,
        };

        lp.update_coefficients();
        lp
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
        let mut fc = self.cutoff;

        if fc < self.min_freq {
            fc = self.min_freq;
        }

        let nyquist = self.sample_rate * 0.5;
        if fc > nyquist {
            fc = nyquist;
        }

        // 1-pole low-pass: y[n] = a0 * x[n] + b1 * y[n-1]
        // x = e^(-2π fc / fs)
        let x = (-2.0 * PI * fc / self.sample_rate).exp();

        self.a0 = 1.0 - x;
        self.b1 = x;
    }

    pub fn process(&mut self, buffer: &mut [f32]) {
        let a0 = self.a0;
        let b1 = self.b1;
        let mut y_prev = self.z1;

        for sample in buffer.iter_mut() {
            let x = *sample;
            let y = a0 * x + b1 * y_prev;
            y_prev = y;
            *sample = y;
        }

        self.z1 = y_prev;
    }
}
