"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.errorHandlingMiddleware = exports.ApiError = void 0;
// import { Request, Response } from "express";
class CustomError extends Error {
    constructor(statusCode, message) {
        super(message); // Pass message to the base Error class
        this.statusCode = statusCode;
        // this.name = this.constructor.name; // Set the error name to the class name
        Error.captureStackTrace(this, this.constructor); // Capture stack trace
    }
}
class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.ApiError = ApiError;
const errorHandlingMiddleware = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    // const message = err.message || "Internal Server Error";
    res.status(statusCode).json({ success: false, message: err.message });
    next();
};
exports.errorHandlingMiddleware = errorHandlingMiddleware;
const errorHandler = (statusCode, message) => {
    return new CustomError(statusCode, message);
};
exports.errorHandler = errorHandler;
