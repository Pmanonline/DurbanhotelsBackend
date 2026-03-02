import { Router } from "express";
import {
  verifyAuth,
  adminOnly,
} from "../../middlewares/roleVerification.middleware";

import {
  createMenu,
  getMyMenu,
  getAllMenus,
  getAllMenusAdmin,
  getMenuById,
  updateMenu,
  deleteMenu,
  addCategory,
  updateCategory,
  deleteCategory,
  addSubCategory,
  updateSubCategory,
  deleteSubCategory,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleItemAvailability,
  getAllMenuItems,
} from "./controller/menuItem.controller";

import {
  createOrder,
  getOrders,
  getOrderById,
  getOrderByTrackingId,
  getOrdersByPhone,
  updateOrderStatus,
  updatePaymentStatus,
} from "./controller/order.controller";

const router = Router();

/*
 * ════════════════════════════════════════════════════════════════════════════
 *  PUBLIC ROUTES  — no authentication required
 * ════════════════════════════════════════════════════════════════════════════
 */

// ── Browse menu ───────────────────────────────────────────────────────────────
// GET  /menu/public
// GET  /menu/:menuId/public/items?categoryId=&subCategoryId=&available=
router.get("/public", getAllMenus);
router.get("/:menuId/public/items", getAllMenuItems);

// ── Order placement & tracking ────────────────────────────────────────────────
// POST /menu/public/orders
// GET  /menu/public/orders/track/:trackingId
// GET  /menu/public/orders/phone/:phone
router.post("/public/orders", createOrder);
router.get("/public/orders/track/:trackingId", getOrderByTrackingId);
router.get("/public/orders/phone/:phone", getOrdersByPhone);

/*
 * ════════════════════════════════════════════════════════════════════════════
 *  PROTECTED ROUTES  — authentication required
 * ════════════════════════════════════════════════════════════════════════════
 */
router.use(verifyAuth);
router.use(adminOnly);

/*
 * IMPORTANT — Route ordering rules:
 *
 *  Express matches routes in registration order. Any static path segment
 *  (/orders, /my-menu, /) MUST be registered BEFORE wildcard params (/:menuId)
 *  or Express will capture the static word as a param value and call the
 *  wrong controller (e.g. getMenuById("orders") → 500).
 *
 *  Correct order:
 *    1. POST /              (static)
 *    2. GET  /              (static)
 *    3. GET  /my-menu       (static)
 *    4. GET  /orders        (static) ← must be before /:menuId
 *    5. GET  /orders/:id    (static prefix)
 *    6. PATCH /orders/:id/* (static prefix)
 *    7. GET  /:menuId       (wildcard — registered last among single-segment routes)
 *    8. PUT  /:menuId
 *    9. DELETE /:menuId
 *   10. All /:menuId/... nested routes (safe — they have more segments)
 */

// ── Menu management — static paths ───────────────────────────────────────────
// POST   /menu                body: { title, business_name, menu_type, ... }
// GET    /menu                all menus with owner info (admin list view)
// GET    /menu/my-menu        owner's own menu — no ID needed
router.post("/", createMenu);
router.get("/", getAllMenusAdmin);
router.get("/my-menu", getMyMenu);

// ── Order management — static paths BEFORE /:menuId ──────────────────────────
// GET    /menu/orders?status=&orderType=&date=&limit=&page=
// GET    /menu/orders/:id
// PATCH  /menu/orders/:id/status    body: { status }
// PATCH  /menu/orders/:id/payment   body: { paymentStatus, paymentMethod? }
router.get("/orders", getOrders);
router.get("/orders/:id", getOrderById);
router.patch("/orders/:id/status", updateOrderStatus);
router.patch("/orders/:id/payment", updatePaymentStatus);

// ── Menu management — wildcard /:menuId (AFTER all static paths) ──────────────
// GET    /menu/:menuId        full menu tree with summary
// PUT    /menu/:menuId        update top-level menu fields
// DELETE /menu/:menuId        delete menu
router.get("/:menuId", getMenuById);
router.put("/:menuId", updateMenu);
router.delete("/:menuId", deleteMenu);

// ── Category management ───────────────────────────────────────────────────────
// POST   /menu/:menuId/categories
//        multipart/form-data → categoryData (JSON) + image (file, optional)
//        categoryData: { name*, displayOrder?, description? }
//
// PATCH  /menu/:menuId/categories/:categoryId
//        multipart/form-data → categoryData (JSON, partial) + image (optional)
//
// DELETE /menu/:menuId/categories/:categoryId
//        cascades: deletes all subcategories + items + their images
router.post("/:menuId/categories", addCategory);
router.patch("/:menuId/categories/:categoryId", updateCategory);
router.delete("/:menuId/categories/:categoryId", deleteCategory);

// ── SubCategory management ────────────────────────────────────────────────────
// POST   /menu/:menuId/categories/:categoryId/subcategories
//        multipart/form-data → subCategoryData (JSON) + image (file, optional)
//        subCategoryData: { name*, displayOrder?, description? }
//
// PATCH  /menu/:menuId/categories/:categoryId/subcategories/:subCategoryId
//        multipart/form-data → subCategoryData (JSON, partial) + image (optional)
//
// DELETE /menu/:menuId/categories/:categoryId/subcategories/:subCategoryId
//        cascades: deletes all items + their images
router.post("/:menuId/categories/:categoryId/subcategories", addSubCategory);
router.patch(
  "/:menuId/categories/:categoryId/subcategories/:subCategoryId",
  updateSubCategory,
);
router.delete(
  "/:menuId/categories/:categoryId/subcategories/:subCategoryId",
  deleteSubCategory,
);

// ── Item management ───────────────────────────────────────────────────────────
// POST   /menu/:menuId/categories/:categoryId/subcategories/:subCategoryId/items
//        multipart/form-data → itemData (JSON) + image (file, optional)
//        itemData: { name*, price*, description?, currency?, available?,
//                    spicyLevel?, dietaryInfo?, popular? }
//
// PATCH  /menu/:menuId/categories/:categoryId/subcategories/:subCategoryId/items/:itemId
//        multipart/form-data → itemData (JSON, partial) + image (optional)
//
// DELETE /menu/:menuId/categories/:categoryId/subcategories/:subCategoryId/items/:itemId
//
// PATCH  /menu/:menuId/categories/:categoryId/subcategories/:subCategoryId/items/:itemId/toggle
//        No body — flips available true ↔ false
router.post(
  "/:menuId/categories/:categoryId/subcategories/:subCategoryId/items",
  addMenuItem,
);
router.patch(
  "/:menuId/categories/:categoryId/subcategories/:subCategoryId/items/:itemId",
  updateMenuItem,
);
router.delete(
  "/:menuId/categories/:categoryId/subcategories/:subCategoryId/items/:itemId",
  deleteMenuItem,
);
router.patch(
  "/:menuId/categories/:categoryId/subcategories/:subCategoryId/items/:itemId/toggle",
  toggleItemAvailability,
);

export default router;
