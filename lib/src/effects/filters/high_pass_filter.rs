use std::f32::consts::PI;
use wasm_bindgen::prelude::*;

use crate::utilities::helpers::sanitize_sample_rate::*;

#[wasm_bindgen]
pub struct HighPassFilter {
    sample_rate: f32,
    cutoff: f32,
    q: f32,
    max_freq: f32,
    b0: f32,
    b1: f32,
    b2: f32,
    a1: f32,
    a2: f32,
    x1: f32,
    x2: f32,
    y1: f32,
    y2: f32,
}

#[wasm_bindgen]
impl HighPassFilter {
    fn set_passthrough_coefficients(&mut self) {
        self.b0 = 1.0;
        self.b1 = 0.0;
        self.b2 = 0.0;
        self.a1 = 0.0;
        self.a2 = 0.0;
    }

    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32, cutoff: f32, q: f32) -> HighPassFilter {
        let sr = sanitize_sample_rate(sample_rate);

        let mut hp: HighPassFilter = HighPassFilter {
            sample_rate: sr,
            cutoff: if cutoff.is_finite() { cutoff.max(0.0) } else { 500.0 },
            q: if q.is_finite() { q.max(0.1) } else { 0.7 },
            // Requested behavior: default max frequency equals sample rate.
            max_freq: sr,
            b0: 0.0,
            b1: 0.0,
            b2: 0.0,
            a1: 0.0,
            a2: 0.0,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        };

        hp.update_coefficients();
        hp
    }

    pub fn set_cutoff(&mut self, cutoff: f32) {
        if cutoff.is_finite() {
            self.cutoff = cutoff.max(0.0);
        }
        self.update_coefficients();
    }

    pub fn set_q(&mut self, q: f32) {
        if q.is_finite() {
            self.q = q.max(0.1);
        }
        self.update_coefficients();
    }

    pub fn set_sample_rate(&mut self, sample_rate: f32) {
        
        self.sample_rate = sanitize_sample_rate(sample_rate);
        self.update_coefficients();
    }

    pub fn set_max_freq(&mut self, max_freq: f32) {
        if max_freq.is_finite() {
            self.max_freq = max_freq.max(0.0);
        }
        self.update_coefficients();
    }

    pub fn reset(&mut self) {
        self.x1 = 0.0;
        self.x2 = 0.0;
        self.y1 = 0.0;
        self.y2 = 0.0;
    }

    fn update_coefficients(&mut self) {
        if !self.sample_rate.is_finite() || self.sample_rate <= 0.0 {
            self.set_passthrough_coefficients();
            return;
        }

        let nyquist: f32 = self.sample_rate * 0.5;
        if !nyquist.is_finite() || nyquist <= 0.0 {
            self.set_passthrough_coefficients();
            return;
        }

        let mut max_fc = self.max_freq;
        if !max_fc.is_finite() || max_fc <= 0.0 {
            max_fc = self.sample_rate;
        }
        // Keep cutoff safely below Nyquist for numerical stability.
        let safe_nyquist = nyquist * 0.99;
        if max_fc > safe_nyquist {
            max_fc = safe_nyquist;
        }
        if max_fc <= 1.0e-3 {
            max_fc = 1.0e-3;
        }

        let mut fc = self.cutoff;
        if !fc.is_finite() {
            fc = max_fc;
        }
        if fc < 1.0e-3 {
            fc = 1.0e-3;
        }
        if fc > max_fc {
            fc = max_fc;
        }

        let mut q = self.q;
        if !q.is_finite() || q < 0.1 {
            q = 0.1;
        }

        let w0 = 2.0 * PI * fc / self.sample_rate;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 / (2.0 * q);

        // RBJ cookbook biquad high-pass.
        let b0 = (1.0 + cos_w0) * 0.5;
        let b1 = -(1.0 + cos_w0);
        let b2 = (1.0 + cos_w0) * 0.5;
        let a0 = 1.0 + alpha;
        let a1 = -2.0 * cos_w0;
        let a2 = 1.0 - alpha;

        if !a0.is_finite() || a0.abs() <= f32::EPSILON {
            self.set_passthrough_coefficients();
            return;
        }

        self.b0 = b0 / a0;
        self.b1 = b1 / a0;
        self.b2 = b2 / a0;
        self.a1 = a1 / a0;
        self.a2 = a2 / a0;

        if !(self.b0.is_finite()
            && self.b1.is_finite()
            && self.b2.is_finite()
            && self.a1.is_finite()
            && self.a2.is_finite())
        {
            self.set_passthrough_coefficients();
        }
    }

    pub fn process(&mut self, buffer: &mut [f32]) {
        let b0 = self.b0;
        let b1 = self.b1;
        let b2 = self.b2;
        let a1 = self.a1;
        let a2 = self.a2;

        let mut x1 = self.x1;
        let mut x2 = self.x2;
        let mut y1 = self.y1;
        let mut y2 = self.y2;

        for sample in buffer.iter_mut() {
            let x0 = *sample;
            let y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;

            x2 = x1;
            x1 = x0;
            y2 = y1;
            y1 = y0;

            *sample = y0;
        }

        self.x1 = x1;
        self.x2 = x2;
        self.y1 = y1;
        self.y2 = y2;
    }
}
