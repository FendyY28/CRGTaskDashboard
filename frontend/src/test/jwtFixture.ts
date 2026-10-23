/**
 * Convert a string to a binary string of its UTF-8 bytes, which is what `btoa`
 * needs. Calling `btoa` on raw text throws for any character above U+00FF.
 */
const utf8ToBinary = (text: string): string => {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) {
    binary += String.fromCharCode(byte);
  }
  return binary;
};

/**
 * Build a JWT for tests. The signature is a placeholder — nothing here
 * verifies signatures, so the token only needs a valid 3-part shape.
 *
 * @param exp Expiry in seconds since epoch. Omit to build a token with no
 *            "exp" claim (i.e. an opaque token from the helper's perspective).
 * @param claims Extra claims to embed in the payload. `exp`, when provided,
 *               takes precedence over any `exp` key in `claims`.
 */
export const buildTestJwt = (
  exp?: number,
  claims?: Record<string, unknown>,
): string => {
  const encode = (obj: unknown) =>
    btoa(utf8ToBinary(JSON.stringify(obj)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  const payload: Record<string, unknown> = {
    ...claims,
    ...(exp === undefined ? {} : { exp }),
  };
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
};
