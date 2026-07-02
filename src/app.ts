import express from "express";
import { authorizeRoles, protect } from "./middleware/auth.middleware";
import authRoutes from "./modules/auth/auth.routes";
import telegramRoutes from "./modules/telegram/telegram.routes";
import vendorRoutes from "./modules/vendors/vendor.routes";

const app = express();

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/telegram", telegramRoutes);
app.use("/api/vendors", vendorRoutes);

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

// Test
app.get("/admin-only", protect, authorizeRoles("ADMIN"), (req, res) => {
  res.json({
    success: true,
    message: "Admin route accessed successfully.",
    user: req.user,
  });
});

app.get("/vendor-only", protect, authorizeRoles("VENDOR"), (req, res) => {
  res.json({
    success: true,
    message: "Vendor route accessed successfully.",
    user: req.user,
  });
});

export default app;
