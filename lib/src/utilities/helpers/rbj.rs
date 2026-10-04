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

pub fn rbj_notch(sample_rate: f32, cutoff: f32, resonance: f32) -> Biquad {

    let w0: f32 = 2.0 * PI * cutoff / sample_rate;

    // Transform value of w0 into cos and sin.
    let w0_cos: f32 = w0.cos();
    let w0_sin: f32 = w0.sin();

    // Base alpha value.
    let alpha: f32 = w0_sin / (2.0 * resonance);

    // Biquad params.
    let biquad_param_0: f32 = 1.0;
    let biquad_param_1: f32 = -2.0 * w0_cos;
    let biquad_param_2: f32 = 1.0;

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

pub fn rbj_bandpass(sample_rate: f32, cutoff: f32, resonance: f32) -> Biquad {

    let w0: f32 = 2.0 * PI * cutoff / sample_rate;

    // Transform value of w0 into cos and sin.
    let w0_cos: f32 = w0.cos();
    let w0_sin: f32 = w0.sin();

    // Base alpha value.
    let alpha: f32 = w0_sin / (2.0 * resonance);

    // Biquad params (constant 0 dB peak gain).
    let biquad_param_0: f32 = alpha;
    let biquad_param_1: f32 = 0.0;
    let biquad_param_2: f32 = -alpha;

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

/// Normalizes raw RBJ coefficients by a0, falling back to passthrough when unstable.
fn normalize(b0: f32, b1: f32, b2: f32, a0: f32, a1: f32, a2: f32) -> Biquad {
    if !a0.is_finite() || a0.abs() <= f32::EPSILON {
        return Biquad::passthrough();
    }

    let biquad: Biquad = Biquad {
        b0: b0 / a0,
        b1: b1 / a0,
        b2: b2 / a0,
        a1: a1 / a0,
        a2: a2 / a0
    };

    if biquad.is_finite() {
        biquad
    } else {
        Biquad::passthrough()
    }
}

/// Peaking EQ: boosts or cuts `gain_db` around `frequency`, with bandwidth set by `q`.
pub fn rbj_peaking(sample_rate: f32, frequency: f32, q: f32, gain_db: f32) -> Biquad {
    let a = 10.0_f32.powf(gain_db / 40.0);
    let w0 = 2.0 * PI * frequency / sample_rate;
    let (w0_sin, w0_cos) = (w0.sin(), w0.cos());
    let alpha = w0_sin / (2.0 * q);

    normalize(
        1.0 + alpha * a,
        -2.0 * w0_cos,
        1.0 - alpha * a,
        1.0 + alpha / a,
        -2.0 * w0_cos,
        1.0 - alpha / a,
    )
}

/// Low shelf: boosts or cuts `gain_db` below `frequency`. `q` sets the slope of the transition.
pub fn rbj_lowshelf(sample_rate: f32, frequency: f32, q: f32, gain_db: f32) -> Biquad {
    let a = 10.0_f32.powf(gain_db / 40.0);
    let w0 = 2.0 * PI * frequency / sample_rate;
    let (w0_sin, w0_cos) = (w0.sin(), w0.cos());
    let alpha = w0_sin / (2.0 * q);
    let two_sqrt_a_alpha = 2.0 * a.sqrt() * alpha;

    normalize(
        a * ((a + 1.0) - (a - 1.0) * w0_cos + two_sqrt_a_alpha),
        2.0 * a * ((a - 1.0) - (a + 1.0) * w0_cos),
        a * ((a + 1.0) - (a - 1.0) * w0_cos - two_sqrt_a_alpha),
        (a + 1.0) + (a - 1.0) * w0_cos + two_sqrt_a_alpha,
        -2.0 * ((a - 1.0) + (a + 1.0) * w0_cos),
        (a + 1.0) + (a - 1.0) * w0_cos - two_sqrt_a_alpha,
    )
}

/// High shelf: boosts or cuts `gain_db` above `frequency`. `q` sets the slope of the transition.
pub fn rbj_highshelf(sample_rate: f32, frequency: f32, q: f32, gain_db: f32) -> Biquad {
    let a = 10.0_f32.powf(gain_db / 40.0);
    let w0 = 2.0 * PI * frequency / sample_rate;
    let (w0_sin, w0_cos) = (w0.sin(), w0.cos());
    let alpha = w0_sin / (2.0 * q);
    let two_sqrt_a_alpha = 2.0 * a.sqrt() * alpha;

    normalize(
        a * ((a + 1.0) + (a - 1.0) * w0_cos + two_sqrt_a_alpha),
        -2.0 * a * ((a - 1.0) + (a + 1.0) * w0_cos),
        a * ((a + 1.0) + (a - 1.0) * w0_cos - two_sqrt_a_alpha),
        (a + 1.0) - (a - 1.0) * w0_cos + two_sqrt_a_alpha,
        2.0 * ((a - 1.0) - (a + 1.0) * w0_cos),
        (a + 1.0) - (a - 1.0) * w0_cos - two_sqrt_a_alpha,
    )
}
