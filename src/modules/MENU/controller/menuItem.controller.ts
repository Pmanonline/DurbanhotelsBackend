import { Request, Response, NextFunction } from "express";
import {
  Menu,
  IMenuCategory,
  IMenuSubCategory,
  IMenuItem,
} from "../models/MenuItem.model";
import { ErrorResponse } from "../../../utilities/errorHandler.util";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../../../utilities/cloudinary.util";
import "../../../modules/authentication/adminUserAuth/adminAuth.model";
import { ActivityLogger } from "../../Activitylog/Activitylogger.service";

// ── Parsers ───────────────────────────────────────────────────────────────────

function parse<T>(raw: string): Partial<T> | null {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return null;
  }
}

function validateItem(data: Partial<IMenuItem>): string | null {
  if (!data.name?.trim()) return "name is required in itemData";
  if (data.price === undefined || data.price === null)
    return "price is required in itemData";
  if (typeof data.price !== "number") return "price must be a number";
  if (data.price < 0) return "price cannot be negative";
  return null;
}

// ── Lookup helpers ────────────────────────────────────────────────────────────

function findCategory(menu: any, categoryId: string): IMenuCategory | null {
  return (
    menu.categories.find(
      (c: IMenuCategory) => c._id.toString() === categoryId,
    ) ?? null
  );
}

function findSubCategory(
  category: IMenuCategory,
  subCategoryId: string,
): IMenuSubCategory | null {
  return (
    category.subCategories.find((s) => s._id.toString() === subCategoryId) ??
    null
  );
}

function findItem(
  subCategory: IMenuSubCategory,
  itemId: string,
): IMenuItem | null {
  return subCategory.items.find((i) => i._id.toString() === itemId) ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MENU
// ═══════════════════════════════════════════════════════════════════════════════

export const createMenu = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id ?? req.user?.id;
    const {
      title,
      description,
      business_name,
      menu_type,
      styling,
      is_public,
      categories = [],
    } = req.body;

    if (!title?.trim() || !business_name?.trim())
      return next({
        statusCode: 400,
        status: "fail",
        message: "title and business_name are required",
      } as ErrorResponse);

    const existing = await Menu.findOne({ createdBy: userId });
    if (existing)
      return next({
        statusCode: 409,
        status: "fail",
        message: "You already have a menu. Update your existing menu instead.",
      } as ErrorResponse);

    const menu = await Menu.create({
      title: title.trim(),
      description,
      business_name: business_name.trim(),
      menu_type,
      styling,
      is_public,
      categories,
      createdBy: userId,
    });

    await ActivityLogger.menuCreated(req, menu._id.toString(), menu.title);

    res.status(201).json({
      status: "success",
      message: "Menu created successfully",
      data: { menu },
    });
  } catch (err) {
    console.error("createMenu:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error creating menu",
    } as ErrorResponse);
  }
};

export const getMyMenu = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id ?? req.user?.id;

    const menu = await Menu.findOne({ createdBy: userId });
    if (!menu)
      return next({
        statusCode: 404,
        status: "fail",
        message: "You have not created a menu yet",
      } as ErrorResponse);

    res.status(200).json({ status: "success", data: { menu } });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching menu",
    } as ErrorResponse);
  }
};

export const getAllMenus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      is_public,
      menu_type,
      page = "1",
      limit = "20",
    } = req.query as Record<string, string>;

    const query: Record<string, unknown> = {};
    if (is_public !== undefined) query.is_public = is_public === "true";
    if (menu_type) query.menu_type = menu_type;

    const limitNum = Math.min(Number(limit), 100);
    const skip = (Number(page) - 1) * limitNum;

    const [menus, total] = await Promise.all([
      Menu.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Menu.countDocuments(query),
    ]);

    const enriched = menus.map((menu) => {
      let totalItems = 0;
      let totalSubCategories = 0;
      const categoryCount = menu.categories.length;

      for (const cat of menu.categories) {
        totalSubCategories += cat.subCategories.length;
        for (const sub of cat.subCategories) {
          totalItems += sub.items.length;
        }
      }

      return {
        ...menu,
        _summary: { categoryCount, totalSubCategories, totalItems },
      };
    });

    res.status(200).json({
      status: "success",
      results: menus.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limitNum),
      data: { menus: enriched },
    });
  } catch (err) {
    console.error("getAllMenus:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching menus",
    } as ErrorResponse);
  }
};

