use wasm_bindgen::prelude::*;

mod effects;
pub use effects::softclip::SoftClip;

#[wasm_bindgen]
pub fn dsp_version() -> String {
    "fluexgl-dsp-wasm 0.1.0".into()
}

#[wasm_bindgen]
pub fn os_version() -> String {
    "Unknown".into()
}