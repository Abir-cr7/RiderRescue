import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler } from './utils/http.js';
import { ensureDbReady } from './db.js';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '50kb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', routes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));
app.use(errorHandler);

await ensureDbReady();

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`RiderRescue API on :${port}`));
