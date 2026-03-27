import handler from './api/consultar-guia-alvara';

const req: any = {
  method: 'POST',
  body: { cnpj: '47272234000151' }
};

const res: any = {
  status: (code: number) => ({
    json: (data: any) => console.log(`[RES ${code}]`, data)
  }),
  setHeader: (k: string, v: string) => console.log(`[HEADER] ${k}: ${v}`),
  end: (buffer: any) => {
    console.log(`[RES] PDF Finalizado com ${buffer?.length} bytes.`);
    process.exit(0);
  }
};

console.log('--- TESTANDO API ---');
handler(req as any, res as any).catch(console.error);
