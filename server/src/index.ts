import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.routes.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
