// ─────────────────────────────────────────────────────────────────────────────
// integration/src/lib/filebrowser.ts
// Integração com FileBrowser — desabilitada
// ─────────────────────────────────────────────────────────────────────────────

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

const OFFLINE_ERROR = "Servidor de arquivos indisponível";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fbList(_path: string): Promise<FBListing> {
  throw new Error(OFFLINE_ERROR);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fbCreateFolder(_path: string): Promise<void> {
  throw new Error(OFFLINE_ERROR);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fbDelete(_paths: string[]): Promise<void> {
  throw new Error(OFFLINE_ERROR);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fbMove(_from: string[], _toFolder: string, _overwrite = false): Promise<void> {
  throw new Error(OFFLINE_ERROR);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fbCopy(_from: string[], _toFolder: string, _overwrite = false): Promise<void> {
  throw new Error(OFFLINE_ERROR);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fbRename(_oldPath: string, _newName: string): Promise<void> {
  throw new Error(OFFLINE_ERROR);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fbUpload(_folderPath: string, _file: File, _onProgress?: (pct: number) => void): Promise<void> {
  throw new Error(OFFLINE_ERROR);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fbDownloadUrl(_path: string): Promise<string> {
  throw new Error(OFFLINE_ERROR);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fbPreviewUrl(_path: string): Promise<string> {
  throw new Error(OFFLINE_ERROR);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function fbDownload(_url: string, _name: string): void {
  // no-op
}
