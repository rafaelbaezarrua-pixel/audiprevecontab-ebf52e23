// ─────────────────────────────────────────────────────────────────────────────
// src/lib/filebrowser.ts
// Camada de comunicação com o FileBrowser (servidor local)
// SEGURANÇA: Validação de path, proteção contra path traversal, rate limiting
// ─────────────────────────────────────────────────────────────────────────────

const FB_BASE_URL = import.meta.env.MODE === 'development'
  ? "/fb-api"
  : import.meta.env.VITE_FILEBROWSER_URL;
const FB_USER     = import.meta.env.VITE_FILEBROWSER_USER;
const FB_PASS     = import.meta.env.VITE_FILEBROWSER_PASS;

if (import.meta.env.MODE !== 'development' && (!FB_BASE_URL || !FB_USER || !FB_PASS)) {
  console.error("FileBrowser: VITE_FILEBROWSER_URL, VITE_FILEBROWSER_USER e VITE_FILEBROWSER_PASS são obrigatórios em produção.");
}

// Configurações de segurança
const SECURITY_CONFIG = {
  // Paths permitidos (base directories)
  ALLOWED_BASE_PATHS: ['/uploads', '/documentos', '/public'],
  // Máximo de itens por requisição
  MAX_ITEMS_PER_REQUEST: 100,
  // Rate limiting
  MIN_REQUEST_INTERVAL_MS: 500,
};

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface FBFile {
  name: string;
  path: string;
  size: number;
  extension: string;
  modified: string;
  mode: string;
  isDir: boolean;
  isSymlink: boolean;
  type: string;
}

export interface FBListing {
  path: string;
  name: string;
  size: number;
  extension: string;
  modified: string;
  isDir: boolean;
  items: FBFile[];
  numDirs: number;
  numFiles: number;
  sorting: { by: string; asc: boolean };
}

// ── Cache de token ────────────────────────────────────────────────────────────

let _token: string | null = null;
let _tokenExpiry = 0;
let _lastRequestTime = 0;

