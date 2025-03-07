import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import protectedRoutes from "./routes/protected.routes";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Welcome to the server!" });
});

// Protected routes
app.use("/api", protectedRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
