export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/your_database",
  jwtSecret: process.env.JWT_SECRET || "your-secret-key",
};