export const getAllMenusAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      is_public,
      menu_type,
      page = "1",
      limit = "20",
    } = req.query as Record<string, string>;

    const query: Record<string, unknown> = {};
    if (is_public !== undefined) query.is_public = is_public === "true";
    if (menu_type) query.menu_type = menu_type;

    const limitNum = Math.min(Number(limit), 100);
    const skip = (Number(page) - 1) * limitNum;

    const [menus, total] = await Promise.all([
      Menu.find(query)
        .populate("createdBy", "name email phone role createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Menu.countDocuments(query),
    ]);

    const enriched = menus.map((menu) => {
      let totalItems = 0;
      let totalSubCategories = 0;
      const categoryCount = menu.categories.length;

      for (const cat of menu.categories) {
        totalSubCategories += cat.subCategories.length;
        for (const sub of cat.subCategories) {
          totalItems += sub.items.length;
        }
      }

      return {
        ...menu,
        _summary: { categoryCount, totalSubCategories, totalItems },
      };
    });

    res.status(200).json({
      status: "success",
      results: menus.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limitNum),
      data: { menus: enriched },
    });
  } catch (err) {
    console.error("getAllMenusAdmin:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching menus",
    } as ErrorResponse);
  }
};

export const getMenuById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const menu = await Menu.findById(req.params.menuId)
      .populate("createdBy", "name email phone role createdAt")
      .lean();

    if (!menu)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Menu not found",
      } as ErrorResponse);

    let totalItems = 0;
    let totalSubCategories = 0;
    const categoryCount = menu.categories.length;
    for (const cat of menu.categories) {
      totalSubCategories += cat.subCategories.length;
      for (const sub of cat.subCategories) {
        totalItems += sub.items.length;
      }
    }

    res.status(200).json({
      status: "success",
      data: {
        menu: {
          ...menu,
          _summary: { categoryCount, totalSubCategories, totalItems },
        },
      },
    });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching menu",
    } as ErrorResponse);
  }
};

export const updateMenu = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id ?? req.user?.id;

    const allowedFields = [
      "title",
      "description",
      "business_name",
      "menu_type",
      "styling",
      "is_public",
    ];

    const $set: Record<string, any> = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) $set[key] = req.body[key];
    }

    const $push: Record<string, any> = {};
    if (Array.isArray(req.body.categories) && req.body.categories.length > 0) {
      $push.categories = { $each: req.body.categories };
    }

    if (Object.keys($set).length === 0 && Object.keys($push).length === 0) {
      return next({
        statusCode: 400,
        status: "fail",
        message: "No valid fields provided for update",
      } as ErrorResponse);
    }

    const updateOp: Record<string, any> = {};
    if (Object.keys($set).length > 0) updateOp.$set = $set;
    if (Object.keys($push).length > 0) updateOp.$push = $push;

    const menu = await Menu.findOneAndUpdate(
      { _id: req.params.menuId, createdBy: userId },
      updateOp,
      { new: true, runValidators: true },
    );

    if (!menu)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Menu not found",
      } as ErrorResponse);

    await ActivityLogger.menuUpdated(req, menu._id.toString(), menu.title);

    // Log visibility change separately when is_public was part of the update
    if (req.body.is_public !== undefined) {
      await ActivityLogger.menuVisibilityChanged(
        req,
        menu._id.toString(),
        menu.title,
        menu.is_public,
      );
    }

    res.status(200).json({
      status: "success",
      message: "Menu updated successfully",
      data: { menu },
    });
  } catch (err) {
    console.error("updateMenu:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error updating menu",
    } as ErrorResponse);
  }
};

