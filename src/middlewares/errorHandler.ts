import { Request, Response, NextFunction } from "express";

function sanitize(value: unknown): string {
  const msg = value instanceof Error ? value.message : String(value);
  return msg.replace(/[\r\n\t]/g, " ").slice(0, 200);
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("[error]", sanitize(err));
  res.status(500).json({ message: "Erro no servidor. Tente novamente mais tarde." });
}
