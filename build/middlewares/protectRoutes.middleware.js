"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const individualUserAuth_model1_1 = __importDefault(require("../modules/authentication/individualUserAuth/individualUserAuth.model1"));
const protectRoutes = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const user = res.locals.user;
    if (!user) {
        return res.sendStatus(403);
    }
    try {
        const userExists = user.role === "ind" || user.role === "g-ind"
            ? yield individualUserAuth_model1_1.default.findOne({ email: user.userData.email })
            : null; // Added the else case
        if (!userExists) {
            return res.status(403).json({
                message: "User does not exist",
            });
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }
    catch (error) {
        return res.status(500).json({
            message: error === null || error === void 0 ? void 0 : error.message,
        });
    }
    return next();
});
exports.default = protectRoutes;
