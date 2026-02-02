use crate::utilities::constants::DEFAULT_SAMPLE_RATE;

/// Validates and normalizes a sample rate.
///
/// This function ensures that the provided `sample_rate` is always a valid,
/// usable value:
///
/// - If the value is **finite** (i.e. not `NaN` or ±∞), it guarantees that the
///   sample rate is at least `1.0`.
/// - If the value is **not finite**, it falls back to [`DEFAULT_SAMPLE_RATE`].
///
/// This is useful for defensively handling input coming from external sources
/// or user-provided data.
///
/// # Parameters
///
/// * `sample_rate` – The sample rate to validate.
///
/// # Returns
///
/// A valid `f32` sample rate that is always finite and ≥ `1.0`.
///
/// # Examples
///
/// ```
/// let sr = sanitize_sample_rate(44_100.0);
/// assert_eq!(sr, 44_100.0);
///
/// let sr = sanitize_sample_rate(0.0);
/// assert_eq!(sr, 1.0);
///
/// let sr = sanitize_sample_rate(f32::NAN);
/// assert_eq!(sr, DEFAULT_SAMPLE_RATE);
/// ```
pub fn sanitize_sample_rate(sample_rate: f32) -> f32 {
    if sample_rate.is_finite() {
        sample_rate.max(1.0)
    } else {
        DEFAULT_SAMPLE_RATE
    }
}
