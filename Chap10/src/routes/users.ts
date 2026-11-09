
import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

// Hae kaikki käyttäjät
router.get("/", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        profile: true,
        posts: true,
      },
    });

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Hae yksi käyttäjä ID:n perusteella
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        posts: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Luo uusi käyttäjä
router.post("/", async (req, res) => {
  try {
    const { username, email, role } = req.body;

    if (!username || !email) {
      res.status(400).json({
        error: "Username and email are required",
      });
      return;
    }

    const user = await prisma.user.create({
      data: {
        username,
        email,
        ...(role ? { role } : {}),
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Päivitä käyttäjä
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { username, email, role } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(username !== undefined ? { username } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(role !== undefined ? { role } : {}),
      },
    });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Poista käyttäjä
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
