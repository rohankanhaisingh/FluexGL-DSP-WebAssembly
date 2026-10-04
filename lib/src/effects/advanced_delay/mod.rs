use std::f32::consts::PI;

use wasm_bindgen::prelude::*;

use crate::utilities::common::biquad::Biquad;
use crate::utilities::common::delay_line::DelayLine;
use crate::utilities::common::state::State;
use crate::utilities::constants::DEFAULT_SAMPLE_RATE;
use crate::utilities::helpers::rbj::{rbj_highpass, rbj_lowpass};

mod constants;

use constants::*;

/// A stereo delay engine used by the MonoDelay, StereoDelay, PingPongDelay and
/// AdvancedDelay processors. The behaviour depends on the mode:
///
/// - Stereo (0): left and right are delayed independently. `cross_feedback`
///   blends the feedback of each side into the other.
/// - Mono (1): the input is summed to mono and fed through a single delay line.
///   The echoes are identical on both channels.
/// - Ping-pong (2): the input is summed to mono and enters the left line. Every
///   repeat crosses over to the other side, so echoes bounce left and right.
///
/// The feedback path contains an optional low cut (highpass), high cut
/// (lowpass) and soft saturation, so repeats can get darker and warmer over time.
/// The delay time can be modulated by a sine LFO for chorus-like or tape wow effects.
#[wasm_bindgen]
pub struct AdvancedDelay {
    sample_rate: f32,
    mode: u32,

    delay_left_ms: f32,
    delay_right_ms: f32,
    feedback: f32,
    cross_feedback: f32,
    mix: f32,
    low_cut_hz: f32,
    high_cut_hz: f32,
    mod_rate_hz: f32,
    mod_depth_ms: f32,
    drive: f32,

    line_left: DelayLine,
    line_right: DelayLine,

    /// Smoothed delay times, in samples.
    current_left: f32,
    current_right: f32,
    glide_coefficient: f32,

    lfo_phase: f32,

    low_cut: Biquad,
    high_cut: Biquad,
    low_cut_left: State,
    low_cut_right: State,
    high_cut_left: State,
    high_cut_right: State,
    low_cut_enabled: bool,
    high_cut_enabled: bool,
}

#[wasm_bindgen]
impl AdvancedDelay {
    fn sanitize_sample_rate(sample_rate: f32) -> f32 {
        if sample_rate.is_finite() {
            sample_rate.max(MIN_SAMPLE_RATE)
        } else {
            DEFAULT_SAMPLE_RATE
        }
    }

    fn sanitize(value: f32, min: f32, max: f32, fallback: f32) -> f32 {
        if value.is_finite() {
            value.clamp(min, max)
        } else {
            fallback.clamp(min, max)
        }
    }

    fn sanitize_mode(mode: u32) -> u32 {
        match mode {
            MODE_MONO | MODE_PING_PONG => mode,
            _ => MODE_STEREO,
        }
    }

    fn ms_to_samples(&self, ms: f32) -> f32 {
        (ms / 1000.0) * self.sample_rate
    }

    fn nyquist_limit(&self) -> f32 {
        self.sample_rate * 0.5 * 0.99
    }

    fn update_filters(&mut self) {
        // A low cut of 0 (or below the audible range) disables the filter.
        self.low_cut_enabled = self.low_cut_hz >= MIN_FILTER_HZ;
        self.low_cut = if self.low_cut_enabled {
            rbj_highpass(self.sample_rate, self.low_cut_hz.min(self.nyquist_limit()), FILTER_Q)
        } else {
            Biquad::passthrough()
        };

        // A high cut of 0, or at/above the Nyquist limit, disables the filter.
        self.high_cut_enabled = self.high_cut_hz >= MIN_FILTER_HZ && self.high_cut_hz < self.nyquist_limit();
        self.high_cut = if self.high_cut_enabled {
            rbj_lowpass(self.sample_rate, self.high_cut_hz, FILTER_Q)
        } else {
            Biquad::passthrough()
        };
    }

