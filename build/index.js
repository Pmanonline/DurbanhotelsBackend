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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dbconn_config_1 = __importDefault(require("./config/dbconn.config"));
const allowedOrigins_config_1 = __importDefault(require("./config/allowedOrigins.config"));
const express_fileupload_1 = __importDefault(require("express-fileupload"));
// QRcodes
const MenuQR_route_1 = __importDefault(require("./modules/QRCODE/MenuQRcode/MenuQR.route"));
const UnifiedQR_route_1 = __importDefault(require("./modules/QRCODE/UnifiedQRcode/UnifiedQR.route"));
const ActivityLog_route_1 = __importDefault(require("./modules/QRCODE/Activity_log/ActivityLog.route"));
const MenuFeedback_routes_1 = __importDefault(require("./modules/QRCODE/MenuFeedBack/MenuFeedback.routes"));
// Routes
const individualAuth_route_1 = __importDefault(require("./modules/authentication/individualUserAuth/individualAuth.route"));
const adminAuth_route_1 = __importDefault(require("./modules/authentication/adminUserAuth/adminAuth.route"));
const userProfile_route_1 = __importDefault(require("./modules/profiles/userProfile.route"));
// Middleware
const deserializeUser_middleware_1 = __importDefault(require("./middlewares/deserializeUser.middleware"));
const errorHandling_middleware_1 = require("./middlewares/errorHandling.middleware");
// Swagger config
const prodSwagger_1 = require("./prodSwagger");
const devSwagger_1 = require("./devSwagger");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins_config_1.default.includes(origin)) {
            callback(null, true);
        }
        else {
            console.log("⚠️ CORS blocked origin:", origin);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Refresh-Token"],
}));
// file upload middleware
app.use((0, express_fileupload_1.default)({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    limits: { fileSize: 5 * 1024 * 1024 },
    abortOnLimit: true,
    createParentPath: true,
    parseNested: true,
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((req, res, next) => {
    console.log(`🌐 [${req.method}] ${req.path}`);
    console.log("📦 Body immediately after parsing:", req.body);
    console.log("📋 Content-Type:", req.get("Content-Type"));
    next();
});
app.use((0, morgan_1.default)("dev"));
app.use(deserializeUser_middleware_1.default);
// ============================================
// ROUTES
// ============================================
// Health check
app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "Welcome to QRGenius API",
        timestamp: new Date().toISOString(),
    });
});
app.use("/auth/individual", individualAuth_route_1.default);
app.use("/auth/admin", adminAuth_route_1.default);
app.use("/qr/menu", MenuQR_route_1.default);
app.use("/qr/unified", UnifiedQR_route_1.default);
app.use("/qr/activity", ActivityLog_route_1.default);
app.use("/profile", userProfile_route_1.default);
app.use("/qr/menu-feedback", MenuFeedback_routes_1.default);
// ============================================
// SWAGGER/API DOCUMENTATION
// ============================================
const devSpec = (0, swagger_jsdoc_1.default)(devSwagger_1.options);
const prodSpec = (0, swagger_jsdoc_1.default)(prodSwagger_1.options);
app.use("/dev-api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(devSpec));
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(prodSpec));
// ============================================
// ERROR HANDLING (Must be LAST!)
// ============================================
app.use(errorHandling_middleware_1.errorHandlingMiddleware);
// ============================================
// DATABASE CONNECTION & SERVER START
// ============================================
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, dbconn_config_1.default)();
        console.log("✅ Connected to MongoDB");
        // console.log("🔧 Environment:", process.env.NODE_ENV || "development");
        // console.log("🌐 Frontend URL:", process.env.FRONTEND_URL);
        // console.log("🍪 Cookie Domain:", process.env.COOKIE_DOMAIN || "not set");
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error("❌ Failed to start server:", error.message);
        process.exit(1);
    }
});
startServer();
exports.default = app;
