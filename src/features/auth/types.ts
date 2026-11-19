export type MagicLinkFailure = 'invalid_email' | 'rate_limited' | 'unknown';

export type MagicLinkResult = { ok: true } | { ok: false; reason: MagicLinkFailure };
