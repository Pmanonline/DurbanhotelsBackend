"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailValidator = void 0;
const emailValidator = (value) => {
    // Regular expression for validating email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
};
exports.emailValidator = emailValidator;
