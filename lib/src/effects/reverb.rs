use wasm_bindgen::prelude::*;

use crate::utilities::constants::DEFAULT_SAMPLE_RATE;

const MIN_SAMPLE_RATE: f32 = 1.0;

const NUM_COMBS: usize = 8;
const NUM_ALLPASSES: usize = 4;

// Delay-line lengths tuned by Schroeder/Jezar (the classic "Freeverb" design),
// given in samples at a reference sample rate of 44100 Hz. They are scaled to
// the instance's actual sample rate at construction time so the reverb
// character stays consistent across sample rates.
const COMB_TUNING_44K1: [usize; NUM_COMBS] = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
const ALLPASS_TUNING_44K1: [usize; NUM_ALLPASSES] = [556, 441, 341, 225];
const REFERENCE_SAMPLE_RATE: f32 = 44100.0;

// Allpass feedback is fixed in the Schroeder design; it controls diffusion
// density, not decay time, so it is not exposed as a parameter.
const ALLPASS_FEEDBACK: f32 = 0.5;

// `room_size` in [0, 1] is mapped onto this comb-feedback range. The upper
// bound is kept below 1.0 so the feedback loop can never accumulate energy
// indefinitely (i.e. the reverb tail always decays).
const ROOM_SIZE_FEEDBACK_SCALE: f32 = 0.28;
const ROOM_SIZE_FEEDBACK_OFFSET: f32 = 0.7;

// `damping` in [0, 1] is mapped onto the one-pole lowpass coefficient used
// inside each comb's feedback path to roll off high frequencies over time.
const DAMPING_SCALE: f32 = 0.4;

const DEFAULT_ROOM_SIZE: f32 = 0.5;
const DEFAULT_DAMPING: f32 = 0.5;
const DEFAULT_MIX: f32 = 0.3;
const DEFAULT_STEREO_SPREAD_MS: f32 = 0.0;

/// A single Schroeder comb filter with a one-pole lowpass in its feedback
/// path, used to add damping (high-frequency loss) to the decaying tail.
struct Comb {
    buffer: Vec<f32>,
    index: usize,
    feedback: f32,
    damp1: f32,
    damp2: f32,
    filter_store: f32,
}

impl Comb {
    fn new(length: usize, feedback: f32, damp1: f32, damp2: f32) -> Comb {
        Comb {
            buffer: vec![0.0; length.max(1)],
            index: 0,
            feedback,
            damp1,
            damp2,
            filter_store: 0.0,
        }
    }

    fn set_feedback(&mut self, feedback: f32) {
        self.feedback = feedback;
    }

    fn set_damping(&mut self, damp1: f32, damp2: f32) {
        self.damp1 = damp1;
        self.damp2 = damp2;
    }

    fn process(&mut self, input: f32) -> f32 {
        let output = self.buffer[self.index];

        self.filter_store = output * self.damp2 + self.filter_store * self.damp1;
        if !self.filter_store.is_finite() {
            self.filter_store = 0.0;
        }

        let write_value = input + self.filter_store * self.feedback;
        self.buffer[self.index] = if write_value.is_finite() { write_value } else { 0.0 };

        self.index += 1;
        if self.index >= self.buffer.len() {
            self.index = 0;
        }

        output
    }

    fn reset(&mut self) {
        self.buffer.iter_mut().for_each(|s| *s = 0.0);
        self.filter_store = 0.0;
        self.index = 0;
    }
}

/// A single Schroeder allpass filter. Chained in series, these diffuse the
/// discrete echoes produced by the comb bank into a smooth, dense tail
/// without coloring the frequency response.
struct Allpass {
    buffer: Vec<f32>,
    index: usize,
    feedback: f32,
}

impl Allpass {
    fn new(length: usize, feedback: f32) -> Allpass {
        Allpass {
            buffer: vec![0.0; length.max(1)],
            index: 0,
            feedback,
        }
    }

    fn process(&mut self, input: f32) -> f32 {
        let buffered = self.buffer[self.index];
        let output = buffered - input;

        let write_value = input + buffered * self.feedback;
        self.buffer[self.index] = if write_value.is_finite() { write_value } else { 0.0 };

        self.index += 1;
        if self.index >= self.buffer.len() {
            self.index = 0;
        }

        output
    }

    fn reset(&mut self) {
        self.buffer.iter_mut().for_each(|s| *s = 0.0);
        self.index = 0;
    }
}

/// A Schroeder/Freeverb-style reverb: a bank of parallel damped comb filters
/// feeding a series of allpass diffusers, crossfaded against the dry signal.
///
/// Intended to be instantiated once per audio channel (like `Chorus`); pass a
/// non-zero `stereo_spread_ms` on one channel's instance so its delay-line
/// tunings are offset from the other channel(s), which decorrelates the tail
/// between channels instead of producing a mono-sounding reverb.
#[wasm_bindgen]
pub struct Reverb {
    sample_rate: f32,

    room_size: f32,
    damping: f32,
    mix: f32,
    stereo_spread_ms: f32,

    combs: Vec<Comb>,
    allpasses: Vec<Allpass>,
}

#[wasm_bindgen]
impl Reverb {
    fn sanitize_sample_rate(sample_rate: f32) -> f32 {
        if sample_rate.is_finite() {
            sample_rate.max(MIN_SAMPLE_RATE)
        } else {
            DEFAULT_SAMPLE_RATE
        }
    }

    fn sanitize_unit(value: f32, fallback: f32) -> f32 {
        if value.is_finite() {
            value.clamp(0.0, 1.0)
        } else {
            fallback.clamp(0.0, 1.0)
        }
    }

