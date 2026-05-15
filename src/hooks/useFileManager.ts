// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useFileManager.ts
// Hook central do gerenciador de arquivos com sincronização automática
// FileBrowser desabilitado — retorna estado de servidor offline
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadTask {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
}

export interface Clipboard {
  op: "copy" | "cut";
  items: never[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useFileManager(_initialPath = "/") {
  const noop = async () => {};
  const noopSync = () => {};

  return {
    // estado
    currentPath: "/",
    listing: null,
    selected: [] as never[],
    clipboard: null,
    uploads: [] as UploadTask[],
    loading: false,
    error: null,
    connected: false as boolean | null,
    // navegação
    navigate: noop,
    navigateUp: noopSync,
    reload: noop,
    // seleção
    toggleSelect: noopSync,
    selectAll: noopSync,
    clearSelect: noopSync,
    // operações
    newFolder: noop,
    remove: noop,
    copy: noopSync,
    cut: noopSync,
    paste: noop,
    rename: noop,
    upload: noop,
    download: noop,
    // utils
    clearError: noopSync,
  };
}
