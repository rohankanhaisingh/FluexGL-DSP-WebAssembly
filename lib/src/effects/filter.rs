use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct OnePoleLowPass {
    previous: f32,
    alpha: f32
}

#[wasm_bindgen]
impl OnePoleLowPass {

    pub fn new(sample_rate: f32, cutoff_hz: f32) -> OnePoleLowPass {

        let dt = 1.0 / sample_rate;
        let rc = 1.0 / (2.0 * std::f32::consts::PI * cutoff_hz);

        let alpha = dt / (rc + dt);

        OnePoleLowPass {
            previous: 0.0,
            alpha
        }
    }

    pub fn set_cutoff(&mut self, sample_rate: f32, cutoff_hz: f32) {

        let dt = 1.0 / sample_rate;
        let rc = 1.0 / (2.0 * std::f32::consts::PI * cutoff_hz);

        self.alpha = dt / (rc + dt);
    }
}