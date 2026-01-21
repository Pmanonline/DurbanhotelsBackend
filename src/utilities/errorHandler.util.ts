import { Response, Request, NextFunction } from "express";

export interface ErrorResponse {
  message: string;
  statusCode: number;
  status: string;
  stack?: object;
  name?: string;
}

export const errorHandler = (
  err: ErrorResponse,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  if (err.name === "ValidationError") {
    err.statusCode = 400;
    err.status = "fail";
  }

  res.status(err.statusCode || 500).json({
    status: err.status,
    message: err.message,
    errstack: err.statusCode !== 500 ? null : err.stack,
  });
};
