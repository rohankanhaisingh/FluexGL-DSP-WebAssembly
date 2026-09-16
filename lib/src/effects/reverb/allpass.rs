pub(super) struct Allpass {
    buffer: Vec<f32>,
    index: usize,
    feedback: f32,
}

impl Allpass {
    pub(super) fn new(length: usize, feedback: f32) -> Allpass {
        Allpass {
            buffer: vec![0.0; length.max(1)],
            index: 0,
            feedback,
        }
    }

    pub(super) fn process(&mut self, input: f32) -> f32 {
        let buffered = self.buffer[self.index];
        let output = buffered - input;

        let write_value = input + buffered * self.feedback;
        self.buffer[self.index] = if write_value.is_finite() { write_value } else { 0.0 };

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
