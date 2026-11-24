import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../db.js";
const router = Router();

router.post(
    "/api/v1/authors/:id/publish-all",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
        const authorId = Number(req.params.id);
        const [user, updateResult] = await prisma.$transaction([
        prisma.user.findUniqueOrThrow({
        where: { id: authorId },
        }),
        prisma.post.updateMany({
        where: { authorId, published: false },
        data: { published: true },
        }),
        ]);
        res.status(200).json({
        message: `Published ${updateResult.count} posts`
        + ` for ${user.username}`,
        });
        } catch (err) {
        next(err);
        }
    }
);

router.post(
    "/api/v1/posts/transfer",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { fromAuthorId, toAuthorId } = req.body;
            
            const result = await prisma.$transaction(async (tx) => {
                const fromUser = await tx.user.findUniqueOrThrow({
                    where: { id: fromAuthorId },
                });
                const toUser = await tx.user.findUniqueOrThrow({
                    where: { id: toAuthorId },
                });

                const postCount = await tx.post.count({
                    where: { authorId: fromAuthorId },
                });

                if (postCount === 0) {
                    throw new Error(
                        `${fromUser.username} has no posts to transfer`
                    );
                }

                await tx.post.updateMany({
                    where: { authorId: fromAuthorId },
                    data: { authorId: toAuthorId },
                });

                return {
                    transferred: postCount,
                    from: fromUser.username,
                    to: toUser.username,
                };
            });

            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }
);

export default router;