    fn comb_feedback(room_size: f32) -> f32 {
        room_size * ROOM_SIZE_FEEDBACK_SCALE + ROOM_SIZE_FEEDBACK_OFFSET
    }

    fn comb_damping(damping: f32) -> (f32, f32) {
        let damp1 = damping * DAMPING_SCALE;
        (damp1, 1.0 - damp1)
    }

    fn scale_length(reference_samples: usize, sample_rate: f32, extra_samples: f32) -> usize {
        let scaled = (reference_samples as f32) * (sample_rate / REFERENCE_SAMPLE_RATE) + extra_samples;

        if !scaled.is_finite() {
            return reference_samples.max(1);
        }

        scaled.round().max(1.0) as usize
    }

    fn build_combs(sample_rate: f32, room_size: f32, damping: f32, stereo_spread_samples: f32) -> Vec<Comb> {
        let feedback = Self::comb_feedback(room_size);
        let (damp1, damp2) = Self::comb_damping(damping);

        COMB_TUNING_44K1
            .iter()
            .map(|&reference_length| {
                let length = Self::scale_length(reference_length, sample_rate, stereo_spread_samples);
                Comb::new(length, feedback, damp1, damp2)
            })
            .collect()
    }

    fn build_allpasses(sample_rate: f32, stereo_spread_samples: f32) -> Vec<Allpass> {
        ALLPASS_TUNING_44K1
            .iter()
            .map(|&reference_length| {
                let length = Self::scale_length(reference_length, sample_rate, stereo_spread_samples);
                Allpass::new(length, ALLPASS_FEEDBACK)
            })
            .collect()
    }

    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32, room_size: f32, damping: f32, mix: f32, stereo_spread_ms: f32) -> Reverb {
        let sr = Self::sanitize_sample_rate(sample_rate);
        let room = Self::sanitize_unit(room_size, DEFAULT_ROOM_SIZE);
        let damp = Self::sanitize_unit(damping, DEFAULT_DAMPING);

        let spread_ms = if stereo_spread_ms.is_finite() {
            stereo_spread_ms.max(0.0)
        } else {
            DEFAULT_STEREO_SPREAD_MS
        };
        let spread_samples = (spread_ms / 1000.0) * sr;

        Reverb {
            sample_rate: sr,
            room_size: room,
            damping: damp,
            mix: Self::sanitize_unit(mix, DEFAULT_MIX),
            stereo_spread_ms: spread_ms,
            combs: Self::build_combs(sr, room, damp, spread_samples),
            allpasses: Self::build_allpasses(sr, spread_samples),
        }
    }

    pub fn set_room_size(&mut self, room_size: f32) {
        self.room_size = Self::sanitize_unit(room_size, self.room_size);

        let feedback = Self::comb_feedback(self.room_size);
        for comb in self.combs.iter_mut() {
            comb.set_feedback(feedback);
        }
    }

    pub fn set_damping(&mut self, damping: f32) {
        self.damping = Self::sanitize_unit(damping, self.damping);

        let (damp1, damp2) = Self::comb_damping(self.damping);
        for comb in self.combs.iter_mut() {
            comb.set_damping(damp1, damp2);
        }
    }

    pub fn set_mix(&mut self, mix: f32) {
        self.mix = Self::sanitize_unit(mix, self.mix);
    }

    /// Rebuilds the comb and allpass delay lines at the new spread. This
    /// discards their current contents (equivalent to a `reset()`), since
    /// the buffers themselves change length and old samples wouldn't line
    /// up with the new tuning anyway.
    pub fn set_stereo_spread_ms(&mut self, stereo_spread_ms: f32) {
        self.stereo_spread_ms = if stereo_spread_ms.is_finite() {
            stereo_spread_ms.max(0.0)
        } else {
            self.stereo_spread_ms
        };

        let spread_samples = (self.stereo_spread_ms / 1000.0) * self.sample_rate;

        self.combs = Self::build_combs(self.sample_rate, self.room_size, self.damping, spread_samples);
        self.allpasses = Self::build_allpasses(self.sample_rate, spread_samples);
    }

    pub fn reset(&mut self) {
        for comb in self.combs.iter_mut() {
            comb.reset();
        }
        for allpass in self.allpasses.iter_mut() {
            allpass.reset();
        }
    }

    pub fn process(&mut self, buffer: &mut [f32]) {
        if self.combs.is_empty() || buffer.is_empty() {
            return;
        }

        let comb_count = self.combs.len() as f32;

        for sample in buffer.iter_mut() {
            let dry = *sample;

            // Feed the same input sample into every parallel comb and sum
            // (then average) their outputs, mirroring the Freeverb topology.
            let mut wet = 0.0;
            for comb in self.combs.iter_mut() {
                wet += comb.process(dry);
            }
            wet /= comb_count;

            // Diffuse the summed comb output through the allpass chain.
            for allpass in self.allpasses.iter_mut() {
                wet = allpass.process(wet);
            }

            let mixed = dry * (1.0 - self.mix) + wet * self.mix;
            *sample = if mixed.is_finite() { mixed } else { 0.0 };
        }
    }

    pub fn get_room_size(&self) -> f32 { self.room_size }
    pub fn get_damping(&self) -> f32 { self.damping }
    pub fn get_mix(&self) -> f32 { self.mix }
    pub fn get_stereo_spread_ms(&self) -> f32 { self.stereo_spread_ms }
}
