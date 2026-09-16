use wasm_bindgen::prelude::*;

use crate::utilities::constants::DEFAULT_SAMPLE_RATE;

mod constants;
mod stage;

use constants::*;
use stage::AllpassStage;

#[wasm_bindgen]
pub struct Phaser {
    sample_rate: f32,

    rate_hz: f32,
    min_freq_hz: f32,
    max_freq_hz: f32,
    feedback: f32,
    mix: f32,

    phase: f32,
    feedback_sample: f32,
    stages: Vec<AllpassStage>,
}

#[wasm_bindgen]
impl Phaser {
    fn sanitize_sample_rate(sample_rate: f32) -> f32 {
        if sample_rate.is_finite() {
            sample_rate.max(MIN_SAMPLE_RATE)
        } else {
            DEFAULT_SAMPLE_RATE
        }
    }

    fn sanitize_non_negative(value: f32, fallback: f32) -> f32 {
        if value.is_finite() {
            value.max(0.0)
        } else {
            fallback.max(0.0)
        }
    }

    fn sanitize_freq_hz(value: f32, fallback: f32, sample_rate: f32) -> f32 {
        let nyquist_safety = (sample_rate * 0.5 * NYQUIST_SAFETY).max(MIN_FREQ_FLOOR_HZ);

        if value.is_finite() {
            value.clamp(MIN_FREQ_FLOOR_HZ, nyquist_safety)
        } else {
            fallback.clamp(MIN_FREQ_FLOOR_HZ, nyquist_safety)
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

    fn allpass_coefficient(fc: f32, sample_rate: f32) -> f32 {
        let nyquist_safety = (sample_rate * 0.5 * NYQUIST_SAFETY).max(MIN_FREQ_FLOOR_HZ);
        let fc_clamped = fc.clamp(MIN_FREQ_FLOOR_HZ, nyquist_safety);

        let tan_val = (std::f32::consts::PI * fc_clamped / sample_rate).tan();
        let denominator = tan_val + 1.0;

        if !denominator.is_finite() || denominator.abs() <= f32::EPSILON {
            return 0.0;
        }

        let coefficient = (tan_val - 1.0) / denominator;

        if coefficient.is_finite() {
            coefficient.clamp(-0.999, 0.999)
        } else {
            0.0
        }
    }

    fn reorder_freq_range(&mut self) {
        if self.min_freq_hz > self.max_freq_hz {
            std::mem::swap(&mut self.min_freq_hz, &mut self.max_freq_hz);
        }
    }

    #[wasm_bindgen(constructor)]
    pub fn new(
        sample_rate: f32,
        rate_hz: f32,
        min_freq_hz: f32,
        max_freq_hz: f32,
        feedback: f32,
        mix: f32,
    ) -> Phaser {
        let sr = Self::sanitize_sample_rate(sample_rate);

        let mut phaser = Phaser {
            sample_rate: sr,
            rate_hz: Self::sanitize_non_negative(rate_hz, DEFAULT_RATE_HZ),
            min_freq_hz: Self::sanitize_freq_hz(min_freq_hz, DEFAULT_MIN_FREQ_HZ, sr),
            max_freq_hz: Self::sanitize_freq_hz(max_freq_hz, DEFAULT_MAX_FREQ_HZ, sr),
            feedback: if feedback.is_finite() { Self::sanitize_feedback(feedback) } else { DEFAULT_FEEDBACK },
            mix: if mix.is_finite() { Self::sanitize_mix(mix) } else { DEFAULT_MIX },
            phase: 0.0,
            feedback_sample: 0.0,
            stages: (0..NUM_STAGES).map(|_| AllpassStage::new()).collect(),
        };

        phaser.reorder_freq_range();
        phaser
    }

    pub fn set_rate_hz(&mut self, rate_hz: f32) {
        self.rate_hz = Self::sanitize_non_negative(rate_hz, self.rate_hz);
    }

    pub fn set_min_freq_hz(&mut self, min_freq_hz: f32) {
        self.min_freq_hz = Self::sanitize_freq_hz(min_freq_hz, self.min_freq_hz, self.sample_rate);
        self.reorder_freq_range();
    }

    pub fn set_max_freq_hz(&mut self, max_freq_hz: f32) {
        self.max_freq_hz = Self::sanitize_freq_hz(max_freq_hz, self.max_freq_hz, self.sample_rate);
        self.reorder_freq_range();
    }

    pub fn set_feedback(&mut self, feedback: f32) {
        self.feedback = Self::sanitize_feedback(feedback);
    }

    pub fn set_mix(&mut self, mix: f32) {
        self.mix = Self::sanitize_mix(mix);
    }

    pub fn set_sample_rate(&mut self, sample_rate: f32) {
        self.sample_rate = Self::sanitize_sample_rate(sample_rate);
        self.min_freq_hz = Self::sanitize_freq_hz(self.min_freq_hz, DEFAULT_MIN_FREQ_HZ, self.sample_rate);
        self.max_freq_hz = Self::sanitize_freq_hz(self.max_freq_hz, DEFAULT_MAX_FREQ_HZ, self.sample_rate);
        self.reorder_freq_range();
    }

    pub fn reset(&mut self) {
        self.phase = 0.0;
        self.feedback_sample = 0.0;
        for stage in self.stages.iter_mut() {
            stage.reset();
        }
    }

    pub fn process(&mut self, buffer: &mut [f32]) {
        if self.stages.is_empty() || buffer.is_empty() {
            return;
        }

        for sample in buffer.iter_mut() {
            let dry = *sample;

            let lfo = (2.0 * std::f32::consts::PI * self.phase).sin();
            self.phase = (self.phase + (self.rate_hz / self.sample_rate)).fract();

            let lfo_01 = 0.5 * (lfo + 1.0);
            let fc = self.min_freq_hz + (self.max_freq_hz - self.min_freq_hz) * lfo_01;
            let coefficient = Self::allpass_coefficient(fc, self.sample_rate);

            let mut wet = dry + self.feedback_sample * self.feedback;
            for stage in self.stages.iter_mut() {
                wet = stage.process(wet, coefficient);
            }
            self.feedback_sample = wet;

            let mixed = dry * (1.0 - self.mix) + wet * self.mix;
            *sample = if mixed.is_finite() { mixed } else { 0.0 };
        }
    }

    pub fn get_rate_hz(&self) -> f32 { self.rate_hz }
    pub fn get_min_freq_hz(&self) -> f32 { self.min_freq_hz }
    pub fn get_max_freq_hz(&self) -> f32 { self.max_freq_hz }
    pub fn get_feedback(&self) -> f32 { self.feedback }
    pub fn get_mix(&self) -> f32 { self.mix }
}
