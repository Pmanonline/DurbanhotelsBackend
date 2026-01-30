import mongoose, { Document, Schema } from "mongoose";

export interface IMenuFeedback extends Document {
  menu_id: mongoose.Types.ObjectId;
  user_id?: mongoose.Types.ObjectId; // Optional for anonymous feedback
  user_ip?: string; // For rate limiting

  // Feedback details
  type: "review" | "report" | "suggestion" | "comment" | "rating";
  rating?: number; // 1-5 stars (only for review/rating type)
  title?: string;
  message: string;

  // Category tags (for filtering)
  category?:
    | "product_quality"
    | "service"
    | "pricing"
    | "hygiene"
    | "atmosphere"
    | "other";

  // Response from business owner
  response?: {
    message: string;
    responded_at: Date;
  };

  // Status
  status: "pending" | "read" | "archived" | "responded";
  is_public: boolean; // Whether to show on public menu page

  // Metadata
  created_at: Date;
  updated_at: Date;
}

const MenuFeedbackSchema = new Schema<IMenuFeedback>(
  {
    menu_id: {
      type: Schema.Types.ObjectId,
      ref: "MenuQR",
      required: true,
      index: true,
    },

    user_id: {
      type: Schema.Types.ObjectId,
      ref: "IndividualUser",
      sparse: true,
    },

    user_ip: {
      type: String,
      sparse: true,
    },

    type: {
      type: String,
      enum: ["review", "report", "suggestion", "comment", "rating"],
      required: true,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      validate: {
        validator: function (this: IMenuFeedback) {
          // Rating only required for review/rating types
          if (this.type === "review" || this.type === "rating") {
            return (
              this.rating !== undefined && this.rating >= 1 && this.rating <= 5
            );
          }
          return true;
        },
        message: "Rating is required for review/rating type (1-5 stars)",
      },
    },

    title: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      minlength: [5, "Message must be at least 5 characters"],
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },

    category: {
      type: String,
      enum: [
        "food_quality",
        "service",
        "pricing",
        "hygiene",
        "atmosphere",
        "other",
      ],
      default: "other",
    },

    response: {
      message: String,
      responded_at: Date,
    },

    status: {
      type: String,
      enum: ["pending", "read", "archived", "responded"],
      default: "pending",
      index: true,
    },

    is_public: {
      type: Boolean,
      default: function (this: IMenuFeedback) {
        // Reviews with ratings are public by default
        return this.type === "review" || this.type === "rating";
      },
    },

    created_at: {
      type: Date,
      default: Date.now,
    },

    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

// Indexes for performance
MenuFeedbackSchema.index({ menu_id: 1, status: 1 });
MenuFeedbackSchema.index({ menu_id: 1, type: 1 });
MenuFeedbackSchema.index({ menu_id: 1, created_at: -1 });
MenuFeedbackSchema.index({ user_ip: 1, created_at: 1 }); // For rate limiting

// Auto-update timestamps
MenuFeedbackSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

const MenuFeedback = mongoose.model<IMenuFeedback>(
  "MenuFeedback",
  MenuFeedbackSchema,
);

export default MenuFeedback;
