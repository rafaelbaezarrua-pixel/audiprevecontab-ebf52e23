/**
 * Wrapper para Lacuna Web PKI
 * Fornece interface para listar certificados e assinar documentos.
 */

// Declaração do global do Lacuna (carregado via script tag)
declare let LacunaWebPKI: any;

export interface Certificate {
  id: string;
  name: string;
  subjectName: string;
  issuerName: string;
  expirationDate: string;
}

class LacunaWebPkiClient {
  private pki: any;
  private isInitialized: boolean = false;
  
  /* 
   * CONFIGURAÇÃO DE LICENÇA LACUNA WEB PKI
   * -------------------------------------
   * Para uso em rede local (IP 192.168.*), a string abaixo é uma chave de teste.
   * Se for usar em um domínio de produção (audipreve.com.br), substitua pela sua chave REAL.
   */
  private readonly devLicense: string = 'ASYAanNmaWxlczEubGFjdW5hc29mdHdhcmUuY29tAAH//wAAAAEQV2ViUEtJMikAAAKAAADXzE4T7XoD4uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2uO2ub6v8A9E66hF0+V1U==';

  constructor() {
    // A inicialização real ocorre no connect()
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("O Assinador Lacuna demorou muito para responder. Verifique sua conexão."));
      }, 10000);

      const onReady = () => {
        try {
          // Se for localhost, NÃO passamos licença (ela é desnecessária e trava se for inválida)
          const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const licenseToUse = isLocal ? null : this.devLicense;
          
          console.log(`[Lacuna] Inicializando para ${window.location.hostname} (Licença: ${isLocal ? 'Livre/Localhost' : 'Dev-Key'})`);
          
          // @ts-expect-error - window.LacunaWebPKI comes from external script
          this.pki = new window.LacunaWebPKI(licenseToUse);
          this.pki.init({
            ready: () => {
              clearTimeout(timeout);
              this.isInitialized = true;
              console.log('[Lacuna] Inicializado com sucesso.');
              resolve();
            },
            defaultError: (message: string) => {
              clearTimeout(timeout);
              console.error('[Lacuna] Erro de Licença/Inicialização:', message);
              reject(new Error(message));
            }
          });
        } catch (e: any) {
          clearTimeout(timeout);
          console.error('[Lacuna] Falha crítica no construtor:', e);
          reject(new Error(`Erro ao inicializar componente Lacuna: ${e.message || e}`));
        }
      };

      // @ts-expect-error - window.LacunaWebPKI comes from external script
      if (typeof window.LacunaWebPKI !== 'undefined') {
        onReady();
      } else {
        const script = document.createElement('script');
        script.src = "/lacuna-web-pki.js";
        script.onload = () => {
          console.log('[Lacuna] Script carregado localmente.');
          onReady();
        };
        script.onerror = () => {
          clearTimeout(timeout);
          reject(new Error("Falha ao carregar arquivo local /lacuna-web-pki.js"));
        };
        document.head.appendChild(script);
      }
    });
  }

  async listCertificates(): Promise<Certificate[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      this.pki.listCertificates({
        success: (certs: any[]) => {
          const mapped = certs.map(c => ({
            id: c.thumbprint,
            name: c.subjectName,
            subjectName: c.subjectName,
            issuerName: c.issuerName,
            expirationDate: c.validityEnd
          }));
          resolve(mapped);
        },
        error: (err: string) => reject(new Error(err))
      });
    });
  }

  async signPdf(certificateId: string, pdfBase64: string, options: { visual?: boolean, text?: string } = {}): Promise<string> {
    await this.init();
    return new Promise((resolve, reject) => {
      // 1. Logs de diagnóstico para garantir que o Base64 é válido
      const base64Prefix = pdfBase64?.substring(0, 50);
      const outputMode = this.pki.outputModes?.returnContent || 'returnContent';
      
      console.log('[Lacuna] Diagnóstico Assinatura:', { 
        length: pdfBase64?.length,
        versionJS: this.pki.version,
        prefix: base64Prefix,
        outputMode
      });

      if (!pdfBase64 || pdfBase64.length < 50) {
        return reject(new Error("Erro: O PDF está vazio ou corrompido antes de enviar para a Lacuna."));
      }

      // 2. Parâmetros em formato simplificado (SHOTGUN APPROACH)
      // Tentamos enviar de várias formas para cobrir diferentes versões do componente local
      const padesParams: any = {
        certificateThumbprint: certificateId,
        content: pdfBase64,
        pdf: pdfBase64,      // Redundância para versões antigas
        policy: this.pki.padesPolicies?.basic || 'basic', // Forçar política básica para evitar "policy 0"
        output: {
          mode: outputMode
        }
      };

      // Se options.visual for explicitamente falso ou não estiver presente, 
      // NÃO enviamos para evitar o erro de "source null" no componente local
      if (options.visual) {
        padesParams.visualRepresentation = {
          text: {
            text: options.text || 'Assinado digitalmente',
            includeSigningTime: true
          },
          position: {
            pageNumber: -1,
            manual: {
              left: 1.5,
              bottom: 1.5,
              width: 7,
              height: 3
            },
            measurementUnits: 'centimeters'
          }
        };
      }

      this.pki.signPdf({
        ...padesParams,
        success: (signedPdf: string) => {
          console.log('[Lacuna] Sucesso!');
          resolve(signedPdf);
        },
        error: (err: any) => {
          console.error('[Lacuna] Erro detalhado:', err);
          // Tentar extrair mensagem se for objeto
          const msg = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
          reject(new Error(msg));
        }
      });
    });
  }

  async signData(certificateId: string, dataBase64: string): Promise<string> {
    await this.init();
    return new Promise((resolve, reject) => {
      this.pki.signData({
        certificateThumbprint: certificateId,
        data: dataBase64,
        digestAlgorithm: 'SHA256',
        output: {
          mode: this.pki.outputModes?.returnContent || 'returnContent'
        },
        success: (signature: string) => resolve(signature),
        error: (err: string) => reject(new Error(err))
      });
    });
  }
}

export const lacunaApi = new LacunaWebPkiClient();
