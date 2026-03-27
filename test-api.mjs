import handler from './api/consultar-guia-alvara.ts';

const req = {
  method: 'POST',
  body: { cnpj: '47272234000151' }
};

const res = {
  status: (code) => ({
    json: (data) => console.log(`[RES ${code}]`, data)
  }),
  setHeader: (k, v) => console.log(`[HEADER] ${k}: ${v}`),
  end: (buffer) => {
    console.log(`[RES] PDF Finalizado com ${buffer.length} bytes.`);
    process.exit(0);
  }
};

console.log('--- TESTANDO API ---');
handler(req, res).catch(console.error);
