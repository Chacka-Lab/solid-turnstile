const TURNSTILE_API = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Exhaustive list of error codes returned by the Turnstile /siteverify endpoint. */
export const turnstileErrCodes = Object.freeze([
  'missing-input-secret',
  'invalid-input-secret',
  'missing-input-response',
  'invalid-input-response',
  'bad-request',
  'timeout-or-duplicate',
  'internal-error',
] as const);

/** Union of all valid Turnstile error code strings. */
export type TurnstileErrCode = (typeof turnstileErrCodes)[number];

/** Discriminated union representing a parsed /siteverify response. */
export type TurnstileResult =
  | {
      success: true;
      challenge_ts: string;
      hostname: string;
      action?: string;
      cdata?: string;
      metadata?: {
        ephemeral_id?: string;
      };
    }
  | {
      success: false;
      /** Only codes present in turnstileErrCodes are retained; unknown codes are dropped. */
      'error-codes': TurnstileErrCode[];
    };

/**
 * Type guard: returns true if value is a known TurnstileErrCode.
 */
function isTurnstileErrCode(value: unknown): value is TurnstileErrCode {
  return (
    typeof value === 'string' && (turnstileErrCodes as readonly string[]).includes(value)
  );
}

/**
 * Parses the optional metadata field from a success response.
 * Returns undefined for any non-plain-object value (null, array, primitive).
 */
function parseMetadata(raw: unknown): { ephemeral_id?: string } | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return undefined;
  }
  const obj = raw as Record<string, unknown>;

  return {
    ephemeral_id:
      typeof obj['ephemeral_id'] === 'string' ? obj['ephemeral_id'] : undefined,
  };
}

/**
 * Validates and narrows the raw JSON from /siteverify into a typed TurnstileResult.
 * Throws if the response shape is unexpected or required fields are missing.
 */
function parseTurnstileResult(raw: unknown): TurnstileResult {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Turnstile: unexpected non-object response');
  }

  const obj = raw as Record<string, unknown>;

  if (obj['success'] === true) {
    // challenge_ts and hostname are required on success
    if (typeof obj['challenge_ts'] !== 'string' || typeof obj['hostname'] !== 'string') {
      throw new Error('Turnstile: missing required fields on success response');
    }
    return {
      success: true,
      challenge_ts: obj['challenge_ts'],
      hostname: obj['hostname'],
      action: typeof obj['action'] === 'string' ? obj['action'] : undefined,
      cdata: typeof obj['cdata'] === 'string' ? obj['cdata'] : undefined,
      metadata: parseMetadata(obj['metadata']),
    };
  }

  if (obj['success'] === false) {
    if (!Array.isArray(obj['error-codes'])) {
      throw new Error('Turnstile: error-codes must be an array');
    }
    return {
      success: false,
      // Unknown error codes (not in turnstileErrCodes) are silently dropped
      'error-codes': obj['error-codes'].filter(isTurnstileErrCode),
    };
  }

  throw new Error('Turnstile: unexpected response shape');
}

/**
 * Validates a Turnstile token with the Cloudflare /siteverify API.
 * Reference: https://developers.cloudflare.com/turnstile/get-started/server-side-validation
 *
 * @param secret - Server-side secret key from the Cloudflare dashboard.
 * @param token  - Token submitted by the client (`cf-turnstile-response`).
 * @param remoteIp - Optional: the visitor's IP address for additional validation.
 * @param idempotencyKey - Optional: UUID to deduplicate retried requests.
 * @returns Parsed TurnstileResult; check `result.success` to branch on outcome.
 */
export async function validateTurnstile(
  secret: string,
  token: string,
  remoteIp?: string,
  idempotencyKey?: string,
): Promise<TurnstileResult> {
  const res = await fetch(TURNSTILE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      secret: secret,
      response: token,
      remoteip: remoteIp,
      idempotency_key: idempotencyKey,
    }),
  });

  return parseTurnstileResult(await res.json());
}