export const deleteMenu = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id ?? req.user?.id;
    const menu = await Menu.findOneAndDelete({
      _id: req.params.menuId,
      createdBy: userId,
    });

    if (!menu)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Menu not found",
      } as ErrorResponse);

    await ActivityLogger.menuDeleted(req, menu._id.toString(), menu.title);

    res.status(200).json({ status: "success", message: "Menu deleted" });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error deleting menu",
    } as ErrorResponse);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY
// ═══════════════════════════════════════════════════════════════════════════════

export const addCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { menuId } = req.params;
    const userId = req.user?._id ?? req.user?.id;

    const data = parse<IMenuCategory>(req.body.categoryData);
    if (!data)
      return next({
        statusCode: 400,
        status: "fail",
        message: "categoryData must be a valid JSON string",
      } as ErrorResponse);
    if (!data.name?.trim())
      return next({
        statusCode: 400,
        status: "fail",
        message: "name is required in categoryData",
      } as ErrorResponse);

    const menu = await Menu.findOne({ _id: menuId, createdBy: userId });
    if (!menu)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Menu not found",
      } as ErrorResponse);

    if (
      menu.categories.find(
        (c) => c.name.toLowerCase() === data.name!.toLowerCase(),
      )
    )
      return next({
        statusCode: 400,
        status: "fail",
        message: `Category "${data.name}" already exists`,
      } as ErrorResponse);

    const file = req.files?.image;
    if (file) {
      const imageFile = Array.isArray(file) ? file[0] : file;
      data.image = await uploadToCloudinary(imageFile, "menu/categories");
    }

    menu.categories.push(data as IMenuCategory);
    await menu.save();

    await ActivityLogger.categoryAdded(req, menuId, data.name!);

    res.status(201).json({
      status: "success",
      message: "Category added successfully",
      data: { category: menu.categories[menu.categories.length - 1] },
    });
  } catch (err) {
    console.error("addCategory:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error adding category",
    } as ErrorResponse);
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { menuId, categoryId } = req.params;
    const userId = req.user?._id ?? req.user?.id;

    const updates = parse<IMenuCategory>(req.body.categoryData);
    if (!updates)
      return next({
        statusCode: 400,
        status: "fail",
        message: "categoryData must be a valid JSON string",
      } as ErrorResponse);

    const menu = await Menu.findOne({ _id: menuId, createdBy: userId });
    if (!menu)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Menu not found",
      } as ErrorResponse);

    const category = findCategory(menu, categoryId);
    if (!category)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Category not found",
      } as ErrorResponse);

    const file = req.files?.image;
    if (file) {
      if (category.image) await deleteFromCloudinary(category.image);
      const imageFile = Array.isArray(file) ? file[0] : file;
      updates.image = await uploadToCloudinary(imageFile, "menu/categories");
    }

    (Object.keys(updates) as Array<keyof IMenuCategory>).forEach((key) => {
      if (key !== "_id" && key !== "subCategories")
        (category as any)[key] = updates[key];
    });

    menu.markModified("categories");
    await menu.save();

    await ActivityLogger.categoryUpdated(req, menuId, category.name);

    res.status(200).json({
      status: "success",
      message: "Category updated successfully",
      data: { category },
    });
  } catch (err) {
    console.error("updateCategory:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error updating category",
    } as ErrorResponse);
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { menuId, categoryId } = req.params;
    const userId = req.user?._id ?? req.user?.id;

    const menu = await Menu.findOne({ _id: menuId, createdBy: userId });
    if (!menu)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Menu not found",
      } as ErrorResponse);

    const idx = menu.categories.findIndex(
      (c) => c._id.toString() === categoryId,
    );
    if (idx === -1)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Category not found",
      } as ErrorResponse);

    const category = menu.categories[idx];

    // Snapshot name before deletion
    const categoryName = category.name;

    if (category.image) await deleteFromCloudinary(category.image);
    for (const sub of category.subCategories) {
      if (sub.image) await deleteFromCloudinary(sub.image);
      for (const item of sub.items) {
        if (item.image) await deleteFromCloudinary(item.image);
      }
    }

    menu.categories.splice(idx, 1);
    await menu.save();

    await ActivityLogger.categoryDeleted(req, menuId, categoryName);

    res.status(200).json({
      status: "success",
      message: "Category and all its subcategories/items deleted",
    });
  } catch (err) {
    console.error("deleteCategory:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error deleting category",
    } as ErrorResponse);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUBCATEGORY
