import mongoose, { Document, Schema, Types } from "mongoose";

export interface IMenuItem extends Document<Types.ObjectId> {
  name: string;
  description?: string;
  price: number;
  currency: string;
  image?: string;
  available: boolean;
  spicyLevel?: "mild" | "medium" | "hot" | "extra-hot";
  dietaryInfo?: string[];
  popular?: boolean;
}

export interface IMenuSubCategory extends Document<Types.ObjectId> {
  name: string;
  description?: string;
  image?: string;
  displayOrder: number;
  items: Types.DocumentArray<IMenuItem>;
}

export interface IMenuCategory extends Document<Types.ObjectId> {
  name: string;
  description?: string;
  image?: string;
  displayOrder: number;
  subCategories: Types.DocumentArray<IMenuSubCategory>;
}

export interface IMenu extends Document<Types.ObjectId> {
  title: string;
  description?: string;
  business_name: string;
  menu_type: "restaurant" | "bar" | "cafe" | "bakery";
  categories: Types.DocumentArray<IMenuCategory>;
  styling?: {
    primary_color: string;
    secondary_color?: string;
    theme: "light" | "dark";
  };
  is_public: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const MenuItemSchema = new Schema<IMenuItem>({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "NGN" },
  image: String,
  available: { type: Boolean, default: true },
  spicyLevel: { type: String, enum: ["mild", "medium", "hot", "extra-hot"] },
  dietaryInfo: [String],
  popular: { type: Boolean, default: false },
});

const MenuSubCategorySchema = new Schema<IMenuSubCategory>({
  name: { type: String, required: true },
  description: String,
  image: String,
  displayOrder: { type: Number, default: 0 },
  items: [MenuItemSchema],
});

const MenuCategorySchema = new Schema<IMenuCategory>({
  name: { type: String, required: true },
  description: String,
  image: String,
  displayOrder: { type: Number, default: 0 },
  subCategories: [MenuSubCategorySchema],
});

const MenuSchema = new Schema<IMenu>(
  {
    title: { type: String, required: true },
    description: String,
    business_name: { type: String, required: true },
    menu_type: {
      type: String,
      enum: ["restaurant", "bar", "cafe", "bakery"],
      default: "restaurant",
    },
    categories: [MenuCategorySchema],
    styling: {
      primary_color: { type: String, default: "#0F1D3A" },
      secondary_color: String,
      theme: { type: String, enum: ["light", "dark"], default: "dark" },
    },
    is_public: { type: Boolean, default: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
    },
  },
  { timestamps: true },
);

export const Menu = mongoose.model<IMenu>("Menu", MenuSchema);
