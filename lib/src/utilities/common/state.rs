#[derive(Copy, Clone)]
pub struct State {
    pub x1: f32,
    pub x2: f32,
    pub y1: f32,
    pub y2: f32
}

impl State {
    pub fn new() -> State {
        State { x1: 0.0, x2: 0.0, y1: 0.0, y2: 0.0 }
    }

    pub fn reset(&mut self) {
        self.x1 = 0.0;
        self.x2 = 0.0;
        self.y1 = 0.0;
        self.y2 = 0.0;
    }
}