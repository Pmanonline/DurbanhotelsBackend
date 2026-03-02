import { Request, Response, NextFunction } from "express";
import { Order, IOrderItem } from "../models/Order.model";
import { Menu } from "../models/MenuItem.model";
import { ErrorResponse } from "../../../utilities/errorHandler.util";
import { Types } from "mongoose";
import { ActivityLogger } from "../../Activitylog/Activitylogger.service";
import { notificationService } from "../../Notifications/notificationService";
// Top of file — add this import
import { WhatsAppService } from "../../Notifications/whatsapp.service";
//

// ── Enum constants ────────────────────────────────────────────────────────────
const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "served",
  "cancelled",
] as const;
const PAYMENT_STATUSES = ["unpaid", "paid", "partially-paid"] as const;
const PAYMENT_METHODS = [
  "cash",
  "card",
  "bank-transfer",
  "room-charge",
] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];
type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

interface RawOrderItem {
  menuItemId: string;
  quantity?: number;
  specialInstructions?: string;
}

// ── Create order ──────────────────────────────────────────────────────────────
export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      menuId,
      items,
      orderType,
      tableNumber,
      roomNumber,
      customerName,
      customerPhone,
      customerEmail,
      specialRequests,
      paymentMethod,
    }: {
      menuId: string;
      items: RawOrderItem[];
      orderType: "room-service" | "dine-in" | "takeaway" | "pool-side";
      tableNumber?: string;
      roomNumber?: string;
      customerName: string;
      customerPhone: string;
      customerEmail: string;
      specialRequests?: string;
      paymentMethod?: PaymentMethod;
    } = req.body;

    // ── Validation (unchanged) ────────────────────────────────────────────────
    if (!menuId)
      return next({
        statusCode: 400,
        status: "fail",
        message: "menuId is required",
      } as ErrorResponse);
    if (!customerName?.trim())
      return next({
        statusCode: 400,
        status: "fail",
        message: "Customer name is required",
      } as ErrorResponse);
    if (!customerPhone?.trim())
      return next({
        statusCode: 400,
        status: "fail",
        message: "Customer phone is required",
      } as ErrorResponse);
    if (!orderType)
      return next({
        statusCode: 400,
        status: "fail",
        message: "orderType is required",
      } as ErrorResponse);
    if (orderType === "room-service" && !roomNumber)
      return next({
        statusCode: 400,
        status: "fail",
        message: "roomNumber is required for room-service orders",
      } as ErrorResponse);
    if (orderType === "dine-in" && !tableNumber)
      return next({
        statusCode: 400,
        status: "fail",
        message: "tableNumber is required for dine-in orders",
      } as ErrorResponse);
    if (!Array.isArray(items) || items.length === 0)
      return next({
        statusCode: 400,
        status: "fail",
        message: "At least one item is required",
      } as ErrorResponse);

    const menu = await Menu.findOne({ _id: menuId, is_public: true });
    if (!menu)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Menu not found or not public",
      } as ErrorResponse);

    const itemMap = new Map<
      string,
      { name: string; price: number; available: boolean }
    >();
    for (const cat of menu.categories)
      for (const sub of cat.subCategories)
        for (const item of sub.items)
          itemMap.set(item._id.toString(), {
            name: item.name,
            price: item.price,
            available: item.available,
          });

    let subtotal = 0;
    const orderItems: IOrderItem[] = [];

    for (const raw of items) {
      if (!raw.menuItemId)
        return next({
          statusCode: 400,
          status: "fail",
          message: "menuItemId is required for each item",
        } as ErrorResponse);
      const found = itemMap.get(raw.menuItemId);
      if (!found)
        return next({
          statusCode: 404,
          status: "fail",
          message: `Menu item not found: ${raw.menuItemId}`,
        } as ErrorResponse);
      if (!found.available)
        return next({
          statusCode: 400,
          status: "fail",
          message: `"${found.name}" is currently unavailable`,
        } as ErrorResponse);

      const quantity = Math.max(1, raw.quantity ?? 1);
      subtotal += found.price * quantity;
      orderItems.push({
        menuItemId: new Types.ObjectId(raw.menuItemId),
        name: found.name,
        price: found.price,
        quantity,
        specialInstructions: raw.specialInstructions?.trim() ?? "",
      });
    }

    // const tax = parseFloat((subtotal * 0.075).toFixed(2));
    // const serviceCharge = parseFloat((subtotal * 0.05).toFixed(2));

    const tax = parseFloat((subtotal * 0.0).toFixed(2));
    const serviceCharge = parseFloat((subtotal * 0.0).toFixed(2));
    const total = parseFloat((subtotal + tax + serviceCharge).toFixed(2));
    const guestId = `GUEST-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const order = await Order.create({
      items: orderItems,
      subtotal,
      tax,
      serviceCharge,
      total,
      orderType,
      tableNumber,
      roomNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      specialRequests,
      paymentMethod,
      guestId,
      status: "pending",
      paymentStatus: "unpaid",
      ...(req.user?._id || req.user?.id
        ? { createdBy: req.user._id ?? req.user.id }
        : {}),
    });

    // ── LOG + NOTIFY ──────────────────────────────────────────────────────────
    await ActivityLogger.orderCreated(
      order.orderNumber,
      order._id.toString(),
      order.customerName,
    );
    await notificationService.newOrder(order);
    // ─────────────────────────────────────────────────────────────────────────
    await WhatsAppService.newOrder(order);
    res.status(201).json({
      status: "success",
      message: "Order placed successfully",
      data: { order, trackingId: guestId },
    });
  } catch (err) {
    console.error("createOrder error:", err);
    next({
      statusCode: 500,
      status: "error",
      message: err instanceof Error ? err.message : "Error creating order",
    } as ErrorResponse);
  }
};

// ── Update order status ───────────────────────────────────────────────────────
export const updateOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status }: { status: OrderStatus } = req.body;

    if (!ORDER_STATUSES.includes(status))
      return next({
        statusCode: 400,
        status: "fail",
        message: `Invalid status. Allowed: ${ORDER_STATUSES.join(", ")}`,
      } as ErrorResponse);

    const order = await Order.findById(req.params.id);
    if (!order)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Order not found",
      } as ErrorResponse);

    const previousStatus = order.status; // capture before mutation
    order.status = status;
    await order.save();

    // ── LOG + NOTIFY ──────────────────────────────────────────────────────────
    await ActivityLogger.orderStatusUpdated(
      req,
      order.orderNumber,
      order._id.toString(),
      status,
    );
    if (status === "cancelled") {
      await ActivityLogger.orderCancelled(
        req,
        order.orderNumber,
        order._id.toString(),
      );
    }
    await notificationService.orderStatusChanged(order, previousStatus);
    await WhatsAppService.orderStatusChanged(order, previousStatus);
    // ─────────────────────────────────────────────────────────────────────────

    res.status(200).json({
      status: "success",
      message: `Order status updated to "${status}"`,
      data: { order },
    });
  } catch (err) {
    console.error("updateOrderStatus error:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error updating order status",
    } as ErrorResponse);
  }
};

// ── Update payment status ─────────────────────────────────────────────────────
export const updatePaymentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      paymentStatus,
      paymentMethod,
    }: { paymentStatus: PaymentStatus; paymentMethod?: PaymentMethod } =
      req.body;

    if (!PAYMENT_STATUSES.includes(paymentStatus))
      return next({
        statusCode: 400,
        status: "fail",
        message: `Invalid payment status. Allowed: ${PAYMENT_STATUSES.join(", ")}`,
      } as ErrorResponse);
    if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod))
      return next({
        statusCode: 400,
        status: "fail",
        message: `Invalid payment method. Allowed: ${PAYMENT_METHODS.join(", ")}`,
      } as ErrorResponse);

    const order = await Order.findById(req.params.id);
    if (!order)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Order not found",
      } as ErrorResponse);

    const previousPaymentStatus = order.paymentStatus; // capture before mutation
    order.paymentStatus = paymentStatus;
    if (paymentMethod) order.paymentMethod = paymentMethod;
    await order.save();

    // ── LOG + NOTIFY ──────────────────────────────────────────────────────────
    await ActivityLogger.paymentStatusUpdated(
      req,
      order.orderNumber,
      order._id.toString(),
      paymentStatus,
      paymentMethod,
    );
    await notificationService.paymentStatusChanged(
      order,
      previousPaymentStatus,
    );
    // ─────────────────────────────────────────────────────────────────────────
    await WhatsAppService.paymentStatusChanged(order, previousPaymentStatus);
    res.status(200).json({
      status: "success",
      message: `Payment status updated to "${paymentStatus}"`,
      data: { order },
    });
  } catch (err) {
    console.error("updatePaymentStatus error:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error updating payment status",
    } as ErrorResponse);
  }
};

// ── Track order by guestId (public) ──────────────────────────────────────────
export const getOrderByTrackingId = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await Order.findOne({ guestId: req.params.trackingId });
    if (!order) {
      return next({
        statusCode: 404,
        status: "fail",
        message: "Order not found",
      } as ErrorResponse);
    }
    res.status(200).json({ status: "success", data: { order } });
  } catch (err) {
    console.error("getOrderByTrackingId error:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching order",
    } as ErrorResponse);
  }
};

// ── Get orders by phone (public) ──────────────────────────────────────────────
export const getOrdersByPhone = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { phone } = req.params;
    if (!phone) {
      return next({
        statusCode: 400,
        status: "fail",
        message: "Phone number is required",
      } as ErrorResponse);
    }

    const orders = await Order.find({ customerPhone: phone }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      status: "success",
      results: orders.length,
      data: { orders },
    });
  } catch (err) {
    console.error("getOrdersByPhone error:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching orders",
    } as ErrorResponse);
  }
};

// ── Get all orders (staff) ────────────────────────────────────────────────────
export const getOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      status,
      orderType,
      date,
      limit = "50",
      page = "1",
    } = req.query as Record<string, string>;

    const query: Record<string, unknown> = {};

    if (status) {
      query.status =
        status === "active"
          ? { $in: ["confirmed", "preparing"] as OrderStatus[] }
          : (status as OrderStatus);
    }
    if (orderType) query.orderType = orderType;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    const limitNum = Math.min(Number(limit), 100); // cap at 100
    const skip = (Number(page) - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("createdBy", "name username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      status: "success",
      results: orders.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limitNum),
      data: { orders },
    });
  } catch (err) {
    console.error("getOrders error:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching orders",
    } as ErrorResponse);
  }
};

// ── Get single order (staff) ──────────────────────────────────────────────────
export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "createdBy",
      "name username",
    );
    if (!order) {
      return next({
        statusCode: 404,
        status: "fail",
        message: "Order not found",
      } as ErrorResponse);
    }
    res.status(200).json({ status: "success", data: { order } });
  } catch (err) {
    console.error("getOrderById error:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching order",
    } as ErrorResponse);
  }
};
