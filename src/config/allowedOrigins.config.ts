const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://qr-genius-frontend.vercel.app",
  "http://localhost:3000",
  "http://10.94.172.99:3000",
].filter(Boolean);

export default allowedOrigins;
