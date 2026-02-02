use wasm_bindgen::prelude::*;

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
    fn compute_required_delay_samples(sample_rate: f32, base_delay_ms: f32, depth_ms: f32) -> usize {
        // Unipolar modulation uses [base, base + depth], so this is the maximum delay needed.
        let max_ms = (base_delay_ms + depth_ms).max(1.0).min(100.0);
        ((max_ms / 1000.0) * sample_rate).ceil().max(2.0) as usize
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
    pub fn new(
        sample_rate: f32,
        base_delay_ms: f32,
        depth_ms: f32,
        rate_hz: f32,
        mix: f32,
        feedback: f32,
    ) -> Chorus {
        let sr = sample_rate.max(1.0);

        let base = base_delay_ms.max(0.0);
        let depth = depth_ms.max(0.0);

        let max_delay_samples = Self::compute_required_delay_samples(sr, base, depth);

        Chorus {
            sample_rate: sr,
            base_delay_ms: base,
            depth_ms: depth,
            rate_hz: rate_hz.max(0.0),
            mix: mix.clamp(0.0, 1.0),
            feedback: feedback.clamp(-0.95, 0.95),
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
        let sr = self.sample_rate;

        for x in buffer.iter_mut() {
            // LFO in [-1, 1]
            let lfo = (2.0 * std::f32::consts::PI * self.phase).sin();
            self.phase = (self.phase + (self.rate_hz / sr)).fract();

            // Unipolar modulation keeps delay strictly non-negative: [base, base + depth].
            let lfo_01 = 0.5 * (lfo + 1.0);
            let delay_ms = self.base_delay_ms + self.depth_ms * lfo_01;
            let mut delay_samples = (delay_ms / 1000.0) * sr;

            // Clamp within the buffer (keep room for interpolation)
            let max_read = (len as f32 - 2.0).max(0.0);
            if delay_samples < 0.0 {
                delay_samples = 0.0;
            } else if delay_samples > max_read {
                delay_samples = max_read;
            }

            // Fractional delay read index (circular)
            let read_pos = self.write_idx as f32 - delay_samples;
            let mut r0 = read_pos.floor() as isize;
            let frac = read_pos - r0 as f32;

            // Wrap indices
            while r0 < 0 {
                r0 += len as isize;
            }
            let i0 = (r0 as usize) % len;
            let i1 = (i0 + 1) % len;

            let y0 = self.delay_line[i0];
            let y1 = self.delay_line[i1];
            let delayed = y0 * (1.0 - frac) + y1 * frac;

            // Write input + feedback
            let write_val = *x + delayed * self.feedback;
            self.delay_line[self.write_idx] = write_val;
            self.write_idx = (self.write_idx + 1) % len;

            // Mix
            *x = *x * (1.0 - self.mix) + delayed * self.mix;
        }
    }

    pub fn set_rate_hz(&mut self, rate_hz: f32) {
        self.rate_hz = rate_hz.max(0.0);
    }

    pub fn set_depth_ms(&mut self, depth_ms: f32) {
        self.depth_ms = depth_ms.max(0.0);
        self.ensure_delay_capacity();
    }

    pub fn set_base_delay_ms(&mut self, base_delay_ms: f32) {
        self.base_delay_ms = base_delay_ms.max(0.0);
        self.ensure_delay_capacity();
    }

    pub fn set_mix(&mut self, mix: f32) {
        self.mix = mix.clamp(0.0, 1.0);
    }

    pub fn set_feedback(&mut self, feedback: f32) {
        self.feedback = feedback.clamp(-0.95, 0.95);
    }

    pub fn set_phase_offset(&mut self, phase: f32) {
        self.phase = phase.fract().abs();
    }

    pub fn get_rate_hz(&self) -> f32 { self.rate_hz }
    pub fn get_depth_ms(&self) -> f32 { self.depth_ms }
    pub fn get_base_delay_ms(&self) -> f32 { self.base_delay_ms }
    pub fn get_mix(&self) -> f32 { self.mix }
    pub fn get_feedback(&self) -> f32 { self.feedback }
}
