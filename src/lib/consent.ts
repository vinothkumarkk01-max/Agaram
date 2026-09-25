/**
 * Single source of truth for "which version of the Privacy Policy did
 * the member agree to" when a flow stamps a `consent_version` column
 * (currently: `identity_verifications.consent_version`, Phase 33 in
 * supabase/schema.sql — added after a security audit found consent
 * was being recorded with no record of which policy text it applied
 * to). Bump this string any time /privacy's substantive terms change
 * meaningfully — a plain date is enough for a solo-founder-scale
 * product; swap for a real semantic version if /privacy ever gets
 * formal revision numbers.
 */
export const PRIVACY_POLICY_VERSION = "2026-09-24";
