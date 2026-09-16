use wasm_bindgen::prelude::*;

use crate::utilities::constants::DEFAULT_SAMPLE_RATE;

mod allpass;
mod comb;
mod constants;
mod pre_delay;

use allpass::Allpass;
use comb::Comb;
use constants::*;
use pre_delay::PreDelay;

#[wasm_bindgen]
pub struct Reverb {
    sample_rate: f32,

    room_size: f32,
    damping: f32,
    dry_level: f32,
    wet_level: f32,
    pre_delay_ms: f32,
    stereo_spread_ms: f32,

    pre_delay: PreDelay,
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

    fn sanitize_pre_delay_ms(pre_delay_ms: f32, fallback: f32) -> f32 {
        if pre_delay_ms.is_finite() {
            pre_delay_ms.clamp(0.0, MAX_PRE_DELAY_MS)
        } else {
            fallback.clamp(0.0, MAX_PRE_DELAY_MS)
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

    fn pre_delay_samples(sample_rate: f32, pre_delay_ms: f32) -> usize {
        let samples = (pre_delay_ms / 1000.0) * sample_rate;

        if !samples.is_finite() {
            return 1;
        }

        samples.round().max(0.0) as usize
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
    pub fn new(
        sample_rate: f32,
        room_size: f32,
        damping: f32,
        dry_level: f32,
        wet_level: f32,
        pre_delay_ms: f32,
        stereo_spread_ms: f32,
    ) -> Reverb {
        let sr = Self::sanitize_sample_rate(sample_rate);
        let room = Self::sanitize_unit(room_size, DEFAULT_ROOM_SIZE);
        let damp = Self::sanitize_unit(damping, DEFAULT_DAMPING);
        let dry = Self::sanitize_unit(dry_level, DEFAULT_DRY_LEVEL);
        let wet = Self::sanitize_unit(wet_level, DEFAULT_WET_LEVEL);
        let pre_delay_ms = Self::sanitize_pre_delay_ms(pre_delay_ms, DEFAULT_PRE_DELAY_MS);

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
            dry_level: dry,
            wet_level: wet,
            pre_delay_ms,
            stereo_spread_ms: spread_ms,
            pre_delay: PreDelay::new(Self::pre_delay_samples(sr, pre_delay_ms)),
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

    pub fn set_dry(&mut self, dry_level: f32) {
        self.dry_level = Self::sanitize_unit(dry_level, self.dry_level);
    }

    pub fn set_wet(&mut self, wet_level: f32) {
        self.wet_level = Self::sanitize_unit(wet_level, self.wet_level);
    }

    pub fn set_pre_delay_ms(&mut self, pre_delay_ms: f32) {
        self.pre_delay_ms = Self::sanitize_pre_delay_ms(pre_delay_ms, self.pre_delay_ms);
        self.pre_delay = PreDelay::new(Self::pre_delay_samples(self.sample_rate, self.pre_delay_ms));
    }

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
        self.pre_delay.reset();
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

            let delayed = self.pre_delay.process(dry);

            let mut wet = 0.0;
            for comb in self.combs.iter_mut() {
                wet += comb.process(delayed);
            }
            wet /= comb_count;

            for allpass in self.allpasses.iter_mut() {
                wet = allpass.process(wet);
            }

            let mixed = dry * self.dry_level + wet * self.wet_level;
            *sample = if mixed.is_finite() { mixed } else { 0.0 };
        }
    }

    pub fn get_room_size(&self) -> f32 { self.room_size }
    pub fn get_damping(&self) -> f32 { self.damping }
    pub fn get_dry(&self) -> f32 { self.dry_level }
    pub fn get_wet(&self) -> f32 { self.wet_level }
    pub fn get_pre_delay_ms(&self) -> f32 { self.pre_delay_ms }
    pub fn get_stereo_spread_ms(&self) -> f32 { self.stereo_spread_ms }
}
