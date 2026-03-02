import { Types } from "mongoose";

/**
 * Safely converts a Mongoose subdocument _id (typed as unknown on Document
 * base) to a string. Use this everywhere you need `doc._id.toString()`.
 *
 * @example
 *   menu.categories.find((c) => idStr(c) === categoryId)
 */
export function idStr(doc: { _id: unknown }): string {
  return (doc._id as Types.ObjectId).toString();
}

/**
 * Plain-object shape returned in API responses for a menu item.
 * Avoids the `IMenuItem & { ... }` spread incompatibility with toObject().
 */
export interface MenuItemDTO {
  _id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  image?: string;
  available: boolean;
  spicyLevel?: "mild" | "medium" | "hot" | "extra-hot";
  dietaryInfo?: string[];
  popular?: boolean;
  categoryName: string;
  categoryId: string;
}

/**
 * Plain-object shape for a category in list responses.
 */
export interface CategoryDTO {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  displayOrder: number;
  itemCount: number;
}
