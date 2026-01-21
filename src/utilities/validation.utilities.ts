import { NextFunction } from "express";
import { errorHandler } from "../middlewares/errorHandling.middleware"; // Adjust the import path as necessary

export const validateFormFields = (
  fields: { [key: string]: string },
  next: NextFunction
) => {
  for (const [key, value] of Object.entries(fields)) {
    if (!value || value === "") {
      return next(errorHandler(400, `${key.replace("_", " ")} is required`));
    }
  }
};
