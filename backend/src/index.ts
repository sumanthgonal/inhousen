import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './utils/config.js';
import { errorHandler } from './middleware/error.js';
import invoiceRoutes from './routes/invoice.routes.js';

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
});
app.use('/api', limiter);

app.use('/uploads', express.static(path.resolve(config.uploadDir)));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/invoices', invoiceRoutes);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Uploads directory: ${path.resolve(config.uploadDir)}`);
  console.log(`LLM Provider: ${config.llmProvider}`);
});

export default app;
