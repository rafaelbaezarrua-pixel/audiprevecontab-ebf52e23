import express, { Request, Response } from 'express';
import cors from 'cors';
import handler from './api/consultar-guia-alvara.ts';

const app = express();
app.use(cors());
app.use(express.json());

// Rota para a consulta de guias
app.post('/api/consultar-guia-alvara', async (req: Request, res: Response) => {
  try {
    console.log('Recebendo requisição para consulta de guia:', req.body);
    await handler(req as any, res as any);
  } catch (error) {
    console.error('Erro no dev-server:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API Local rodando em http://localhost:${PORT}`);
});
