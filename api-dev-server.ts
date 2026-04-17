import express, { Request, Response } from 'express';
import cors from 'cors';
import handlerAlvara from './api/consultar-guia-alvara.ts';
import handlerSign from './api/sign-pdf.ts';
import handlerFileBrowser from './api/filebrowser.ts';
import handlerFileBrowserDownload from './api/filebrowser-download.ts';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumentar limite para PDFs grandes

// Rota para a consulta de guias
app.post('/api/consultar-guia-alvara', async (req: Request, res: Response) => {
  try {
    console.log('Recebendo requisição para consulta de guia:', req.body);
    await handlerAlvara(req as any, res as any);
  } catch (error) {
    console.error('Erro no dev-server:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Rota para assinatura digital PFX
app.post('/api/sign-pdf', async (req: Request, res: Response) => {
  try {
    await handlerSign(req as any, res as any);
  } catch (error) {
    console.error('Erro no dev-server (sign-pdf):', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.all('/api/filebrowser', async (req: Request, res: Response) => {
  try {
    await handlerFileBrowser(req as any, res as any);
  } catch (error) {
    console.error('Erro no dev-server (filebrowser):', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.all('/api/filebrowser-download', async (req: Request, res: Response) => {
  try {
    await handlerFileBrowserDownload(req as any, res as any);
  } catch (error) {
    console.error('Erro no dev-server (filebrowser-download):', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API Local rodando em http://localhost:${PORT}`);
});
