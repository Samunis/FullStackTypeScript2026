
import "dotenv/config";
import express from "express";
import { prisma } from "./db.js";
import userRoutes from "./routes/users.js";
import profileRoutes from "./routes/profiles.js";
import postRoutes from "./routes/posts.js";
import categoryRoutes from "./routes/categories.js";

const app = express();
const PORT = 3000;

app.use(express.json());


app.get("/", (_req, res) => {
  res.json({
    message: "Chapter 10 API is running!",
  });
});


app.get("/health", async (_req, res) => {
  try {
    await prisma.$connect();

    res.json({
      status: "OK",
      database: "Connected",
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      status: "ERROR",
      database: "Disconnected",
    });
  }
});

app.use("/api/users", userRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/categories", categoryRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});