    #[wasm_bindgen(constructor)]
    pub fn new(
        sample_rate: f32,
        mode: u32,
        delay_left_ms: f32,
        delay_right_ms: f32,
        feedback: f32,
        cross_feedback: f32,
        mix: f32,
        low_cut_hz: f32,
        high_cut_hz: f32,
        mod_rate_hz: f32,
        mod_depth_ms: f32,
        drive: f32,
    ) -> AdvancedDelay {
        let sr = Self::sanitize_sample_rate(sample_rate);
        let capacity = (((MAX_DELAY_MS + MAX_MOD_DEPTH_MS) / 1000.0) * sr).ceil() as usize + 4;

        let mut delay = AdvancedDelay {
            sample_rate: sr,
            mode: Self::sanitize_mode(mode),

            delay_left_ms: Self::sanitize(delay_left_ms, MIN_DELAY_MS, MAX_DELAY_MS, DEFAULT_DELAY_MS),
            delay_right_ms: Self::sanitize(delay_right_ms, MIN_DELAY_MS, MAX_DELAY_MS, DEFAULT_DELAY_MS),
            feedback: Self::sanitize(feedback, 0.0, MAX_FEEDBACK, DEFAULT_FEEDBACK),
            cross_feedback: Self::sanitize(cross_feedback, 0.0, 1.0, 0.0),
            mix: Self::sanitize(mix, 0.0, 1.0, DEFAULT_MIX),
            low_cut_hz: Self::sanitize(low_cut_hz, 0.0, MAX_LOW_CUT_HZ, 0.0),
            high_cut_hz: Self::sanitize(high_cut_hz, 0.0, sr * 0.5, 0.0),
            mod_rate_hz: Self::sanitize(mod_rate_hz, 0.0, MAX_MOD_RATE_HZ, 0.0),
            mod_depth_ms: Self::sanitize(mod_depth_ms, 0.0, MAX_MOD_DEPTH_MS, 0.0),
            drive: Self::sanitize(drive, 0.0, 1.0, 0.0),

            line_left: DelayLine::new(capacity),
            line_right: DelayLine::new(capacity),

            current_left: 0.0,
            current_right: 0.0,
            glide_coefficient: 1.0 - (-1.0 / (DELAY_GLIDE_SECONDS * sr)).exp(),

            lfo_phase: 0.0,

            low_cut: Biquad::passthrough(),
            high_cut: Biquad::passthrough(),
            low_cut_left: State::new(),
            low_cut_right: State::new(),
            high_cut_left: State::new(),
            high_cut_right: State::new(),
            low_cut_enabled: false,
            high_cut_enabled: false,
        };

        // Start at the target delay times instead of gliding in from zero.
        delay.current_left = delay.ms_to_samples(delay.delay_left_ms);
        delay.current_right = delay.ms_to_samples(delay.delay_right_ms);
        delay.update_filters();
        delay
    }

    pub fn set_mode(&mut self, mode: u32) {
        self.mode = Self::sanitize_mode(mode);
    }

    pub fn set_delay_left_ms(&mut self, delay_ms: f32) {
        self.delay_left_ms = Self::sanitize(delay_ms, MIN_DELAY_MS, MAX_DELAY_MS, self.delay_left_ms);
    }

    pub fn set_delay_right_ms(&mut self, delay_ms: f32) {
        self.delay_right_ms = Self::sanitize(delay_ms, MIN_DELAY_MS, MAX_DELAY_MS, self.delay_right_ms);
    }

    pub fn set_feedback(&mut self, feedback: f32) {
        self.feedback = Self::sanitize(feedback, 0.0, MAX_FEEDBACK, self.feedback);
    }

    pub fn set_cross_feedback(&mut self, cross_feedback: f32) {
        self.cross_feedback = Self::sanitize(cross_feedback, 0.0, 1.0, self.cross_feedback);
    }

    pub fn set_mix(&mut self, mix: f32) {
        self.mix = Self::sanitize(mix, 0.0, 1.0, self.mix);
    }

    pub fn set_low_cut(&mut self, low_cut_hz: f32) {
        self.low_cut_hz = Self::sanitize(low_cut_hz, 0.0, MAX_LOW_CUT_HZ, self.low_cut_hz);
        self.update_filters();
    }

