

import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: {
        author: true,
        categories: true,
      },
    });

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid post ID" });
      return;
    }

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: true,
        categories: true,
      },
    });

    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      title,
      content,
      published,
      authorId,
      categoryIds,
    } = req.body;

    if (!title || !authorId) {
      res.status(400).json({
        error: "Title and authorId are required",
      });
      return;
    }

    const post = await prisma.post.create({
      data: {
        title,
        content: content || null,
        published: published ?? false,
        author: {
          connect: {
            id: Number(authorId),
          },
        },
        categories: categoryIds
          ? {
              connect: categoryIds.map((id: number) => ({ id })),
            }
          : undefined,
      },
      include: {
        author: true,
        categories: true,
      },
    });

    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, content, published, views } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid post ID" });
      return;
    }

    const post = await prisma.post.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(published !== undefined ? { published } : {}),
        ...(views !== undefined ? { views } : {}),
      },
      include: {
        author: true,
        categories: true,
      },
    });

    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update post" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid post ID" });
      return;
    }

    await prisma.post.delete({
      where: { id },
    });

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

export default router;
