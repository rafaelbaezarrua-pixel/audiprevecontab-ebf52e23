// ─────────────────────────────────────────────────────────────────────────────
// src/lib/filebrowser.ts
// Camada de comunicação com o FileBrowser (servidor local)
// ─────────────────────────────────────────────────────────────────────────────

const FB_BASE_URL = import.meta.env.VITE_FILEBROWSER_URL ?? "http://192.168.1.100:8080";
const FB_USER     = import.meta.env.VITE_FILEBROWSER_USER ?? "admin";
const FB_PASS     = import.meta.env.VITE_FILEBROWSER_PASS ?? "";

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

async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token;

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

function encodePath(path: string): string {
  return encodeURIComponent(path).replace(/%2F/g, "/");
}

// ── Operações ─────────────────────────────────────────────────────────────────

export async function fbList(path: string): Promise<FBListing> {
  const token = await getToken();
  const res = await fetch(`${FB_BASE_URL}/api/resources${encodePath(path)}`, {
    headers: authHeader(token),
  });
  if (!res.ok) throw new Error(`Erro ao listar pasta: ${path}`);
  return res.json();
}

export async function fbCreateFolder(path: string): Promise<void> {
  const token = await getToken();
  const res = await fetch(`${FB_BASE_URL}/api/resources${encodePath(path)}/`, {
    method: "POST",
    headers: authHeader(token),
  });
  if (!res.ok) throw new Error("Erro ao criar pasta");
}

export async function fbDelete(paths: string[]): Promise<void> {
  const token = await getToken();
  await Promise.all(
    paths.map(async (p) => {
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
  const token = await getToken();
  const res = await fetch(`${FB_BASE_URL}/api/resources`, {
    method: "PATCH",
    headers: authHeader(token),
    body: JSON.stringify({
      action: "move",
      items: from.map((src) => ({
        from: src,
        to: `${toFolder}/${src.split("/").pop()}`,
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
  const token = await getToken();
  const res = await fetch(`${FB_BASE_URL}/api/resources`, {
    method: "PATCH",
    headers: authHeader(token),
    body: JSON.stringify({
      action: "copy",
      items: from.map((src) => ({
        from: src,
        to: `${toFolder}/${src.split("/").pop()}`,
      })),
      overwrite,
    }),
  });
  if (!res.ok) throw new Error("Erro ao copiar itens");
}

export async function fbRename(oldPath: string, newName: string): Promise<void> {
  const parent = oldPath.substring(0, oldPath.lastIndexOf("/"));
  await fbMove([oldPath], `${parent}/${newName}`, false);
}

export async function fbUpload(
  folderPath: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<void> {
  const token = await getToken();
  const encoded = encodePath(`${folderPath}/${file.name}`);

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
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
