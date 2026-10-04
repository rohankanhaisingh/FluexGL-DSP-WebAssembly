/// A circular delay line with fractional (linearly interpolated) reads.
///
/// The buffer is allocated once for the maximum delay, so the delay time can
/// change smoothly at runtime without reallocating or clearing the buffer.
pub struct DelayLine {
    buffer: Vec<f32>,
    write_idx: usize,
}

impl DelayLine {
    pub fn new(max_delay_samples: usize) -> DelayLine {
        DelayLine {
            // Two extra samples for interpolation headroom.
            buffer: vec![0.0; max_delay_samples.max(1) + 2],
            write_idx: 0,
        }
    }

    pub fn capacity(&self) -> usize {
        self.buffer.len() - 2
    }

    /// Reads the sample that was written `delay_samples` samples ago.
    /// The delay is clamped between 1 sample and the capacity of the line.
    pub fn read(&self, delay_samples: f32) -> f32 {
        let len = self.buffer.len();
        let delay = if delay_samples.is_finite() {
            delay_samples.clamp(1.0, self.capacity() as f32)
        } else {
            1.0
        };

        let whole = delay.floor();
        let frac = delay - whole;
        let whole = whole as usize;

        let idx_a = (self.write_idx + len - whole) % len;
        let idx_b = (self.write_idx + len - whole - 1) % len;

        let a = self.buffer[idx_a];
        let b = self.buffer[idx_b];

        a + (b - a) * frac
    }

    /// Writes the next sample and advances the write position.
    pub fn write(&mut self, sample: f32) {
        self.buffer[self.write_idx] = if sample.is_finite() { sample } else { 0.0 };
        self.write_idx = (self.write_idx + 1) % self.buffer.len();
    }

    pub fn reset(&mut self) {
        self.buffer.iter_mut().for_each(|s| *s = 0.0);
        self.write_idx = 0;
    }
}
