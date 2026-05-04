import { Request, Response, NextFunction } from "express";
import { verifyAccess } from "../lib/jwt";
import { isRevoked } from "../lib/tokenBlacklist";

export interface AuthRequest extends Request {
  userId: string;
  tokenJti: string;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Token ausente." });
    return;
  }
  try {
    const payload = verifyAccess(header.slice(7));
    if (isRevoked(payload.jti)) {
      res.status(401).json({ message: "Token revogado." });
      return;
    }
    (req as AuthRequest).userId = payload.sub;
    (req as AuthRequest).tokenJti = payload.jti;
    next();
  } catch {
    res.status(401).json({ message: "Token inválido ou expirado." });
  }
}
