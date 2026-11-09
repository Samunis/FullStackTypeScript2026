
import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        posts: true,
      },
    });

    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid category ID" });
      return;
    }

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        posts: true,
      },
    });

    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch category" });
  }
});


router.post("/", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      res.status(400).json({
        error: "Category name is required",
      });
      return;
    }

    const category = await prisma.category.create({
      data: { name },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create category" });
  }
});


router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid category ID" });
      return;
    }

    if (!name) {
      res.status(400).json({
        error: "Category name is required",
      });
      return;
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name },
    });

    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update category" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid category ID" });
      return;
    }

    await prisma.category.delete({
      where: { id },
    });

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