// ═══════════════════════════════════════════════════════════════════════════════

export const addSubCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { menuId, categoryId } = req.params;
    const userId = req.user?._id ?? req.user?.id;

    const data = parse<IMenuSubCategory>(req.body.subCategoryData);
    if (!data)
      return next({
        statusCode: 400,
        status: "fail",
        message: "subCategoryData must be a valid JSON string",
      } as ErrorResponse);
    if (!data.name?.trim())
      return next({
        statusCode: 400,
        status: "fail",
        message: "name is required in subCategoryData",
      } as ErrorResponse);

    const menu = await Menu.findOne({ _id: menuId, createdBy: userId });
    if (!menu)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Menu not found",
      } as ErrorResponse);

    const category = findCategory(menu, categoryId);
    if (!category)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Category not found",
      } as ErrorResponse);

    if (
      category.subCategories.find(
        (s) => s.name.toLowerCase() === data.name!.toLowerCase(),
      )
    )
      return next({
        statusCode: 400,
        status: "fail",
        message: `SubCategory "${data.name}" already exists`,
      } as ErrorResponse);

    const file = req.files?.image;
    if (file) {
      const imageFile = Array.isArray(file) ? file[0] : file;
      data.image = await uploadToCloudinary(imageFile, "menu/subcategories");
    }

    category.subCategories.push(data as IMenuSubCategory);
    menu.markModified("categories");
    await menu.save();

    await ActivityLogger.subCategoryAdded(req, menuId, data.name!);

    res.status(201).json({
      status: "success",
      message: "SubCategory added successfully",
      data: {
        subCategory: category.subCategories[category.subCategories.length - 1],
      },
    });
  } catch (err) {
    console.error("addSubCategory:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error adding subcategory",
    } as ErrorResponse);
  }
};

export const updateSubCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { menuId, categoryId, subCategoryId } = req.params;
    const userId = req.user?._id ?? req.user?.id;

    const updates = parse<IMenuSubCategory>(req.body.subCategoryData);
    if (!updates)
      return next({
        statusCode: 400,
        status: "fail",
        message: "subCategoryData must be a valid JSON string",
      } as ErrorResponse);

    const menu = await Menu.findOne({ _id: menuId, createdBy: userId });
    if (!menu)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Menu not found",
      } as ErrorResponse);

    const category = findCategory(menu, categoryId);
    if (!category)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Category not found",
      } as ErrorResponse);

    const subCategory = findSubCategory(category, subCategoryId);
    if (!subCategory)
      return next({
        statusCode: 404,
        status: "fail",
        message: "SubCategory not found",
      } as ErrorResponse);

    const file = req.files?.image;
    if (file) {
      if (subCategory.image) await deleteFromCloudinary(subCategory.image);
      const imageFile = Array.isArray(file) ? file[0] : file;
      updates.image = await uploadToCloudinary(imageFile, "menu/subcategories");
    }

    (Object.keys(updates) as Array<keyof IMenuSubCategory>).forEach((key) => {
      if (key !== "_id" && key !== "items")
        (subCategory as any)[key] = updates[key];
    });

    menu.markModified("categories");
    await menu.save();

    await ActivityLogger.subCategoryUpdated(req, menuId, subCategory.name);

    res.status(200).json({
      status: "success",
      message: "SubCategory updated successfully",
      data: { subCategory },
    });
  } catch (err) {
    console.error("updateSubCategory:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error updating subcategory",
    } as ErrorResponse);
  }
};

