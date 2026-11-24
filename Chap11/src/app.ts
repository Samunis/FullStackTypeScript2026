import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import { apiLimiter, authLimiter } from './middleware/rateLimiters.js';
import { prismaErrorHandler, generalErrorHandler } from './middleware/errorHandlers.js';

const app = express();


if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY));
}


app.use(helmet());


app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/refresh', authLimiter);


app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());


app.use(authRoutes);
app.use(userRoutes);
app.use(postRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND' });
});


app.use(prismaErrorHandler);
app.use(generalErrorHandler);

export default app;
