use wasm_bindgen::prelude::*;

use crate::utilities::constants::DEFAULT_SAMPLE_RATE;

const MIN_SAMPLE_RATE: f32 = 1.0;
const MIN_DELAY_MS: f32 = 1.0;
const MAX_DELAY_MS: f32 = 100.0;
const MIN_DELAY_SAMPLES: f32 = 2.0;
const MAX_FEEDBACK: f32 = 0.95;

#[wasm_bindgen]
pub struct Chorus {
    sample_rate: f32,

    base_delay_ms: f32,
    depth_ms: f32,
    rate_hz: f32,
    mix: f32,
    feedback: f32,

    delay_line: Vec<f32>,
    write_idx: usize,
    phase: f32,
    max_delay_samples: usize,
}

#[wasm_bindgen]
impl Chorus {
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

    fn sanitize_mix(mix: f32) -> f32 {
        if mix.is_finite() {
            mix.clamp(0.0, 1.0)
        } else {
            0.0
        }
    }

    fn sanitize_feedback(feedback: f32) -> f32 {
        if feedback.is_finite() {
            feedback.clamp(-MAX_FEEDBACK, MAX_FEEDBACK)
        } else {
            0.0
        }
    }

    fn sanitize_phase(phase: f32) -> f32 {
        if phase.is_finite() {
            phase.rem_euclid(1.0)
        } else {
            0.0
        }
    }

    fn compute_required_delay_samples(sample_rate: f32, base_delay_ms: f32, depth_ms: f32) -> usize {
        // Unipolar modulation uses [base, base + depth], so this is the maximum delay needed.
        let max_ms = (base_delay_ms + depth_ms).max(MIN_DELAY_MS).min(MAX_DELAY_MS);
        ((max_ms / 1000.0) * sample_rate).ceil().max(MIN_DELAY_SAMPLES) as usize
    }

    fn advance_lfo(&mut self) -> f32 {
        let lfo = (2.0 * std::f32::consts::PI * self.phase).sin();
        self.phase = (self.phase + (self.rate_hz / self.sample_rate)).fract();
        lfo
    }

    fn compute_delay_samples(&self, lfo: f32, len: usize) -> f32 {
        let lfo_01 = 0.5 * (lfo + 1.0);
        let delay_ms = self.base_delay_ms + self.depth_ms * lfo_01;
        let delay_samples = (delay_ms / 1000.0) * self.sample_rate;
        let max_read = (len as f32 - 2.0).max(0.0);

        delay_samples.clamp(0.0, max_read)
    }

    fn read_delayed_sample(&self, delay_samples: f32, len: usize) -> f32 {
        // Fractional delay read index (circular)
        let read_pos = self.write_idx as f32 - delay_samples;
        let mut r0 = read_pos.floor() as isize;
        let frac = read_pos - r0 as f32;

        while r0 < 0 {
            r0 += len as isize;
        }

        let i0 = (r0 as usize) % len;
        let i1 = (i0 + 1) % len;

        let y0 = self.delay_line[i0];
        let y1 = self.delay_line[i1];
        (y0 * (1.0 - frac) + y1 * frac).clamp(-1.0e6, 1.0e6)
    }

    fn write_delay_sample(&mut self, input: f32, delayed: f32, len: usize) {
        let write_val = input + delayed * self.feedback;
        self.delay_line[self.write_idx] = if write_val.is_finite() { write_val } else { 0.0 };
        self.write_idx = (self.write_idx + 1) % len;
    }

    fn mix_sample(&self, dry: f32, wet: f32) -> f32 {
        let mixed = dry * (1.0 - self.mix) + wet * self.mix;
        if mixed.is_finite() { mixed } else { 0.0 }
    }

    fn ensure_delay_capacity(&mut self) {

        let required = Self::compute_required_delay_samples(
            self.sample_rate,
            self.base_delay_ms,
            self.depth_ms,
        );

        if required > self.max_delay_samples {
            self.delay_line.resize(required, 0.0);
            self.max_delay_samples = required;

            if self.write_idx >= self.max_delay_samples {
                self.write_idx %= self.max_delay_samples;
            }
        }
    }

    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32, base_delay_ms: f32, depth_ms: f32, rate_hz: f32, mix: f32, feedback: f32) -> Chorus {
        
        let sr = Self::sanitize_sample_rate(sample_rate);
        let base = Self::sanitize_non_negative(base_delay_ms, 15.0);
        let depth = Self::sanitize_non_negative(depth_ms, 8.0);

        let max_delay_samples = Self::compute_required_delay_samples(sr, base, depth);

        Chorus {
            sample_rate: sr,
            base_delay_ms: base,
            depth_ms: depth,
            rate_hz: Self::sanitize_non_negative(rate_hz, 1.5),
            mix: Self::sanitize_mix(mix),
            feedback: Self::sanitize_feedback(feedback),
            delay_line: vec![0.0; max_delay_samples],
            write_idx: 0,
            phase: 0.0,
            max_delay_samples,
        }
    }

    pub fn process(&mut self, buffer: &mut [f32]) {
        if self.delay_line.is_empty() || buffer.is_empty() {
            return;
        }

        let len = self.max_delay_samples;

        for x in buffer.iter_mut() {
            let dry = *x;
            let lfo = self.advance_lfo();
            let delay_samples = self.compute_delay_samples(lfo, len);
            let delayed = self.read_delayed_sample(delay_samples, len);
            self.write_delay_sample(dry, delayed, len);
            *x = self.mix_sample(dry, delayed);
        }
    }

    pub fn set_rate_hz(&mut self, rate_hz: f32) {
        self.rate_hz = Self::sanitize_non_negative(rate_hz, self.rate_hz);
    }

    pub fn set_depth_ms(&mut self, depth_ms: f32) {
        self.depth_ms = Self::sanitize_non_negative(depth_ms, self.depth_ms);
        self.ensure_delay_capacity();
    }

    pub fn set_base_delay_ms(&mut self, base_delay_ms: f32) {
        self.base_delay_ms = Self::sanitize_non_negative(base_delay_ms, self.base_delay_ms);
        self.ensure_delay_capacity();
    }

    pub fn set_mix(&mut self, mix: f32) {
        self.mix = Self::sanitize_mix(mix);
    }

    pub fn set_feedback(&mut self, feedback: f32) {
        self.feedback = Self::sanitize_feedback(feedback);
    }

    pub fn set_phase_offset(&mut self, phase: f32) {
        self.phase = Self::sanitize_phase(phase);
    }

    pub fn get_rate_hz(&self) -> f32 { self.rate_hz }
    pub fn get_depth_ms(&self) -> f32 { self.depth_ms }
    pub fn get_base_delay_ms(&self) -> f32 { self.base_delay_ms }
    pub fn get_mix(&self) -> f32 { self.mix }
    pub fn get_feedback(&self) -> f32 { self.feedback }
}
