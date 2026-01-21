import { NextFunction, Request, Response } from "express";
// import { Request, Response } from "express";

class CustomError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message); // Pass message to the base Error class
    this.statusCode = statusCode;
    // this.name = this.constructor.name; // Set the error name to the class name
    Error.captureStackTrace(this, this.constructor); // Capture stack trace
  }
}

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);

    this.statusCode = statusCode;
  }
}

export const errorHandlingMiddleware = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  // const message = err.message || "Internal Server Error";
  res.status(statusCode).json({ success: false, message: err.message });
  next();
};

export const errorHandler = (
  statusCode: number,
  message: string
): CustomError => {
  return new CustomError(statusCode, message);
};