export const deleteSubCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { menuId, categoryId, subCategoryId } = req.params;
    const userId = req.user?._id ?? req.user?.id;

    const menu = await Menu.findOne({ _id: menuId, createdBy: userId });
    if (!menu)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Menu not found",
      } as ErrorResponse);

    const category = findCategory(menu, categoryId);
    if (!category)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Category not found",
      } as ErrorResponse);

    const idx = category.subCategories.findIndex(
      (s) => s._id.toString() === subCategoryId,
    );
    if (idx === -1)
      return next({
        statusCode: 404,
        status: "fail",
        message: "SubCategory not found",
      } as ErrorResponse);

    const subCategory = category.subCategories[idx];

    // Snapshot name before deletion
    const subCategoryName = subCategory.name;

    if (subCategory.image) await deleteFromCloudinary(subCategory.image);
    for (const item of subCategory.items) {
      if (item.image) await deleteFromCloudinary(item.image);
    }

    category.subCategories.splice(idx, 1);
    menu.markModified("categories");
    await menu.save();

    await ActivityLogger.subCategoryDeleted(req, menuId, subCategoryName);

    res.status(200).json({
      status: "success",
      message: "SubCategory and all its items deleted",
    });
  } catch (err) {
    console.error("deleteSubCategory:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error deleting subcategory",
    } as ErrorResponse);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MENU ITEM
// ═══════════════════════════════════════════════════════════════════════════════

export const addMenuItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { menuId, categoryId, subCategoryId } = req.params;
    const userId = req.user?._id ?? req.user?.id;

    const itemData = parse<IMenuItem>(req.body.itemData);
    if (!itemData)
      return next({
        statusCode: 400,
        status: "fail",
        message: "itemData must be a valid JSON string",
      } as ErrorResponse);
    const validErr = validateItem(itemData);
    if (validErr)
      return next({
        statusCode: 400,
        status: "fail",
        message: validErr,
      } as ErrorResponse);

    const menu = await Menu.findOne({ _id: menuId, createdBy: userId });
    if (!menu)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Menu not found",
      } as ErrorResponse);

    const category = findCategory(menu, categoryId);
    if (!category)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Category not found",
      } as ErrorResponse);

    const subCategory = findSubCategory(category, subCategoryId);
    if (!subCategory)
      return next({
        statusCode: 404,
        status: "fail",
        message: "SubCategory not found",
      } as ErrorResponse);

    const file = req.files?.image;
    if (file) {
      const imageFile = Array.isArray(file) ? file[0] : file;
      itemData.image = await uploadToCloudinary(imageFile, "menu/items");
    }

    subCategory.items.push(itemData as IMenuItem);
    menu.markModified("categories");
    await menu.save();

    await ActivityLogger.itemAdded(req, menuId, itemData.name!);

    res.status(201).json({
      status: "success",
      message: "Item added successfully",
      data: { item: subCategory.items[subCategory.items.length - 1] },
    });
  } catch (err) {
    console.error("addMenuItem:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error adding menu item",
    } as ErrorResponse);
  }
};

export const updateMenuItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { menuId, categoryId, subCategoryId, itemId } = req.params;
    const userId = req.user?._id ?? req.user?.id;

    const updates = parse<IMenuItem>(req.body.itemData);
    if (!updates)
      return next({
        statusCode: 400,
        status: "fail",
        message: "itemData must be a valid JSON string",
      } as ErrorResponse);
    if (updates.price !== undefined && updates.price < 0)
      return next({
        statusCode: 400,
        status: "fail",
        message: "price cannot be negative",
      } as ErrorResponse);

    const menu = await Menu.findOne({ _id: menuId, createdBy: userId });
    if (!menu)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Menu not found",
      } as ErrorResponse);

    const category = findCategory(menu, categoryId);
    if (!category)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Category not found",
      } as ErrorResponse);

    const subCategory = findSubCategory(category, subCategoryId);
    if (!subCategory)
      return next({
        statusCode: 404,
        status: "fail",
        message: "SubCategory not found",
      } as ErrorResponse);

    const item = findItem(subCategory, itemId);
    if (!item)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Menu item not found",
      } as ErrorResponse);

    const file = req.files?.image;
    if (file) {
      if (item.image) await deleteFromCloudinary(item.image);
      const imageFile = Array.isArray(file) ? file[0] : file;
      updates.image = await uploadToCloudinary(imageFile, "menu/items");
    }

    (Object.keys(updates) as Array<keyof IMenuItem>).forEach((key) => {
      if (key !== "_id") (item as any)[key] = updates[key];
    });

    menu.markModified("categories");
    await menu.save();

    await ActivityLogger.itemUpdated(req, menuId, item.name);

    res.status(200).json({
      status: "success",
      message: "Menu item updated successfully",
      data: { item },
    });
  } catch (err) {
    console.error("updateMenuItem:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error updating menu item",
    } as ErrorResponse);
  }
};

