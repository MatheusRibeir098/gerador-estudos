import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initDatabase } from './database';
import { setDb } from './db';
import subjectsRouter from './routes/subjects';
import contentRouter from './routes/content';
import examRouter from './routes/exam';
import playlistRouter from './routes/playlist';

setDb(initDatabase());

const app: ReturnType<typeof express> = express();

app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/subjects', subjectsRouter);
app.use('/api/subjects', examRouter);
app.use('/api', playlistRouter);
app.use('/api', contentRouter);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
};
app.use(errorHandler);

app.listen(3001, () => {
  console.log('StudyGen API rodando na porta 3001');
});

export { app };