    pub fn set_high_cut(&mut self, high_cut_hz: f32) {
        self.high_cut_hz = Self::sanitize(high_cut_hz, 0.0, self.sample_rate * 0.5, self.high_cut_hz);
        self.update_filters();
    }

    pub fn set_mod_rate(&mut self, mod_rate_hz: f32) {
        self.mod_rate_hz = Self::sanitize(mod_rate_hz, 0.0, MAX_MOD_RATE_HZ, self.mod_rate_hz);
    }

    pub fn set_mod_depth(&mut self, mod_depth_ms: f32) {
        self.mod_depth_ms = Self::sanitize(mod_depth_ms, 0.0, MAX_MOD_DEPTH_MS, self.mod_depth_ms);
    }

    pub fn set_drive(&mut self, drive: f32) {
        self.drive = Self::sanitize(drive, 0.0, 1.0, self.drive);
    }

    pub fn reset(&mut self) {
        self.line_left.reset();
        self.line_right.reset();
        self.low_cut_left.reset();
        self.low_cut_right.reset();
        self.high_cut_left.reset();
        self.high_cut_right.reset();
        self.lfo_phase = 0.0;
    }

    /// Filters and saturates a feedback sample.
    fn shape_feedback(&mut self, sample: f32, right: bool) -> f32 {
        let mut x = sample;

        if self.low_cut_enabled {
            let state = if right { &mut self.low_cut_right } else { &mut self.low_cut_left };
            x = self.low_cut.process_sample(state, x);
        }

        if self.high_cut_enabled {
            let state = if right { &mut self.high_cut_right } else { &mut self.high_cut_left };
            x = self.high_cut.process_sample(state, x);
        }

        if self.drive > 0.0 {
            // Unity gain for small signals, soft limiting for loud ones,
            // which also keeps high feedback settings from running away.
            let k = 1.0 + self.drive * DRIVE_SCALE;
            x = (x * k).tanh() / k;
        }

        x
    }

    /// Processes a stereo block in place. Both buffers must have the same length;
    /// for a mono input, pass a copy of the same channel as `right`.
    pub fn process(&mut self, left: &mut [f32], right: &mut [f32]) {
        let len = left.len().min(right.len());

        if len == 0 {
            return;
        }

        let target_left = self.ms_to_samples(self.delay_left_ms);
        let target_right = self.ms_to_samples(self.delay_right_ms);
        let mod_depth = self.ms_to_samples(self.mod_depth_ms);
        let lfo_increment = 2.0 * PI * self.mod_rate_hz / self.sample_rate;

        let cross = match self.mode {
            MODE_PING_PONG => 1.0,
            MODE_MONO => 0.0,
            _ => self.cross_feedback,
        };

        for i in 0..len {
            let dry_left = left[i];
            let dry_right = right[i];

            let (in_left, in_right) = match self.mode {
                MODE_MONO | MODE_PING_PONG => ((dry_left + dry_right) * 0.5, 0.0),
                _ => (dry_left, dry_right),
            };

            // Glide towards the target delay times.
            self.current_left += (target_left - self.current_left) * self.glide_coefficient;
            self.current_right += (target_right - self.current_right) * self.glide_coefficient;

            // Modulation only lengthens the delay, so it never drops below the set time.
            let (lfo_left, lfo_right) = if mod_depth > 0.0 {
                let phase = self.lfo_phase;
                self.lfo_phase += lfo_increment;

                if self.lfo_phase >= 2.0 * PI {
                    self.lfo_phase -= 2.0 * PI;
                }

                // The right side runs 90 degrees ahead, for a wider stereo image.
                (mod_depth * 0.5 * (1.0 + phase.sin()), mod_depth * 0.5 * (1.0 + phase.cos()))
            } else {
                (0.0, 0.0)
            };

            let out_left = self.line_left.read(self.current_left + lfo_left);
            let out_right = if self.mode == MODE_MONO {
                out_left
            } else {
                self.line_right.read(self.current_right + lfo_right)
            };

            let feedback_left = self.shape_feedback(out_left * (1.0 - cross) + out_right * cross, false) * self.feedback;
            self.line_left.write(in_left + feedback_left);

            if self.mode != MODE_MONO {
                let feedback_right = self.shape_feedback(out_right * (1.0 - cross) + out_left * cross, true) * self.feedback;
                self.line_right.write(in_right + feedback_right);
            }

            let mixed_left = dry_left * (1.0 - self.mix) + out_left * self.mix;
            let mixed_right = dry_right * (1.0 - self.mix) + out_right * self.mix;

            left[i] = if mixed_left.is_finite() { mixed_left } else { 0.0 };
            right[i] = if mixed_right.is_finite() { mixed_right } else { 0.0 };
        }
    }

