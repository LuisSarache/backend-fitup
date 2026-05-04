import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { env } from "./env";

export interface TokenPayload {
  sub: string;
  jti: string;
}

export function signAccess(userId: string) {
  return jwt.sign({ sub: userId, jti: randomUUID() }, env.JWT_SECRET, { expiresIn: "15m" });
}

export function signRefresh(userId: string) {
  return jwt.sign({ sub: userId, jti: randomUUID() }, env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccess(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

export function verifyRefresh(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
}