// Rate limiting para requisições ao FileBrowser
const enforceRateLimit = async (): Promise<void> => {
  const now = Date.now();
  const elapsed = now - _lastRequestTime;
  if (elapsed < SECURITY_CONFIG.MIN_REQUEST_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, SECURITY_CONFIG.MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  _lastRequestTime = Date.now();
};

async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token;

  await enforceRateLimit();
  const res = await fetch(`${FB_BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: FB_USER, password: FB_PASS }),
  });

  if (!res.ok) throw new Error("Falha na autenticação com o servidor de arquivos");

  _token = await res.text();
  _tokenExpiry = Date.now() + 90 * 60 * 1000; // 90 minutos
  return _token;
}

function authHeader(token: string): HeadersInit {
  return { "X-Auth": token, "Content-Type": "application/json" };
}

// Validação de path - previne path traversal e acessos não autorizados
const validatePath = (path: string): { valid: boolean; sanitized: string; error?: string } => {
  if (!path || typeof path !== 'string') {
    return { valid: false, sanitized: '/', error: 'Path inválido' };
  }

  // Normaliza o path
  let sanitized = path.trim();

  // Remove caracteres perigosos e sequências de path traversal
  if (sanitized.includes('..') || sanitized.includes('\\')) {
    return { valid: false, sanitized: '/', error: 'Path contém caracteres inválidos' };
  }

  // Remove null bytes (prevenção de poison null byte)
  if (sanitized.includes('\0')) {
    return { valid: false, sanitized: '/', error: 'Path contém caracteres nulos' };
  }

  // Garante que começa com /
  if (!sanitized.startsWith('/')) {
    sanitized = '/' + sanitized;
  }

  // Normaliza múltiplos slashes
  sanitized = sanitized.replace(/\/+/g, '/');

  // Remove trailing slash (exceto para root)
  if (sanitized.length > 1 && sanitized.endsWith('/')) {
    sanitized = sanitized.slice(0, -1);
  }

  // Verifica se está dentro dos paths permitidos
  const isAllowed = SECURITY_CONFIG.ALLOWED_BASE_PATHS.some(base =>
    sanitized === base || sanitized.startsWith(base + '/')
  );

  // Em development, permite todos os paths
  if (import.meta.env.MODE === 'development' || isAllowed) {
    // Limita tamanho máximo do path
    if (sanitized.length > 1000) {
      return { valid: false, sanitized: '/', error: 'Path muito longo' };
    }
    return { valid: true, sanitized };
  }

  return { valid: false, sanitized: '/', error: 'Path não permitido' };
};

function encodePath(path: string): string {
  const validated = validatePath(path);
  if (!validated.valid) {
    console.warn('[FILEBROWSER] Path inválido:', path, '->', validated.error);
    // Em produção, lança erro; em dev, apenas loga
    if (import.meta.env.MODE !== 'development') {
      throw new Error(`Path inválido: ${validated.error}`);
    }
  }
  return encodeURIComponent(validated.sanitized).replace(/%2F/g, "/");
}

// Validação de nome de arquivo - previne XSS e caracteres perigosos
const sanitizeFilename = (filename: string): string => {
  if (!filename || typeof filename !== 'string') return '';
  // Remove caracteres perigosos, mantém apenas letras, números, espaços, traços, underscores e ponto para extensão
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\.+/g, '.') // Remove múltiplos pontos
    .slice(0, 255); // Limite de tamanho
};

// ── Operações ─────────────────────────────────────────────────────────────────

export async function fbList(path: string): Promise<FBListing> {
  await enforceRateLimit();
  const token = await getToken();
  const encodedPath = encodePath(path);
  const res = await fetch(`${FB_BASE_URL}/api/resources${encodedPath}`, {
    headers: authHeader(token),
  });
  if (!res.ok) throw new Error(`Erro ao listar pasta: ${path}`);
  const result = await res.json();

  // Validação e sanitização do resultado
  if (result.items && Array.isArray(result.items)) {
    // Limita número de itens retornados
    result.items = result.items.slice(0, SECURITY_CONFIG.MAX_ITEMS_PER_REQUEST);
    // Sanitiza nomes de arquivos
    result.items.forEach((item: FBFile) => {
      item.name = sanitizeFilename(item.name);
    });
  }
  return result;
}

export async function fbCreateFolder(path: string): Promise<void> {
  await enforceRateLimit();
  const token = await getToken();
  const encodedPath = encodePath(path);
  const res = await fetch(`${FB_BASE_URL}/api/resources${encodedPath}/`, {
    method: "POST",
    headers: authHeader(token),
  });
  if (!res.ok) throw new Error("Erro ao criar pasta");
}

export async function fbDelete(paths: string[]): Promise<void> {
  await enforceRateLimit();
  const token = await getToken();
  // Limita número de deletões por requisição
  const limitedPaths = paths.slice(0, SECURITY_CONFIG.MAX_ITEMS_PER_REQUEST);
  await Promise.all(
    limitedPaths.map(async (p) => {
      const res = await fetch(`${FB_BASE_URL}/api/resources${encodePath(p)}`, {
        method: "DELETE",
        headers: authHeader(token),
      });
      if (!res.ok) throw new Error(`Erro ao excluir: ${p}`);
    })
  );
}

export async function fbMove(
  from: string[],
  toFolder: string,
  overwrite = false
): Promise<void> {
  await enforceRateLimit();
  const token = await getToken();
  // Valida o path de destino
  const validatedToFolder = validatePath(toFolder);
  if (!validatedToFolder.valid) {
    throw new Error(`Destino inválido: ${validatedToFolder.error}`);
  }
  // Limita número de itens por operação
  const limitedFrom = from.slice(0, SECURITY_CONFIG.MAX_ITEMS_PER_REQUEST);
  const res = await fetch(`${FB_BASE_URL}/api/resources`, {
    method: "PATCH",
    headers: authHeader(token),
    body: JSON.stringify({
      action: "move",
      items: limitedFrom.map((src) => ({
        from: src,
        to: `${validatedToFolder.sanitized}/${sanitizeFilename(src.split("/").pop() || '')}`,
      })),
      overwrite,
    }),
  });
  if (!res.ok) throw new Error("Erro ao mover itens");
}

export async function fbCopy(
  from: string[],
  toFolder: string,
  overwrite = false
): Promise<void> {
  await enforceRateLimit();
  const token = await getToken();
  // Valida o path de destino
  const validatedToFolder = validatePath(toFolder);
  if (!validatedToFolder.valid) {
    throw new Error(`Destino inválido: ${validatedToFolder.error}`);
  }
  // Limita número de itens por operação
  const limitedFrom = from.slice(0, SECURITY_CONFIG.MAX_ITEMS_PER_REQUEST);
  const res = await fetch(`${FB_BASE_URL}/api/resources`, {
    method: "PATCH",
    headers: authHeader(token),
    body: JSON.stringify({
      action: "copy",
      items: limitedFrom.map((src) => ({
        from: src,
        to: `${validatedToFolder.sanitized}/${sanitizeFilename(src.split("/").pop() || '')}`,
      })),
      overwrite,
    }),
  });
  if (!res.ok) throw new Error("Erro ao copiar itens");
}

export async function fbRename(oldPath: string, newName: string): Promise<void> {
  const parent = oldPath.substring(0, oldPath.lastIndexOf("/"));
  const sanitizedName = sanitizeFilename(newName);
  if (!sanitizedName) {
    throw new Error("Nome de arquivo inválido");
  }
  await fbMove([oldPath], `${parent}/${sanitizedName}`, false);
}

export async function fbUpload(
  folderPath: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<void> {
  await enforceRateLimit();
  const token = await getToken();
  // Sanitiza nome do arquivo e path
  const safeFolder = encodePath(folderPath);
  const safeFilename = sanitizeFilename(file.name);
  if (!safeFilename) {
    throw new Error("Nome de arquivo inválido");
  }
  const encoded = `${safeFolder}/${safeFilename}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${FB_BASE_URL}/api/resources${encoded}`);
    xhr.setRequestHeader("X-Auth", token);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload  = () => (xhr.status < 300 ? resolve() : reject(new Error("Erro no upload")));
    xhr.onerror = () => reject(new Error("Erro de rede no upload"));
    xhr.send(file);
  });
}

export async function fbDownloadUrl(path: string): Promise<string> {
  const token = await getToken();
  return `${FB_BASE_URL}/api/raw${encodePath(path)}?auth=${token}`;
}

export async function fbPreviewUrl(path: string): Promise<string> {
  return fbDownloadUrl(path);
}

export function fbDownload(url: string, name: string): void {
  // Validação básica da URL para prevenir open redirect
  try {
    const parsedUrl = new URL(url, window.location.origin);
    // Permite apenas URLs relativas ou do mesmo domínio
    if (parsedUrl.origin !== window.location.origin && !url.startsWith('/')) {
      console.warn('[FILEBROWSER] Download de URL externa bloqueada:', url);
      return;
    }
  } catch {
    console.warn('[FILEBROWSER] URL inválida para download:', url);
    return;
  }

  const a = document.createElement("a");
  a.href = url;
  a.download = sanitizeFilename(name);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
