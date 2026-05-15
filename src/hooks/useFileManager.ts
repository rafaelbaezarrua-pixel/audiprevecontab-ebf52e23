// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useFileManager.ts
// Hook central do gerenciador de arquivos com sincronização automática
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  fbList, fbCreateFolder, fbDelete, fbMove, fbCopy,
  fbRename, fbUpload, fbDownloadUrl, fbDownload,
  FBFile, FBListing,
} from "@/lib/filebrowser";

const SYNC_INTERVAL = 20_000; // 20 segundos

export interface UploadTask {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
}

export interface Clipboard {
  op: "copy" | "cut";
  items: FBFile[];
}

export function useFileManager(initialPath = "/") {
  const [currentPath, setCurrentPath]   = useState(initialPath);
  const [listing, setListing]           = useState<FBListing | null>(null);
  const [selected, setSelected]         = useState<FBFile[]>([]);
  const [clipboard, setClipboard]       = useState<Clipboard | null>(null);
  const [uploads, setUploads]           = useState<UploadTask[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [connected, setConnected]       = useState<boolean | null>(null);
  const syncRef                         = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentPathRef                  = useRef(currentPath);
  currentPathRef.current                = currentPath;

  // ── Carregar ────────────────────────────────────────────────────────────────

  const load = useCallback(async (path: string, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await fbList(path);
      setListing(data);
      setCurrentPath(path);
      setConnected(true);
      if (!silent) setSelected([]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar pasta";
      setConnected(false);
      if (!silent) {
        setError(msg);
        toast.error("Erro ao carregar pasta", { description: msg });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // ── Sync automático ─────────────────────────────────────────────────────────

  useEffect(() => {
    load(currentPath);
    syncRef.current = setInterval(() => load(currentPathRef.current, true), SYNC_INTERVAL);
    return () => { if (syncRef.current) clearInterval(syncRef.current); };
  }, []); // eslint-disable-line

  const navigate  = useCallback((path: string) => load(path), [load]);
  const reload    = useCallback(() => load(currentPathRef.current), [load]);

  const navigateUp = useCallback(() => {
    const parts = currentPath.split("/").filter(Boolean);
    if (parts.length === 0) return;
    parts.pop();
    load("/" + parts.join("/") || "/");
  }, [currentPath, load]);

  // ── Seleção ─────────────────────────────────────────────────────────────────

  const toggleSelect = useCallback((item: FBFile) => {
    setSelected((prev) =>
      prev.some((i) => i.path === item.path)
        ? prev.filter((i) => i.path !== item.path)
        : [...prev, item]
    );
  }, []);

  const selectAll   = useCallback(() => setSelected(listing?.items ?? []), [listing]);
  const clearSelect = useCallback(() => setSelected([]), []);

  // ── Criar pasta ──────────────────────────────────────────────────────────────

  const newFolder = useCallback(async (name: string) => {
    try {
      await fbCreateFolder(`${currentPath}/${name}`);
      toast.success(`Pasta "${name}" criada`);
      await load(currentPath);
    } catch (e: unknown) {
      toast.error("Erro ao criar pasta", { description: (e as Error).message });
    }
  }, [currentPath, load]);

  // ── Excluir ─────────────────────────────────────────────────────────────────

  const remove = useCallback(async (targets?: FBFile[]) => {
    const items = targets ?? selected;
    if (!items.length) return;
    try {
      await fbDelete(items.map((i) => i.path));
      toast.success(`${items.length} item(s) excluído(s)`);
      await load(currentPath);
    } catch (e: unknown) {
      toast.error("Erro ao excluir", { description: (e as Error).message });
    }
  }, [selected, currentPath, load]);

  // ── Clipboard ────────────────────────────────────────────────────────────────

  const copy = useCallback((items?: FBFile[]) => {
    const targets = items ?? selected;
    setClipboard({ op: "copy", items: targets });
    toast.success(`${targets.length} item(s) copiado(s)`);
  }, [selected]);

  const cut = useCallback((items?: FBFile[]) => {
    const targets = items ?? selected;
    setClipboard({ op: "cut", items: targets });
    toast.success(`${targets.length} item(s) recortado(s)`);
  }, [selected]);

  const paste = useCallback(async () => {
    if (!clipboard) return;
    const paths = clipboard.items.map((i) => i.path);
    try {
      if (clipboard.op === "copy") {
        await fbCopy(paths, currentPath);
      } else {
        await fbMove(paths, currentPath);
        setClipboard(null);
      }
      toast.success("Itens colados com sucesso");
      await load(currentPath);
    } catch (e: unknown) {
      toast.error("Erro ao colar", { description: (e as Error).message });
    }
  }, [clipboard, currentPath, load]);

  // ── Renomear ─────────────────────────────────────────────────────────────────

  const rename = useCallback(async (item: FBFile, newName: string) => {
    try {
      await fbRename(item.path, newName);
      toast.success(`Renomeado para "${newName}"`);
      await load(currentPath);
    } catch (e: unknown) {
      toast.error("Erro ao renomear", { description: (e as Error).message });
    }
  }, [currentPath, load]);

  // ── Upload ───────────────────────────────────────────────────────────────────

  const upload = useCallback(async (files: FileList) => {
    const tasks: UploadTask[] = Array.from(files).map((f) => ({
      fileName: f.name, progress: 0, status: "pending",
    }));
    setUploads(tasks);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploads((prev) =>
        prev.map((u, idx) => idx === i ? { ...u, status: "uploading" } : u)
      );
      try {
        await fbUpload(currentPath, file, (pct) => {
          setUploads((prev) =>
            prev.map((u, idx) => idx === i ? { ...u, progress: pct } : u)
          );
        });
        setUploads((prev) =>
          prev.map((u, idx) => idx === i ? { ...u, status: "done", progress: 100 } : u)
        );
      } catch {
        setUploads((prev) =>
          prev.map((u, idx) => idx === i ? { ...u, status: "error" } : u)
        );
      }
    }

    toast.success(`${files.length} arquivo(s) enviado(s)`);
    await load(currentPath);
    setTimeout(() => setUploads([]), 4000);
  }, [currentPath, load]);

  // ── Download ─────────────────────────────────────────────────────────────────

  const download = useCallback(async (item: FBFile) => {
    try {
      const url = await fbDownloadUrl(item.path);
      fbDownload(url, item.name);
    } catch (e: unknown) {
      toast.error("Erro ao baixar arquivo", { description: (e as Error).message });
    }
  }, []);

  return {
    // estado
    currentPath, listing, selected, clipboard, uploads, loading, error, connected,
    // navegação
    navigate, navigateUp, reload,
    // seleção
    toggleSelect, selectAll, clearSelect,
    // operações
    newFolder, remove, copy, cut, paste, rename, upload, download,
    // utils
    clearError: () => setError(null),
  };
}
