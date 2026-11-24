import { Request, Response, NextFunction } from "express";
import { Prisma } from "../generated/prisma/client.js";

export function prismaErrorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
        case "P2002": {
            res.status(409).json({
            error: `A record with that value already exists`,
            });
            return;
        }
        case "P2025": {
            res.status(404).json({
                error: "Record not found",
            });
            return;
        }
        case "P2003": {
            res.status(409).json({
            error: "Cannot complete operation due to a "
            + "related record constraint",
            });
            return;
        }
        default: {
            console.error(`Prisma error ${err.code}: ${err.message}`);
            res.status(500).json({ error: "Database error" });
            return;
        }
    }
    }

    if (err instanceof Prisma.PrismaClientValidationError) {
        res.status(400).json({
            error: "Invalid data provided",
        });
        return;
    }

    next(err);
}

export function generalErrorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error(err.message);
    res.status(500).json({ error: "Internal server error" });
}