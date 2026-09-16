pub(super) struct AllpassStage {
    x1: f32,
    y1: f32,
}

impl AllpassStage {
    pub(super) fn new() -> AllpassStage {
        AllpassStage { x1: 0.0, y1: 0.0 }
    }

    pub(super) fn process(&mut self, input: f32, coefficient: f32) -> f32 {
        let output = coefficient * (self.y1 - input) + self.x1;

        self.x1 = input;
        self.y1 = if output.is_finite() { output } else { 0.0 };

        self.y1
    }

    pub(super) fn reset(&mut self) {
        self.x1 = 0.0;
        self.y1 = 0.0;
    }
}
