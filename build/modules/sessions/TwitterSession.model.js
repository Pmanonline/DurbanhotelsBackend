"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const twitterSessionSchema = new mongoose_1.Schema({
    state: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    codeVerifier: {
        type: String,
        required: true,
    },
    codeChallenge: {
        type: String,
        required: true,
    },
    redirectUri: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true,
    },
}, {
    timestamps: true,
});
// Auto-delete expired sessions using TTL index
twitterSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const TwitterSession = (0, mongoose_1.model)("TwitterSession", twitterSessionSchema);
exports.default = TwitterSession;
