pub(super) struct Comb {
    buffer: Vec<f32>,
    index: usize,
    feedback: f32,
    damp1: f32,
    damp2: f32,
    filter_store: f32,
}

impl Comb {
    pub(super) fn new(length: usize, feedback: f32, damp1: f32, damp2: f32) -> Comb {
        Comb {
            buffer: vec![0.0; length.max(1)],
            index: 0,
            feedback,
            damp1,
            damp2,
            filter_store: 0.0,
        }
    }

    pub(super) fn set_feedback(&mut self, feedback: f32) {
        self.feedback = feedback;
    }

    pub(super) fn set_damping(&mut self, damp1: f32, damp2: f32) {
        self.damp1 = damp1;
        self.damp2 = damp2;
    }

    pub(super) fn process(&mut self, input: f32) -> f32 {
        let output = self.buffer[self.index];

        self.filter_store = output * self.damp2 + self.filter_store * self.damp1;
        if !self.filter_store.is_finite() {
            self.filter_store = 0.0;
        }

        let write_value = input + self.filter_store * self.feedback;
        self.buffer[self.index] = if write_value.is_finite() { write_value } else { 0.0 };

        self.index += 1;
        if self.index >= self.buffer.len() {
            self.index = 0;
        }

        output
    }

    pub(super) fn reset(&mut self) {
        self.buffer.iter_mut().for_each(|s| *s = 0.0);
        self.filter_store = 0.0;
        self.index = 0;
    }
}
