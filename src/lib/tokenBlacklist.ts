const blacklist = new Set<string>();

export function revokeToken(jti: string) {
  blacklist.add(jti);
}

export function isRevoked(jti: string) {
  return blacklist.has(jti);
}
