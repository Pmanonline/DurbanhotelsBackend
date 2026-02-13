"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const allowedOrigins_config_1 = __importDefault(require("./allowedOrigins.config"));
const corsOptions = {
    origin: (origin, callback) => {
        if (allowedOrigins_config_1.default.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        }
        else {
            callback(new Error("not allowed CORS"), false);
        }
    },
    credentials: true,
    optionSuccessStatus: 200,
};
exports.default = corsOptions;
