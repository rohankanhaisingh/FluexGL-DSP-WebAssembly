pub(super) const MIN_SAMPLE_RATE: f32 = 1.0;

pub(super) const NUM_COMBS: usize = 8;
pub(super) const NUM_ALLPASSES: usize = 4;

pub(super) const COMB_TUNING_44K1: [usize; NUM_COMBS] = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
pub(super) const ALLPASS_TUNING_44K1: [usize; NUM_ALLPASSES] = [556, 441, 341, 225];
pub(super) const REFERENCE_SAMPLE_RATE: f32 = 44100.0;

pub(super) const ALLPASS_FEEDBACK: f32 = 0.5;

pub(super) const ROOM_SIZE_FEEDBACK_SCALE: f32 = 0.28;
pub(super) const ROOM_SIZE_FEEDBACK_OFFSET: f32 = 0.7;

pub(super) const DAMPING_SCALE: f32 = 0.4;

pub(super) const DEFAULT_ROOM_SIZE: f32 = 0.5;
pub(super) const DEFAULT_DAMPING: f32 = 0.5;
pub(super) const DEFAULT_DRY_LEVEL: f32 = 0.7;
pub(super) const DEFAULT_WET_LEVEL: f32 = 0.3;
pub(super) const DEFAULT_PRE_DELAY_MS: f32 = 0.0;
pub(super) const DEFAULT_STEREO_SPREAD_MS: f32 = 0.0;

pub(super) const MAX_PRE_DELAY_MS: f32 = 500.0;
