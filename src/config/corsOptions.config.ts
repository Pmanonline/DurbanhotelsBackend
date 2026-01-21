import allowedOrigins from "./allowedOrigins.config";

const corsOptions = {
  origin: (
    origin: string,
    callback: (arg0: Error | null, arg1: boolean | undefined) => void
  ) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("not allowed CORS"), false);
    }
  },

  credentials: true,
  optionSuccessStatus: 200,
};

export default corsOptions;
