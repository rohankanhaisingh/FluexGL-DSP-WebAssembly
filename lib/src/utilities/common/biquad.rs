use crate::utilities::common::state::State;

#[derive(Clone, Copy)]
pub struct Biquad {
    pub b0: f32,
    pub b1: f32,
    pub b2: f32,
    pub a1: f32,
    pub a2: f32,
}

impl Biquad {
    pub const fn passthrough() -> Biquad {
        Biquad {
            b0: 1.0,
            b1: 0.0,
            b2: 0.0,
            a1: 0.0,
            a2: 0.0,
        }
    }

    pub fn is_finite(&self) -> bool {
        self.b0.is_finite()
            && self.b1.is_finite()
            && self.b2.is_finite()
            && self.a1.is_finite()
            && self.a2.is_finite()
    }

    pub fn process_sample(&self, state: &mut State, x0: f32) -> f32 {
        let y0 = self.b0 * x0 + self.b1 * state.x1 + self.b2 * state.x2
            - self.a1 * state.y1
            - self.a2 * state.y2;

        state.x2 = state.x1;
        state.x1 = x0;
        state.y2 = state.y1;
        state.y1 = y0;

        y0
    }
}
