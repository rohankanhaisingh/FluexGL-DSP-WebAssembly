use wasm_bindgen::prelude::*;

use crate::utilities::constants::DEFAULT_SAMPLE_RATE;

mod constants;

use constants::*;

#[wasm_bindgen]
pub struct Delay {
    sample_rate: f32,

    delay_ms: f32,
    feedback: f32,
    mix: f32,

    buffer: Vec<f32>,
    write_idx: usize,
}

#[wasm_bindgen]
impl Delay {
    fn sanitize_sample_rate(sample_rate: f32) -> f32 {
        if sample_rate.is_finite() {
            sample_rate.max(MIN_SAMPLE_RATE)
        } else {
            DEFAULT_SAMPLE_RATE
        }
    }

    fn sanitize_delay_ms(delay_ms: f32, fallback: f32) -> f32 {
        if delay_ms.is_finite() {
            delay_ms.clamp(MIN_DELAY_MS, MAX_DELAY_MS)
        } else {
            fallback.clamp(MIN_DELAY_MS, MAX_DELAY_MS)
        }
    }

    fn sanitize_feedback(feedback: f32) -> f32 {
        if feedback.is_finite() {
            feedback.clamp(-MAX_FEEDBACK, MAX_FEEDBACK)
        } else {
            0.0
        }
    }

    fn sanitize_mix(mix: f32) -> f32 {
        if mix.is_finite() {
            mix.clamp(0.0, 1.0)
        } else {
            0.0
        }
    }

    fn delay_samples(sample_rate: f32, delay_ms: f32) -> usize {
        let samples = (delay_ms / 1000.0) * sample_rate;

        if !samples.is_finite() {
            return 1;
        }

        samples.round().max(1.0) as usize
    }

    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32, delay_ms: f32, feedback: f32, mix: f32) -> Delay {
        let sr = Self::sanitize_sample_rate(sample_rate);
        let delay = Self::sanitize_delay_ms(delay_ms, DEFAULT_DELAY_MS);

        Delay {
            sample_rate: sr,
            delay_ms: delay,
            feedback: if feedback.is_finite() { Self::sanitize_feedback(feedback) } else { DEFAULT_FEEDBACK },
            mix: if mix.is_finite() { Self::sanitize_mix(mix) } else { DEFAULT_MIX },
            buffer: vec![0.0; Self::delay_samples(sr, delay)],
            write_idx: 0,
        }
    }

    pub fn set_delay_ms(&mut self, delay_ms: f32) {
        self.delay_ms = Self::sanitize_delay_ms(delay_ms, self.delay_ms);
        self.buffer = vec![0.0; Self::delay_samples(self.sample_rate, self.delay_ms)];
        self.write_idx = 0;
    }

    pub fn set_feedback(&mut self, feedback: f32) {
        self.feedback = Self::sanitize_feedback(feedback);
    }

    pub fn set_mix(&mut self, mix: f32) {
        self.mix = Self::sanitize_mix(mix);
    }

    pub fn set_sample_rate(&mut self, sample_rate: f32) {
        self.sample_rate = Self::sanitize_sample_rate(sample_rate);
        self.buffer = vec![0.0; Self::delay_samples(self.sample_rate, self.delay_ms)];
        self.write_idx = 0;
    }

    pub fn reset(&mut self) {
        self.buffer.iter_mut().for_each(|s| *s = 0.0);
        self.write_idx = 0;
    }

    pub fn process(&mut self, buffer: &mut [f32]) {
        if self.buffer.is_empty() || buffer.is_empty() {
            return;
        }

        let len = self.buffer.len();

        for sample in buffer.iter_mut() {
            let dry = *sample;
            let delayed = self.buffer[self.write_idx];

            let write_value = dry + delayed * self.feedback;
            self.buffer[self.write_idx] = if write_value.is_finite() { write_value } else { 0.0 };

            self.write_idx = (self.write_idx + 1) % len;

            let mixed = dry * (1.0 - self.mix) + delayed * self.mix;
            *sample = if mixed.is_finite() { mixed } else { 0.0 };
        }
    }

    pub fn get_delay_ms(&self) -> f32 { self.delay_ms }
    pub fn get_feedback(&self) -> f32 { self.feedback }
    pub fn get_mix(&self) -> f32 { self.mix }
}
