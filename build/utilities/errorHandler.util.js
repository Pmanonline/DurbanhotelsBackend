"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
next) => {
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
exports.errorHandler = errorHandler;
