const FB_PROXY_API = "/api/filebrowser";
const FB_DOWNLOAD_API = "/api/filebrowser-download";

const SECURITY_CONFIG = {
  ALLOWED_BASE_PATHS: ["/uploads", "/documentos", "/public"],
  MAX_ITEMS_PER_REQUEST: 100,
  MIN_REQUEST_INTERVAL_MS: 500,
};

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

let lastRequestTime = 0;

const enforceRateLimit = async (): Promise<void> => {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < SECURITY_CONFIG.MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, SECURITY_CONFIG.MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
};

const buildProxyUrl = (target: string): string =>
  `${FB_PROXY_API}?target=${encodeURIComponent(target)}`;

const validatePath = (path: string): { valid: boolean; sanitized: string; error?: string } => {
  if (!path || typeof path !== "string") {
    return { valid: false, sanitized: "/", error: "Path inválido" };
  }

  let sanitized = path.trim();

  if (sanitized.includes("..") || sanitized.includes("\\")) {
    return { valid: false, sanitized: "/", error: "Path contém caracteres inválidos" };
  }

  if (sanitized.includes("\0")) {
    return { valid: false, sanitized: "/", error: "Path contém caracteres nulos" };
  }

  if (!sanitized.startsWith("/")) {
    sanitized = "/" + sanitized;
  }

  sanitized = sanitized.replace(/\/+/g, "/");

  if (sanitized.length > 1 && sanitized.endsWith("/")) {
    sanitized = sanitized.slice(0, -1);
  }

  const isAllowed = SECURITY_CONFIG.ALLOWED_BASE_PATHS.some(
    (base) => sanitized === base || sanitized.startsWith(base + "/")
  );

  if (import.meta.env.MODE === "development" || isAllowed) {
    if (sanitized.length > 1000) {
      return { valid: false, sanitized: "/", error: "Path muito longo" };
    }
    return { valid: true, sanitized };
  }

  return { valid: false, sanitized: "/", error: "Path não permitido" };
};

function encodePath(path: string): string {
  const validated = validatePath(path);
  if (!validated.valid) {
    console.warn("[FILEBROWSER] Path inválido:", path, "->", validated.error);
    if (import.meta.env.MODE !== "development") {
      throw new Error(`Path inválido: ${validated.error}`);
    }
  }
  return encodeURIComponent(validated.sanitized).replace(/%2F/g, "/");
}

const sanitizeFilename = (filename: string): string => {
  if (!filename || typeof filename !== "string") return "";
  return filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").replace(/\.+/g, ".").slice(0, 255);
};

export async function fbList(path: string): Promise<FBListing> {
  await enforceRateLimit();
  const encodedPath = encodePath(path);
  const res = await fetch(buildProxyUrl(`/api/resources${encodedPath}`));
  if (!res.ok) throw new Error(`Erro ao listar pasta: ${path}`);
  const result = await res.json();

  if (result.items && Array.isArray(result.items)) {
    result.items = result.items.slice(0, SECURITY_CONFIG.MAX_ITEMS_PER_REQUEST);
    result.items.forEach((item: FBFile) => {
      item.name = sanitizeFilename(item.name);
    });
  }

  return result;
}

export async function fbCreateFolder(path: string): Promise<void> {
  await enforceRateLimit();
  const encodedPath = encodePath(path);
  const res = await fetch(buildProxyUrl(`/api/resources${encodedPath}/`), {
    method: "POST",
  });
  if (!res.ok) throw new Error("Erro ao criar pasta");
}

export async function fbDelete(paths: string[]): Promise<void> {
  await enforceRateLimit();
  const limitedPaths = paths.slice(0, SECURITY_CONFIG.MAX_ITEMS_PER_REQUEST);
  await Promise.all(
    limitedPaths.map(async (path) => {
      const res = await fetch(buildProxyUrl(`/api/resources${encodePath(path)}`), {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Erro ao excluir: ${path}`);
    })
  );
}

export async function fbMove(from: string[], toFolder: string, overwrite = false): Promise<void> {
  await enforceRateLimit();
  const validatedToFolder = validatePath(toFolder);
  if (!validatedToFolder.valid) {
    throw new Error(`Destino inválido: ${validatedToFolder.error}`);
  }

  const limitedFrom = from.slice(0, SECURITY_CONFIG.MAX_ITEMS_PER_REQUEST);
  const res = await fetch(buildProxyUrl("/api/resources"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "move",
      items: limitedFrom.map((src) => ({
        from: src,
        to: `${validatedToFolder.sanitized}/${sanitizeFilename(src.split("/").pop() || "")}`,
      })),
      overwrite,
    }),
  });

  if (!res.ok) throw new Error("Erro ao mover itens");
}

export async function fbCopy(from: string[], toFolder: string, overwrite = false): Promise<void> {
  await enforceRateLimit();
  const validatedToFolder = validatePath(toFolder);
  if (!validatedToFolder.valid) {
    throw new Error(`Destino inválido: ${validatedToFolder.error}`);
  }

  const limitedFrom = from.slice(0, SECURITY_CONFIG.MAX_ITEMS_PER_REQUEST);
  const res = await fetch(buildProxyUrl("/api/resources"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "copy",
      items: limitedFrom.map((src) => ({
        from: src,
        to: `${validatedToFolder.sanitized}/${sanitizeFilename(src.split("/").pop() || "")}`,
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
  const safeFolder = encodePath(folderPath);
  const safeFilename = sanitizeFilename(file.name);
  if (!safeFilename) {
    throw new Error("Nome de arquivo inválido");
  }

  const encoded = `${safeFolder}/${safeFilename}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", buildProxyUrl(`/api/resources${encoded}`));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error("Erro no upload")));
    xhr.onerror = () => reject(new Error("Erro de rede no upload"));
    xhr.send(file);
  });
}

export async function fbDownloadUrl(path: string): Promise<string> {
  const encodedPath = encodePath(path);
  return `${FB_DOWNLOAD_API}?path=${encodeURIComponent(encodedPath)}`;
}

export async function fbPreviewUrl(path: string): Promise<string> {
  return fbDownloadUrl(path);
}

export function fbDownload(url: string, name: string): void {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    if (parsedUrl.origin !== window.location.origin && !url.startsWith("/")) {
      console.warn("[FILEBROWSER] Download de URL externa bloqueada:", url);
      return;
    }
  } catch {
    console.warn("[FILEBROWSER] URL inválida para download:", url);
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = sanitizeFilename(name);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
