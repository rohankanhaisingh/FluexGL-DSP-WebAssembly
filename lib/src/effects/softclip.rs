use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct SoftClip {
    drive: f32,
    gain: f32
}

#[wasm_bindgen]
impl SoftClip {
    
    #[wasm_bindgen(constructor)]
    pub fn new(drive: f32, gain: f32) -> SoftClip {
        SoftClip { drive, gain }
    }

    pub fn process(&self, buffer: &mut [f32]) {
        
        for x in buffer.iter_mut() {

            let driven = self.drive * *x;
            let clipped = driven.tanh();

            let norm = self.drive.tanh();

            let scaled = if norm.abs() > 0.0001 {
                clipped / norm
            } else {
                clipped
            };

            let normalized = scaled / self.drive.max(1.0);

            *x = normalized * self.gain;
        }
    }


    pub fn get_drive(&self) -> f32 {
        self.drive
    }

    pub fn set_drive(&mut self, drive: f32) {
        self.drive = drive
    }

    pub fn get_gain(&self) -> f32 {
        self.gain
    }

    pub fn set_gain(&mut self, gain: f32) {
        self.gain = gain
    }
}