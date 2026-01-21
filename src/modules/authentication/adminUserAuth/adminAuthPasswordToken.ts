import { Model, ObjectId, Schema, model } from "mongoose";
import { hash, compare } from "bcrypt";

// Creating interface
interface PasswordTokenDocument {
  owner: ObjectId;
  token: string;
  createdAt: Date;
}

interface Methods {
  compareToken(token: string): Promise<boolean>;
}

// Expire token after 1 hour
const passwordTokenSchema = new Schema<PasswordTokenDocument, {}, Methods>({
  owner: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "IndividualUser",
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    expires: 3600,
    default: Date.now,
  },
});

passwordTokenSchema.pre("save", async function (next) {
  // Hash the token
  if (this.isModified("token")) {
    this.token = await hash(this.token, 10);
  }
  next();
});

passwordTokenSchema.methods.compareToken = async function (token) {
  const result = await compare(token, this.token);
  return result;
};

export default model("PasswordToken", passwordTokenSchema) as Model<
  PasswordTokenDocument,
  {},
  Methods
>;
