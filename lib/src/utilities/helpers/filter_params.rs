const MIN_RESONANCE: f32 = 0.1;
const MIN_FREQUENCY: f32 = 1.0e-3;
const NYQUIST_SAFETY: f32 = 0.99;

pub fn normalize_lowpass_params(sample_rate: f32, cutoff: f32, resonance: f32, min_frequency: f32) -> Option<(f32, f32, f32)> {

    if !sample_rate.is_finite() || sample_rate <= 0.0 {
        return None;
    }

    let nyquist: f32 = sample_rate * 0.5;
    if !nyquist.is_finite() || nyquist <= 0.0 {
        return None;
    }

    let max_freq: f32 = (nyquist * NYQUIST_SAFETY).max(MIN_FREQUENCY);

    let mut min_freq: f32 = min_frequency;
    if !min_freq.is_finite() || min_freq < 0.0 {
        min_freq = 0.0;
    }
    if min_freq > max_freq {
        min_freq = max_freq;
    }

    let mut frequency_cutoff: f32 = cutoff;
    if !frequency_cutoff.is_finite() {
        frequency_cutoff = min_freq;
    }
    if frequency_cutoff < min_freq {
        frequency_cutoff = min_freq;
    }
    if frequency_cutoff > max_freq {
        frequency_cutoff = max_freq;
    }

    let mut mutable_resonance = resonance;
    if !mutable_resonance.is_finite() || mutable_resonance < MIN_RESONANCE {
        mutable_resonance = MIN_RESONANCE;
    }

    Some((frequency_cutoff, mutable_resonance, sample_rate))
}

pub fn normalize_highpass_params(sample_rate: f32, cutoff: f32, resonance: f32, max_frequency: f32) -> Option<(f32, f32, f32)> {

    if !sample_rate.is_finite() || sample_rate <= 0.0 {
        return None;
    }

    let nqyuist: f32 = sample_rate * 0.5;
    if !nqyuist.is_finite() || nqyuist <= 0.0 {
        return None;
    }

    let mut max_freq: f32 = max_frequency;
    if !max_freq.is_finite() || max_freq < 0.0 {
        max_freq = sample_rate;
    }

    let safe_nyquist: f32 = nqyuist * NYQUIST_SAFETY;
    if max_freq > safe_nyquist {
        max_freq = safe_nyquist;
    } 
    if max_freq < MIN_FREQUENCY {
        max_freq = MIN_FREQUENCY;
    }

    let mut frequency_cutoff: f32 = cutoff;
    if !frequency_cutoff.is_finite() {
        frequency_cutoff = max_freq;
    }
    if frequency_cutoff < MIN_FREQUENCY {
        frequency_cutoff = MIN_FREQUENCY;
    }
    if frequency_cutoff > max_freq {
        frequency_cutoff = max_freq;
    }

    let mut mutable_resonance = resonance;
    if !mutable_resonance.is_finite() || mutable_resonance < MIN_RESONANCE {
        mutable_resonance = MIN_RESONANCE;
    }

    Some((frequency_cutoff, mutable_resonance, sample_rate))
}
