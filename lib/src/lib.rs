use wasm_bindgen::prelude::*;

mod effects;

pub use effects::softclip::SoftClip;
pub use effects::filter::OnePoleLowPass;
pub use effects::chorus::Chorus;

#[wasm_bindgen]
pub fn dsp_version() -> String {
    "fluexgl-dsp-wasm 0.1.0".into()
}

#[wasm_bindgen]
pub fn os_version() -> String {
    "Unknown".into()
}