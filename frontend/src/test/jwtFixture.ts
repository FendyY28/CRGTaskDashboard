/**
 * Build a JWT for tests. The signature is a placeholder — nothing here
 * verifies signatures, so the token only needs a valid 3-part shape.
 *
 * @param exp Expiry in seconds since epoch. Omit to build a token with no
 *            "exp" claim (i.e. an opaque token from the helper's perspective).
 */
export const buildTestJwt = (exp?: number): string => {
  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  const payload: Record<string, unknown> = exp === undefined ? {} : { exp };
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
};
