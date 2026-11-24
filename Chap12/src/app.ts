import "dotenv/config";
import express from "express";
import { prisma } from "./db.js";
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import postRouter from "./routes/postRoutes.js";
import transactionRouter from "./routes/transactionRoutes.js";
import {
    prismaErrorHandler,
    generalErrorHandler,
} from "./middleware/errorHandler.js";
import cookieParser from 'cookie-parser';
import helmet from "helmet";
import cors from 'cors';
import {
    generalLimiter,
    loginLimiter,
    registerLimiter,
    refreshLimiter,
} from "./middleware/rateLimiters.js";


export const app = express();
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
}));
app.use(cookieParser());
app.use('/api', generalLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/refresh', refreshLimiter);
app.use(express.json({ limit: '10kb' }));

app.use(authRouter);
app.use(userRouter);
app.use(postRouter);
app.use(transactionRouter);

app.use(prismaErrorHandler);
app.use(generalErrorHandler);

if (process.env.NODE_ENV !== "test") {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Express server running on port ${PORT}`);
    });
}
process.on("SIGINT", async () => {
    await prisma.$disconnect();
    process.exit(0);
});

export default app;
