use std::f32::consts::PI;

use crate::utilities::common::biquad::Biquad;

pub fn rbj_lowpass(sample_rate: f32, cutoff: f32, resonance: f32) -> Biquad {
    let w0: f32 = 2.0 * PI * cutoff / sample_rate;

    // Transform value of w0 into cos and sin.
    let w0_cos: f32 = w0.cos();
    let w0_sin: f32 = w0.sin();

    // Base alpha value.
    let alpha: f32 = w0_sin / (2.0 * resonance);

    // Biquad params.
    let biquad_param_0: f32 = (1.0 - w0_cos) * 0.5;
    let biquad_param_1: f32 = 1.0 - w0_cos;
    let biquad_param_2: f32 = (1.0 - w0_cos) * 0.5;

    // Alpha params.
    let alpha_param_0: f32 = 1.0 + alpha;
    let alpha_param_1: f32 = -2.0 * w0_cos;
    let alpha_param_2: f32 = 1.0 - alpha;

    if !alpha_param_0.is_finite() || alpha_param_0.abs() <= f32::EPSILON {
        return Biquad::passthrough();
    }

    let biquad: Biquad = Biquad {
        b0: biquad_param_0 / alpha_param_0,
        b1: biquad_param_1 / alpha_param_0,
        b2: biquad_param_2 / alpha_param_0,
        a1: alpha_param_1 / alpha_param_0,
        a2: alpha_param_2 / alpha_param_0
    };

    if biquad.is_finite() {
        biquad
    } else {
        Biquad::passthrough()
    }
}

pub fn rbj_highpass(sample_rate: f32, cutoff: f32, resonance: f32) -> Biquad {

    let w0: f32 = 2.0 * PI * cutoff / sample_rate;

    // Transform value of w0 into cos and sin.
    let w0_cos: f32 = w0.cos();
    let w0_sin: f32 = w0.sin();

    // Base alpha value.
    let alpha: f32 = w0_sin / (2.0 * resonance);

    // Biquad params.
    let biquad_param_0: f32 = (1.0 + w0_cos) * 0.5;
    let biquad_param_1: f32 = -(1.0 + w0_cos);
    let biquad_param_2: f32 = (1.0 + w0_cos) * 0.5;

    // Alpha params.
    let alpha_param_0: f32 = 1.0 + alpha;
    let alpha_param_1: f32 = -2.0 * w0_cos;
    let alpha_param_2: f32 = 1.0 - alpha;

    if !alpha_param_0.is_finite() || alpha_param_0.abs() <= f32::EPSILON {
        return Biquad::passthrough();
    }

    let biquad: Biquad = Biquad {
        b0: biquad_param_0 / alpha_param_0,
        b1: biquad_param_1 / alpha_param_0,
        b2: biquad_param_2 / alpha_param_0,
        a1: alpha_param_1 / alpha_param_0,
        a2: alpha_param_2 / alpha_param_0
    };

    if biquad.is_finite() {
        biquad
    } else {
        Biquad::passthrough()
    }
}
