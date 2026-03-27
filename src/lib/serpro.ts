/**
 * Cliente nativo para o Assinador Serpro
 * Gerencia a conexão WebSocket local em portas padrão do integrador (65056).
 */

interface SerproResponse {
  action: string;
  error?: string;
  signature?: string;
  certificate?: string;
  certificates?: any[];
}

export class SerproClient {
  private ws: WebSocket | null = null;
  private readonly wsUrl = 'wss://127.0.0.1:65056';
  
  constructor() {}

  /**
   * Conecta ao assinador Serpro via WebSocket Local
   */
  async connect(): Promise<boolean> {
    const triggerApp = () => {
      console.log('[Serpro] Tentando abrir o Assinador via protocolo...');
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = 'serpro-assinador-crypto://';
      document.body.appendChild(iframe);
      setTimeout(() => document.body.removeChild(iframe), 1000);
    };

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);
        
        this.ws.onopen = () => {
          console.log('[Serpro] Conectado ao Assinador Serpro local.');
          resolve(true);
        };

        this.ws.onerror = (error) => {
          console.error('[Serpro] Erro na conexão. Tentando abrir o aplicativo...', error);
          triggerApp();
          this.ws = null;
          reject(new Error('Assinador Serpro não encontrado. O sistema tentou abrir o aplicativo automaticamente. Verifique se ele iniciou.'));
        };

        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            triggerApp();
            reject(new Error('Tempo esgotado. Verifique se o Assinador Serpro está aberto.'));
          }
        }, 3000);
      } catch (err) {
        triggerApp();
        reject(err);
      }
    });
  }

  /**
   * Assina um texto em Base64 utilizando o pacote PKCS#7 / CMS
   * O Assinador Serpro apresentará um prompt local para a senha do e-CNPJ/CPF.
   */
  async sign(base64Data: string, type: 'hash' | 'file' = 'file'): Promise<string> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      const connected = await this.connect();
      if (!connected) throw new Error("Falha de conexão com o Serpro.");
    }

    return new Promise((resolve, reject) => {
      if (!this.ws) return reject("WebSocket não inicializado");

      // Handler temporário de resposta
      const onMessage = (event: MessageEvent) => {
        try {
          const response: SerproResponse = JSON.parse(event.data);
          if (response.error) {
            this.ws?.removeEventListener('message', onMessage);
            return reject(new Error(response.error));
          }

          if (response.action === 'sign' && response.signature) {
            this.ws?.removeEventListener('message', onMessage);
            resolve(response.signature); // Retorna base64 do empacotamento p7s
          }
        } catch (err) {
          console.error('[Serpro] Falha parseando a resposta', err);
        }
      };

      this.ws.addEventListener('message', onMessage);

      // Enviando comando padrão da API do Assinador Serpro
      const command = {
        command: "sign",
        type: type,
        content: base64Data
      };

      this.ws.send(JSON.stringify(command));
    });
  }

  /**
   * Traz os certificados instalados na máquina do usuário (caso precise validar)
   */
  async listCertificates(): Promise<any[]> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }
    
    return new Promise((resolve, reject) => {
      const onMessage = (event: MessageEvent) => {
        const response: SerproResponse = JSON.parse(event.data);
        if (response.error) return reject(new Error(response.error));
        if (response.action === 'list' && response.certificates) {
          this.ws?.removeEventListener('message', onMessage);
          resolve(response.certificates);
        }
      };
      this.ws?.addEventListener('message', onMessage);
      this.ws?.send(JSON.stringify({ command: 'list' }));
    });
  }

  /**
   * Diagnostica a conexão HTTPS/WSS
   */
  async diagnostic(): Promise<{ status: 'ok' | 'error' | 'ssl_issue', message: string }> {
    try {
      // Try a simple fetch to see if the port is open and SSL is trusted
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      await fetch(this.wsUrl, { mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeoutId);
      
      return { status: 'ok', message: 'Conexão física estabelecida com o Assinador.' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { status: 'error', message: 'O Assinador Serpro não respondeu a tempo (Timeout).' };
      }
      
      // Fetch usually fails with TypeError if SSL is untrusted or port closed
      // We can't distinguish easily without a bridge, but we can suggest the SSL fix
      return { 
        status: 'ssl_issue', 
        message: 'Não foi possível conectar. Certifique-se que o Assinador está aberto. Se estiver, pode ser um problema de Certificado SSL Local.' 
      };
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Singleton global
export const serproApi = new SerproClient();
