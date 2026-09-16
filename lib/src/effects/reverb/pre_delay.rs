pub(super) struct PreDelay {
    buffer: Vec<f32>,
    index: usize,
}

impl PreDelay {
    pub(super) fn new(length: usize) -> PreDelay {
        PreDelay {
            buffer: vec![0.0; length.max(1)],
            index: 0,
        }
    }

    pub(super) fn process(&mut self, input: f32) -> f32 {
        let output = self.buffer[self.index];

        self.buffer[self.index] = if input.is_finite() { input } else { 0.0 };

        self.index += 1;
        if self.index >= self.buffer.len() {
            self.index = 0;
        }

        output
    }

    pub(super) fn reset(&mut self) {
        self.buffer.iter_mut().for_each(|s| *s = 0.0);
        self.index = 0;
    }
}
