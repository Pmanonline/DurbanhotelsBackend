const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://10.89.203.99:5173",
  "https://durbanhotels.vercel.app",
].filter(Boolean);

export default allowedOrigins;
