use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct HardClip {
    drive: f32,
    gain: f32
}

#[wasm_bindgen]
impl HardClip {

    pub fn new(drive: f32, gain: f32) -> HardClip {
        HardClip { drive, gain }
    }

    pub fn process(&self, buffer: &mut [f32]) {

        for x in buffer.iter_mut() {

            let mut driven: f32 = self.drive * *x;

            if driven > 1.0 {
                driven = 1.0;
            } else if driven < -1.0 {
                driven = -1.0;
            }

            *x = driven * self.gain;
        }
    }

    pub fn get_drive(&self) -> f32 {
        self.drive
    }

    pub fn get_gain(&self) -> f32 {
        self.gain
    }

    pub fn set_drive(&mut self, drive: f32) {
        self.drive = drive;
    }

    pub fn set_gain(&mut self, gain: f32) {
        self.gain = gain;
    }
}