    pub fn get_mode(&self) -> u32 { self.mode }
    pub fn get_delay_left_ms(&self) -> f32 { self.delay_left_ms }
    pub fn get_delay_right_ms(&self) -> f32 { self.delay_right_ms }
    pub fn get_feedback(&self) -> f32 { self.feedback }
    pub fn get_cross_feedback(&self) -> f32 { self.cross_feedback }
    pub fn get_mix(&self) -> f32 { self.mix }
    pub fn get_low_cut(&self) -> f32 { self.low_cut_hz }
    pub fn get_high_cut(&self) -> f32 { self.high_cut_hz }
    pub fn get_mod_rate(&self) -> f32 { self.mod_rate_hz }
    pub fn get_mod_depth(&self) -> f32 { self.mod_depth_ms }
    pub fn get_drive(&self) -> f32 { self.drive }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SR: f32 = 1000.0;

    /// Feeds an impulse into the given channel(s) and returns the indices of non-zero output samples.
    fn impulse_response(delay: &mut AdvancedDelay, impulse_left: f32, impulse_right: f32, length: usize) -> (Vec<usize>, Vec<usize>) {
        let mut left = vec![0.0; length];
        let mut right = vec![0.0; length];

        left[0] = impulse_left;
        right[0] = impulse_right;

        delay.process(&mut left, &mut right);

        let hits = |buffer: &Vec<f32>| buffer.iter().enumerate().skip(1).filter(|(_, v)| v.abs() > 1.0e-3).map(|(i, _)| i).collect();
        (hits(&left), hits(&right))
    }

    #[test]
    fn stereo_mode_keeps_sides_separate() {
        // 100 ms = 100 samples at 1 kHz. Left only.
        let mut delay = AdvancedDelay::new(SR, MODE_STEREO, 100.0, 150.0, 0.5, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0);
        let (left, right) = impulse_response(&mut delay, 1.0, 0.0, 400);

        assert_eq!(left, vec![100, 200, 300]);
        assert!(right.is_empty());
    }

    #[test]
    fn ping_pong_alternates_sides() {
        let mut delay = AdvancedDelay::new(SR, MODE_PING_PONG, 100.0, 100.0, 0.5, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0);
        let (left, right) = impulse_response(&mut delay, 1.0, 1.0, 450);

        assert_eq!(left, vec![100, 300]);
        assert_eq!(right, vec![200, 400]);
    }

    #[test]
    fn mono_mode_echoes_on_both_sides() {
        let mut delay = AdvancedDelay::new(SR, MODE_MONO, 100.0, 999.0, 0.5, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0);
        let (left, right) = impulse_response(&mut delay, 1.0, 0.0, 250);

        assert_eq!(left, vec![100, 200]);
        assert_eq!(right, vec![100, 200]);
    }

    #[test]
    fn feedback_decays_and_stays_finite() {
        let mut delay = AdvancedDelay::new(48000.0, MODE_STEREO, 10.0, 10.0, 0.98, 0.5, 0.5, 100.0, 5000.0, 2.0, 5.0, 1.0);
        let mut left: Vec<f32> = (0..48000).map(|i| ((i as f32) * 0.01).sin()).collect();
        let mut right = left.clone();

        delay.process(&mut left, &mut right);

        assert!(left.iter().chain(right.iter()).all(|v| v.is_finite() && v.abs() < 10.0));
    }
}
