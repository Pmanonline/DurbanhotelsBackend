const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://qr-genius-frontend.vercel.app",
  "http://localhost:3000",
].filter(Boolean);

export default allowedOrigins;
