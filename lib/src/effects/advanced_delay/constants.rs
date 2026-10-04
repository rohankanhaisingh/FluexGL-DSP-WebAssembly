pub(super) const MIN_SAMPLE_RATE: f32 = 1.0;

pub(super) const MIN_DELAY_MS: f32 = 1.0;
pub(super) const MAX_DELAY_MS: f32 = 4000.0;
pub(super) const MAX_FEEDBACK: f32 = 0.98;
pub(super) const MAX_MOD_DEPTH_MS: f32 = 20.0;
pub(super) const MAX_MOD_RATE_HZ: f32 = 10.0;
pub(super) const MAX_LOW_CUT_HZ: f32 = 2000.0;
pub(super) const MIN_FILTER_HZ: f32 = 20.0;

/// Time (seconds) in which a delay time change glides to its new value.
/// Prevents clicks, and gives tape-like pitch bends when the time is automated.
pub(super) const DELAY_GLIDE_SECONDS: f32 = 0.05;

/// Q of the feedback filters (Butterworth).
pub(super) const FILTER_Q: f32 = 0.7071;

/// How hard the drive control pushes the feedback into saturation.
pub(super) const DRIVE_SCALE: f32 = 4.0;

pub(super) const MODE_STEREO: u32 = 0;
pub(super) const MODE_MONO: u32 = 1;
pub(super) const MODE_PING_PONG: u32 = 2;

pub(super) const DEFAULT_DELAY_MS: f32 = 300.0;
pub(super) const DEFAULT_FEEDBACK: f32 = 0.35;
pub(super) const DEFAULT_MIX: f32 = 0.35;