export const deleteMenuItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { menuId, categoryId, subCategoryId, itemId } = req.params;
    const userId = req.user?._id ?? req.user?.id;

    const menu = await Menu.findOne({ _id: menuId, createdBy: userId });
    if (!menu)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Menu not found",
      } as ErrorResponse);

    const category = findCategory(menu, categoryId);
    if (!category)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Category not found",
      } as ErrorResponse);

    const subCategory = findSubCategory(category, subCategoryId);
    if (!subCategory)
      return next({
        statusCode: 404,
        status: "fail",
        message: "SubCategory not found",
      } as ErrorResponse);

    const idx = subCategory.items.findIndex((i) => i._id.toString() === itemId);
    if (idx === -1)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Menu item not found",
      } as ErrorResponse);

    const item = subCategory.items[idx];

    // Snapshot name before deletion
    const itemName = item.name;

    if (item.image) await deleteFromCloudinary(item.image);

    subCategory.items.splice(idx, 1);
    menu.markModified("categories");
    await menu.save();

    await ActivityLogger.itemDeleted(req, menuId, itemName);

    res
      .status(200)
      .json({ status: "success", message: "Menu item deleted successfully" });
  } catch (err) {
    console.error("deleteMenuItem:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error deleting menu item",
    } as ErrorResponse);
  }
};

export const toggleItemAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { menuId, categoryId, subCategoryId, itemId } = req.params;
    const userId = req.user?._id ?? req.user?.id;

    const menu = await Menu.findOne({ _id: menuId, createdBy: userId });
    if (!menu)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Menu not found",
      } as ErrorResponse);

    const category = findCategory(menu, categoryId);
    if (!category)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Category not found",
      } as ErrorResponse);

    const subCategory = findSubCategory(category, subCategoryId);
    if (!subCategory)
      return next({
        statusCode: 404,
        status: "fail",
        message: "SubCategory not found",
      } as ErrorResponse);

    const item = findItem(subCategory, itemId);
    if (!item)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Menu item not found",
      } as ErrorResponse);

    item.available = !item.available;
    menu.markModified("categories");
    await menu.save();

    await ActivityLogger.itemToggled(req, menuId, item.name, item.available);

    res.status(200).json({
      status: "success",
      message: `Item is now ${item.available ? "available" : "unavailable"}`,
      data: { available: item.available },
    });
  } catch (err) {
    console.error("toggleItemAvailability:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error toggling availability",
    } as ErrorResponse);
  }
};

export const getAllMenuItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { categoryId, subCategoryId, available } = req.query;

    const menu = await Menu.findOne({ is_public: true });
    if (!menu)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Menu not found",
      } as ErrorResponse);

    const items: object[] = [];

    for (const cat of menu.categories) {
      if (categoryId && cat._id.toString() !== categoryId) continue;

      for (const sub of cat.subCategories) {
        if (subCategoryId && sub._id.toString() !== subCategoryId) continue;

        for (const item of sub.items) {
          if (available === "true" && !item.available) continue;
          if (available === "false" && item.available) continue;

          items.push({
            _id: item._id.toString(),
            name: item.name,
            description: item.description,
            price: item.price,
            currency: item.currency,
            image: item.image,
            available: item.available,
            spicyLevel: item.spicyLevel,
            dietaryInfo: item.dietaryInfo,
            popular: item.popular,
            categoryId: cat._id.toString(),
            categoryName: cat.name,
            subCategoryId: sub._id.toString(),
            subCategoryName: sub.name,
          });
        }
      }
    }

    res
      .status(200)
      .json({ status: "success", results: items.length, data: { items } });
  } catch (err) {
    console.error("getAllMenuItems:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching menu items",
    } as ErrorResponse);
  }
};
