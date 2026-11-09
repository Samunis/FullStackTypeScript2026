
import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

// Hae kaikki profiilit
router.get("/", async (_req, res) => {
  try {
    const profiles = await prisma.profile.findMany({
      include: {
        user: true,
      },
    });

    res.json(profiles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
});

// Hae profiili ID:n perusteella
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid profile ID" });
      return;
    }

    const profile = await prisma.profile.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    res.json(profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Luo profiili käyttäjälle
router.post("/", async (req, res) => {
  try {
    const { bio, avatar, userId } = req.body;

    if (!bio || !userId) {
      res.status(400).json({
        error: "Bio and userId are required",
      });
      return;
    }

    const profile = await prisma.profile.create({
      data: {
        bio,
        avatar: avatar || null,
        user: {
          connect: {
            id: Number(userId),
          },
        },
      },
      include: {
        user: true,
      },
    });

    res.status(201).json(profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create profile" });
  }
});

// Päivitä profiili
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { bio, avatar } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid profile ID" });
      return;
    }

    const profile = await prisma.profile.update({
      where: { id },
      data: {
        ...(bio !== undefined ? { bio } : {}),
        ...(avatar !== undefined ? { avatar } : {}),
      },
      include: {
        user: true,
      },
    });

    res.json(profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Poista profiili
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid profile ID" });
      return;
    }

    await prisma.profile.delete({
      where: { id },
    });

    res.json({ message: "Profile deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete profile" });
  }
});

export default router;
