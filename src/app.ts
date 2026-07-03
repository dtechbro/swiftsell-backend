/*
import express from "express";
import { protect } from "./middleware/auth.middleware";
import authRoutes from "./modules/auth/auth.routes";

const app = express();

app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/", (_, res) => {
  res.json({
    message: "API running",
  });
});

app.get("/protected", protect, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

export default app;
*/

