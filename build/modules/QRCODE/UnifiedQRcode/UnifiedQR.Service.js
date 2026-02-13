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
exports.QRService = exports.DEFAULT_QR_DESIGN = void 0;
const qrcode_1 = __importDefault(require("qrcode"));
const canvas_1 = require("canvas");
/**
 * Default QR Design Configuration
 */
exports.DEFAULT_QR_DESIGN = {
    qr_template: "classic",
    dot_style: "square",
    corner_style: "square",
    frame: "none",
    body_pattern: "single",
    qr_primary_color: "#000000",
    qr_secondary_color: "#000000",
    qr_background_color: "#FFFFFF",
    error_correction: "M",
    margin: 2,
    qr_size: 1000,
};
class QRService {
    /**
     * Generate styled QR code with advanced options
     */
    static generateStyledQRCode(url, qrDesign) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const design = Object.assign(Object.assign({}, exports.DEFAULT_QR_DESIGN), qrDesign);
                console.log("🎨 Generating SCANNABLE QR with design:", {
                    frame: design.frame,
                    primaryColor: design.qr_primary_color,
                    backgroundColor: design.qr_background_color,
                    errorCorrection: design.error_correction,
                });
                const qrSize = design.qr_size || 1000;
                const margin = design.margin || 4;
                const primaryColor = design.qr_primary_color || "#000000";
                const backgroundColor = design.qr_background_color || "#FFFFFF";
                const frame = design.frame || "none";
                const frameColor = design.frame_color || "#000000";
                const errorCorrection = design.error_correction || "H";
                // Calculate frame width
                const frameWidth = frame === "thick"
                    ? 60
                    : frame === "thin"
                        ? 20
                        : frame === "none"
                            ? 0
                            : 40;
                const canvasSize = qrSize + frameWidth * 2;
                const canvas = (0, canvas_1.createCanvas)(canvasSize, canvasSize);
                const ctx = canvas.getContext("2d");
                // ALWAYS fill entire canvas with background first
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, canvasSize, canvasSize);
                // Step 1: Draw frame if needed (AROUND the QR, not inside it)
                if (frame !== "none") {
                    ctx.fillStyle = frameColor;
                    switch (frame) {
                        case "rounded":
                            const radius = 40;
                            ctx.beginPath();
                            ctx.moveTo(radius, 0);
                            ctx.lineTo(canvasSize - radius, 0);
                            ctx.quadraticCurveTo(canvasSize, 0, canvasSize, radius);
                            ctx.lineTo(canvasSize, canvasSize - radius);
                            ctx.quadraticCurveTo(canvasSize, canvasSize, canvasSize - radius, canvasSize);
                            ctx.lineTo(radius, canvasSize);
                            ctx.quadraticCurveTo(0, canvasSize, 0, canvasSize - radius);
                            ctx.lineTo(0, radius);
                            ctx.quadraticCurveTo(0, 0, radius, 0);
                            ctx.closePath();
                            ctx.fill();
                            break;
                        case "shadow":
                            ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
                            ctx.shadowBlur = 20;
                            ctx.shadowOffsetX = 8;
                            ctx.shadowOffsetY = 8;
                            ctx.fillRect(0, 0, canvasSize, canvasSize);
                            ctx.shadowColor = "transparent";
                            break;
                        default:
                            ctx.fillRect(0, 0, canvasSize, canvasSize);
                    }
                    // Redraw background AFTER frame
                    ctx.fillStyle = backgroundColor;
                    ctx.fillRect(frameWidth, frameWidth, qrSize, qrSize);
                }
                // Step 3: Generate SIMPLE, SCANNABLE QR code
                const qrOptions = {
                    errorCorrectionLevel: errorCorrection,
                    margin: 0,
                    width: qrSize,
                    color: {
                        dark: primaryColor,
                        light: backgroundColor,
                    },
                };
                // Generate QR to a temporary canvas
                const tempCanvas = (0, canvas_1.createCanvas)(qrSize, qrSize);
                yield qrcode_1.default.toCanvas(tempCanvas, url, qrOptions);
                // Draw QR onto main canvas
                ctx.drawImage(tempCanvas, frameWidth, frameWidth);
                // Step 4: Add logo if provided
                if (design.logo_image && ["Q", "H"].includes(errorCorrection)) {
                    yield this.addLogoToCanvas(canvas, ctx, frameWidth, design);
                }
                // Use Canvas static property correctly
                const buffer = canvas.toBuffer("image/png", {
                    compressionLevel: 6,
                    filters: canvas_1.Canvas.PNG_FILTER_NONE,
                });
                const base64Image = `data:image/png;base64,${buffer.toString("base64")}`;
                console.log("✅ SCANNABLE QR code generated:", {
                    size: `${qrSize}x${qrSize}`,
                    frame: frame,
                    hasLogo: !!design.logo_image,
                    errorCorrection,
                    dataLength: base64Image.length,
                });
                return base64Image;
            }
            catch (error) {
                console.error("❌ Error generating QR code:", error);
                console.warn("⚠️ Falling back to basic QR code");
                return yield this.generateBasicQRCodeFallback(url, qrDesign);
            }
        });
    }
    /**
     * Add logo to canvas
     */
    static addLogoToCanvas(canvas, ctx, frameWidth, qrDesign) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { loadImage } = require("canvas");
                const logo = yield loadImage(qrDesign.logo_image);
                const qrSize = qrDesign.qr_size || 1000;
                const logoSizePercent = qrDesign.logo_size === "small"
                    ? 15
                    : qrDesign.logo_size === "large"
                        ? 20
                        : 17;
                const logoWidth = qrSize * (logoSizePercent / 100);
                const logoHeight = qrSize * (logoSizePercent / 100);
                const logoX = frameWidth + (qrSize - logoWidth) / 2;
                const logoY = frameWidth + (qrSize - logoHeight) / 2;
                const padding = logoWidth * 0.15;
                const bgSize = logoWidth + padding * 2;
                const bgX = logoX - padding;
                const bgY = logoY - padding;
                const radius = bgSize * 0.1;
                ctx.fillStyle = qrDesign.qr_background_color || "#FFFFFF";
                ctx.beginPath();
                ctx.moveTo(bgX + radius, bgY);
                ctx.lineTo(bgX + bgSize - radius, bgY);
                ctx.quadraticCurveTo(bgX + bgSize, bgY, bgX + bgSize, bgY + radius);
                ctx.lineTo(bgX + bgSize, bgY + bgSize - radius);
                ctx.quadraticCurveTo(bgX + bgSize, bgY + bgSize, bgX + bgSize - radius, bgY + bgSize);
                ctx.lineTo(bgX + radius, bgY + bgSize);
                ctx.quadraticCurveTo(bgX, bgY + bgSize, bgX, bgY + bgSize - radius);
                ctx.lineTo(bgX, bgY + radius);
                ctx.quadraticCurveTo(bgX, bgY, bgX + radius, bgY);
                ctx.closePath();
                ctx.fill();
                ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
                console.log("✅ Logo added:", {
                    size: `${logoSizePercent}%`,
                    errorCorrection: qrDesign.error_correction,
                });
            }
            catch (error) {
                console.warn("⚠️ Could not load logo:", error);
            }
        });
    }
    /**
     * Fallback: Generate basic QR code without styling
     */
    static generateBasicQRCodeFallback(url, qrDesign) {
        return __awaiter(this, void 0, void 0, function* () {
            const design = Object.assign(Object.assign({}, exports.DEFAULT_QR_DESIGN), qrDesign);
            const options = {
                width: design.qr_size || 1000,
                margin: design.margin || 4,
                errorCorrectionLevel: design.error_correction || "H",
                color: {
                    dark: design.qr_primary_color || "#000000",
                    light: design.qr_background_color || "#FFFFFF",
                },
                type: "image/png",
            };
            const base64 = yield qrcode_1.default.toDataURL(url, options);
            console.log("✅ Fallback QR generated, length:", base64.length);
            return base64;
        });
    }
    /**
     * Validate contrast ratio for scannability
     */
    static validateContrast(color1, color2) {
        const ratio = this.getContrastRatio(color1, color2);
        return {
            ratio,
            isScannable: ratio >= 4.5, // WCAG AA minimum
        };
    }
    /**
     * Calculate contrast ratio between two colors
     */
    static getContrastRatio(color1, color2) {
        const lum1 = this.getLuminance(color1);
        const lum2 = this.getLuminance(color2);
        const lighter = Math.max(lum1, lum2);
        const darker = Math.min(lum1, lum2);
        return (lighter + 0.05) / (darker + 0.05);
    }
    /**
     * Get luminance of a color
     */
    static getLuminance(hexColor) {
        const rgb = this.hexToRgb(hexColor);
        if (!rgb)
            return 0;
        const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
            const v = val / 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    /**
     * Convert hex color to RGB
     */
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16),
            }
            : null;
    }
    /**
     * Generate short code for URL
     */
    static generateShortCode(title) {
        const now = new Date();
        const timestamp = now
            .toISOString()
            .replace(/[-:T.]/g, "")
            .slice(0, 12);
        let shortCodeBase = title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-+|-+$/g, "");
        if (!shortCodeBase) {
            shortCodeBase = "qr";
        }
        return `${shortCodeBase}-${timestamp}`;
    }
}
exports.QRService = QRService;
exports.default = QRService;
