  // config/allowedOrigins.config.js

const allowedOrigins = [
  // Production
  process.env.FRONTEND_URL,
  "https://Dubanhotels.vercel.app",
  "https://dubanhotelsbackend.vercel.app",
  "https://durbanhotels.vercel.app/",
  
  // Local development
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:8081",
  
  // Network IPs
  "http://10.89.203.99:5173",
  "http://10.89.203.99:8081",
  "http://10.124.193.99:8081",  // Your Expo IP from the logs!
  "http://192.168.1.100:8081",
  
  // Expo development URLs (IMPORTANT!)
  "exp://10.124.193.99:8081",   // Your current Expo URL
  "exp://10.89.203.99:8081",    // Your other network IP
  "exp://192.168.1.100:8081",   // Common local IP
  "exp://127.0.0.1:8081",       // Localhost
  "exp://localhost:8081",       // Localhost alias
  
  // For mobile apps that don't send origin header
  null,
  undefined,
].filter(Boolean);

export default allowedOrigins;