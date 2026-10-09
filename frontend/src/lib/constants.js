/**
 * Frontend constants.
 *
 * IMPORTANT: FREE_DELIVERY_THRESHOLD must match the backend
 * `settings.FREE_DELIVERY_THRESHOLD`. The backend enforces the rule
 * server-side; this constant is only used to render previews.
 *
 * If you want to avoid the manual sync, expose a public endpoint like
 * GET /api/v1/config/public that returns this value and load it once at
 * app boot.
 */
export const FREE_DELIVERY_THRESHOLD = 100; // GH₵