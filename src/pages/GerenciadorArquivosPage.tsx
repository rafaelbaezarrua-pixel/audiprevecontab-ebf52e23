import React, { useState, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFileManager } from "@/hooks/useFileManager";
import {
  DEPARTAMENTOS, EMPRESAS_ROOT, buildPath,
  getFileIcon, formatBytes, formatDate,
  Departamento,
} from "@/config/fileManagerConfig";
import { fbPreviewUrl } from "@/lib/filebrowser";
import { FBFile } from "@/lib/filebrowser";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HardDrive, FolderPlus, Upload, Trash2, Copy, Scissors,
  ClipboardPaste, RefreshCw, ChevronRight, MoreVertical,
  Download, Eye, Pencil, CheckSquare, ArrowLeft,
  Wifi, WifiOff, Loader2, Building2, Search, X,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: Breadcrumb
// ─────────────────────────────────────────────────────────────────────────────

function Breadcrumb({
  path, onNavigate,
}: { path: string; onNavigate: (p: string) => void }) {
  const parts = path.split("/").filter(Boolean);
  return (
    <div className="flex items-center gap-1 text-xs overflow-x-auto whitespace-nowrap no-scrollbar min-w-0">
      <button
        onClick={() => onNavigate("/")}
        className="text-primary hover:underline font-bold shrink-0"
      >
        Início
      </button>
      {parts.map((part, i) => {
        const p = "/" + parts.slice(0, i + 1).join("/");
        return (
          <React.Fragment key={p}>
            <ChevronRight size={12} className="text-muted-foreground shrink-0" />
            <button
              onClick={() => onNavigate(p)}
              className={`hover:underline shrink-0 ${
                i === parts.length - 1
                  ? "text-card-foreground font-black"
                  : "text-primary"
              }`}
            >
              {part}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: Painel lateral — Empresas e Departamentos
// ─────────────────────────────────────────────────────────────────────────────

interface SidebarProps {
  empresas: any[];
  selectedEmpresa: any | null;
  selectedDepto: Departamento | null;
  onSelectEmpresa: (emp: any) => void;
  onSelectDepto: (d: Departamento) => void;
  search: string;
  onSearch: (v: string) => void;
}

function Sidebar({
  empresas, selectedEmpresa, selectedDepto,
  onSelectEmpresa, onSelectDepto, search, onSearch,
}: SidebarProps) {
  const filtered = empresas.filter((e) =>
    e.nome_empresa?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-64 shrink-0 border-r border-border/60 flex flex-col bg-card/30">
      {/* Busca de empresa */}
      <div className="p-3 border-b border-border/40">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar empresa..."
            className="pl-8 h-8 text-xs bg-muted/40"
          />
          {search && (
            <button
              onClick={() => onSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-0.5">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Nenhuma empresa encontrada
            </p>
          ) : (
            filtered.map((emp) => {
              const isExpanded = selectedEmpresa?.id === emp.id;
              return (
                <div key={emp.id}>
                  {/* Empresa */}
                  <button
                    onClick={() => onSelectEmpresa(emp)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left group ${
                      isExpanded
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-card-foreground"
                    }`}
                  >
                    <Building2 size={14} className="shrink-0" />
                    <span className="truncate flex-1">{emp.nome_empresa}</span>
                    <ChevronRight
                      size={12}
                      className={`shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    />
                  </button>

                  {/* Departamentos */}
                  {isExpanded && (
                    <div className="pl-4 pb-1 space-y-0.5 mt-0.5">
                      {DEPARTAMENTOS.map((depto) => {
                        const active =
                          selectedDepto?.id === depto.id &&
                          selectedEmpresa?.id === emp.id;
                        return (
                          <button
                            key={depto.id}
                            onClick={() => onSelectDepto(depto)}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all text-left ${
                              active
                                ? "bg-primary/20 text-primary font-bold"
                                : "text-muted-foreground hover:bg-muted/40 hover:text-card-foreground"
                            }`}
                          >
                            <span>{depto.icon}</span>
                            <span className="truncate">{depto.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>
      </ScrollArea>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: Preview Modal
// ─────────────────────────────────────────────────────────────────────────────

function PreviewModal({
  item, onClose,
}: { item: FBFile; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const ext = item.extension.toLowerCase();
  const isImage = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(ext);
  const isPdf   = ext === ".pdf";

  useEffect(() => {
    fbPreviewUrl(item.path).then(setUrl);
  }, [item.path]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <span>{getFileIcon(false, item.extension)}</span>
            <span className="truncate">{item.name}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {formatBytes(item.size)} · {formatDate(item.modified)}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-4">
          {!url ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          ) : isImage ? (
            <img src={url} alt={item.name} className="max-w-full mx-auto rounded-lg" />
          ) : isPdf ? (
            <iframe src={url} className="w-full h-[70vh] rounded-lg" title={item.name} />
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">{getFileIcon(false, item.extension)}</div>
              <p className="text-muted-foreground text-sm mb-4">
                Preview não disponível para este tipo de arquivo.
              </p>
              <a
                href={url}
                download={item.name}
                className="button-premium inline-flex"
              >
                <Download size={16} className="mr-2" /> Baixar Arquivo
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const GerenciadorArquivosPage: React.FC = () => {
  const { userData } = useAuth();

  // ── Empresas do Supabase ────────────────────────────────────────────────────
  const { data: empresas = [], isLoading: loadingEmpresas } = useQuery({
    queryKey: ["empresas-file-manager"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nome_empresa, pasta_servidor")
        .order("nome_empresa");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Estado de seleção empresa / departamento ─────────────────────────────────
  const [selectedEmpresa, setSelectedEmpresa] = useState<any | null>(null);
  const [selectedDepto,   setSelectedDepto]   = useState<Departamento | null>(null);
  const [empresaSearch,   setEmpresaSearch]   = useState("");

  // ── File Manager Hook ───────────────────────────────────────────────────────
  const fm = useFileManager(EMPRESAS_ROOT);

  // ── UI State ────────────────────────────────────────────────────────────────
  const [newFolderMode,  setNewFolderMode]  = useState(false);
  const [newFolderName,  setNewFolderName]  = useState("");
  const [renameTarget,   setRenameTarget]   = useState<FBFile | null>(null);
  const [renameValue,    setRenameValue]    = useState("");
  const [preview,        setPreview]        = useState<FBFile | null>(null);
  const [fileSearch,     setFileSearch]     = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);

  // ── Navegar ao selecionar empresa / departamento ─────────────────────────────

  const handleSelectEmpresa = useCallback((emp: any) => {
    setSelectedEmpresa((prev: any) => (prev?.id === emp.id ? null : emp));
    setSelectedDepto(null);
    // Navega para a pasta raiz da empresa no servidor
    // Usa pasta_servidor se disponível, senão usa o nome da empresa
    const folderName = emp.pasta_servidor || emp.nome_empresa;
    fm.navigate(`${EMPRESAS_ROOT}/${folderName}`);
  }, [fm]);

  const handleSelectDepto = useCallback((depto: Departamento) => {
    setSelectedDepto(depto);
    if (!selectedEmpresa) return;
    const folderName = selectedEmpresa.pasta_servidor || selectedEmpresa.nome_empresa;
    const path = buildPath(folderName, depto);
    fm.navigate(path);
  }, [selectedEmpresa, fm]);

  // ── Abrir item ───────────────────────────────────────────────────────────────

  const handleOpen = useCallback((item: FBFile) => {
    if (item.isDir) {
      fm.navigate(item.path);
    } else {
      setPreview(item);
    }
  }, [fm]);

  // ── Criar pasta ──────────────────────────────────────────────────────────────

  const handleNewFolder = async () => {
    if (!newFolderName.trim()) return;
    await fm.newFolder(newFolderName.trim());
    setNewFolderMode(false);
    setNewFolderName("");
  };

  // ── Renomear ─────────────────────────────────────────────────────────────────

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    await fm.rename(renameTarget, renameValue.trim());
    setRenameTarget(null);
    setRenameValue("");
  };

  // ── Filtrar lista ────────────────────────────────────────────────────────────

  const filteredItems = (fm.listing?.items ?? []).filter((item) =>
    item.name.toLowerCase().includes(fileSearch.toLowerCase())
  );

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.isDir === b.isDir) return a.name.localeCompare(b.name, "pt-BR");
    return a.isDir ? -1 : 1;
  });

  // ── Estatísticas ─────────────────────────────────────────────────────────────

  const stats = fm.listing
    ? `${fm.listing.numDirs} pasta${fm.listing.numDirs !== 1 ? "s" : ""} · ${fm.listing.numFiles} arquivo${fm.listing.numFiles !== 1 ? "s" : ""}`
    : "";

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in pb-10">

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="header-title">Gerenciador de Arquivos</h1>
            <FavoriteToggleButton moduleId="gerenciador_arquivos" />
          </div>
          <p className="subtitle-premium">
            Acesso ao servidor de arquivos · Sincronizado com OneDrive
          </p>
        </div>

        {/* Status de conexão */}
        <div className="flex items-center gap-2">
          {fm.connected === null && (
            <span className="badge-status badge-gray text-[9px] flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" /> CONECTANDO
            </span>
          )}
          {fm.connected === true && (
            <span className="badge-status badge-success text-[9px] flex items-center gap-1">
              <Wifi size={10} /> SERVIDOR ONLINE
            </span>
          )}
          {fm.connected === false && (
            <span className="badge-status badge-danger text-[9px] flex items-center gap-1">
              <WifiOff size={10} /> SERVIDOR OFFLINE
            </span>
          )}
        </div>
      </div>

      {/* Painel principal */}
      <div className="card-premium !p-0 overflow-hidden flex" style={{ height: "calc(100vh - 240px)", minHeight: 500 }}>

        {/* Sidebar de empresas */}
        {loadingEmpresas ? (
          <div className="w-64 shrink-0 border-r border-border/60 flex items-center justify-center">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Sidebar
            empresas={empresas}
            selectedEmpresa={selectedEmpresa}
            selectedDepto={selectedDepto}
            onSelectEmpresa={handleSelectEmpresa}
            onSelectDepto={handleSelectDepto}
            search={empresaSearch}
            onSearch={setEmpresaSearch}
          />
        )}

        {/* Área de arquivos */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5 border-b border-border/40 bg-card/60">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={fm.navigateUp}
              disabled={fm.currentPath === "/" || fm.loading}
            >
              <ArrowLeft size={13} /> Voltar
            </Button>

            <div className="w-px h-5 bg-border/60" />

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => setNewFolderMode(true)}
              disabled={fm.loading}
            >
              <FolderPlus size={13} /> Nova Pasta
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => uploadRef.current?.click()}
              disabled={fm.loading}
            >
              <Upload size={13} /> Upload
            </Button>

            <div className="w-px h-5 bg-border/60" />

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={fm.selectAll}
              disabled={!fm.listing?.items?.length}
            >
              <CheckSquare size={13} /> Todos
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => fm.copy()}
              disabled={!fm.selected.length}
            >
              <Copy size={13} /> Copiar
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => fm.cut()}
              disabled={!fm.selected.length}
            >
              <Scissors size={13} /> Recortar
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={fm.paste}
              disabled={!fm.clipboard}
            >
              <ClipboardPaste size={13} /> Colar
            </Button>

            <div className="w-px h-5 bg-border/60" />

            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => fm.remove()}
              disabled={!fm.selected.length}
            >
              <Trash2 size={13} /> Excluir
            </Button>

            <div className="flex-1" />

            {/* Busca de arquivo */}
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                placeholder="Filtrar arquivos..."
                className="h-8 text-xs pl-7 w-40 bg-muted/40"
              />
            </div>

            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={fm.reload}
              disabled={fm.loading}
            >
              <RefreshCw size={14} className={fm.loading ? "animate-spin" : ""} />
            </Button>
          </div>

          {/* Breadcrumb + info */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border/30 bg-muted/20 min-w-0">
            <HardDrive size={13} className="text-primary shrink-0" />
            <Breadcrumb path={fm.currentPath} onNavigate={fm.navigate} />
            <span className="ml-auto text-[10px] text-muted-foreground shrink-0 font-bold uppercase tracking-widest">
              {stats}
            </span>
          </div>

          {/* Empresa / Departamento selecionados */}
          {selectedEmpresa && (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/5 border-b border-primary/10">
              <Building2 size={12} className="text-primary" />
              <span className="text-xs font-black text-primary">
                {selectedEmpresa.nome_empresa}
              </span>
              {selectedDepto && (
                <>
                  <ChevronRight size={12} className="text-primary/60" />
                  <span className="text-xs font-bold text-primary/80">
                    {selectedDepto.icon} {selectedDepto.label}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Nova pasta inline */}
          {newFolderMode && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/5 border-b border-amber-500/20">
              <span className="text-xs text-muted-foreground font-bold">
                Nome da nova pasta:
              </span>
              <Input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNewFolder();
                  if (e.key === "Escape") { setNewFolderMode(false); setNewFolderName(""); }
                }}
                className="h-7 text-xs flex-1"
                placeholder="Nova Pasta"
              />
              <Button size="sm" className="h-7 text-xs button-premium" onClick={handleNewFolder}>
                Criar
              </Button>
              <Button
                size="sm" variant="ghost"
                className="h-7 text-xs"
                onClick={() => { setNewFolderMode(false); setNewFolderName(""); }}
              >
                Cancelar
              </Button>
            </div>
          )}

          {/* Renomear inline */}
          {renameTarget && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/5 border-b border-amber-500/20">
              <span className="text-xs text-muted-foreground font-bold">
                Renomear:
              </span>
              <Input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") { setRenameTarget(null); setRenameValue(""); }
                }}
                className="h-7 text-xs flex-1"
              />
              <Button size="sm" className="h-7 text-xs button-premium" onClick={handleRename}>
                Salvar
              </Button>
              <Button
                size="sm" variant="ghost"
                className="h-7 text-xs"
                onClick={() => { setRenameTarget(null); setRenameValue(""); }}
              >
                Cancelar
              </Button>
            </div>
          )}

          {/* Upload progress */}
          {fm.uploads.length > 0 && (
            <div className="px-4 py-2 bg-primary/5 border-b border-primary/10 space-y-1">
              {fm.uploads.map((u) => (
                <div key={u.fileName} className="flex items-center gap-2 text-xs">
                  <span className="truncate flex-1 font-medium">{u.fileName}</span>
                  <div className="w-28 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        u.status === "error" ? "bg-destructive" : "bg-primary"
                      }`}
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground w-8 text-right">{u.progress}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Erro de conexão */}
          {fm.error && (
            <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2">
              <WifiOff size={13} className="text-destructive shrink-0" />
              <span className="text-xs text-destructive font-medium flex-1">{fm.error}</span>
              <button
                onClick={fm.clearError}
                className="text-destructive/60 hover:text-destructive"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Grid de arquivos */}
          {fm.loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-muted-foreground" size={28} />
            </div>
          ) : fm.connected === false && !fm.listing ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <WifiOff size={40} className="opacity-30" />
              <p className="text-sm font-bold">Servidor Offline</p>
              <p className="text-xs text-center max-w-xs opacity-70">
                Verifique se o FileBrowser está rodando no servidor e se o IP está correto no .env
              </p>
              <Button size="sm" variant="outline" onClick={fm.reload} className="mt-2">
                Tentar Novamente
              </Button>
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <span className="text-4xl opacity-30">📂</span>
              <p className="text-sm font-medium">
                {fileSearch ? "Nenhum arquivo encontrado" : "Pasta vazia"}
              </p>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/40 border-b border-border/40">
                  <tr>
                    <th className="w-8 px-3 py-2.5" />
                    <th className="text-left px-2 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Nome
                    </th>
                    <th className="text-left px-2 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden md:table-cell">
                      Modificado
                    </th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden sm:table-cell">
                      Tamanho
                    </th>
                    <th className="w-10 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => {
                    const isSelected = fm.selected.some((s) => s.path === item.path);
                    return (
                      <tr
                        key={item.path}
                        onClick={() => fm.toggleSelect(item)}
                        onDoubleClick={() => handleOpen(item)}
                        className={`cursor-pointer border-b border-border/30 transition-colors group ${
                          isSelected
                            ? "bg-primary/10 hover:bg-primary/15"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => fm.toggleSelect(item)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-border accent-primary"
                          />
                        </td>

                        {/* Nome */}
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base leading-none shrink-0">
                              {getFileIcon(item.isDir, item.extension)}
                            </span>
                            <span className="truncate font-medium text-card-foreground text-xs">
                              {item.name}
                            </span>
                          </div>
                        </td>

                        {/* Data */}
                        <td className="px-2 py-2.5 text-muted-foreground text-xs hidden md:table-cell">
                          {formatDate(item.modified)}
                        </td>

                        {/* Tamanho */}
                        <td className="px-4 py-2.5 text-right text-muted-foreground text-xs hidden sm:table-cell">
                          {item.isDir ? "—" : formatBytes(item.size)}
                        </td>

                        {/* Ações */}
                        <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical size={14} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {item.isDir ? (
                                <DropdownMenuItem onClick={() => handleOpen(item)}>
                                  <Eye size={13} className="mr-2" /> Abrir
                                </DropdownMenuItem>
                              ) : (
                                <>
                                  <DropdownMenuItem onClick={() => setPreview(item)}>
                                    <Eye size={13} className="mr-2" /> Visualizar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => fm.download(item)}>
                                    <Download size={13} className="mr-2" /> Baixar
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setRenameTarget(item);
                                  setRenameValue(item.name);
                                }}
                              >
                                <Pencil size={13} className="mr-2" /> Renomear
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => fm.copy([item])}>
                                <Copy size={13} className="mr-2" /> Copiar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => fm.cut([item])}>
                                <Scissors size={13} className="mr-2" /> Recortar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => fm.remove([item])}
                              >
                                <Trash2 size={13} className="mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Upload input oculto */}
      <input
        ref={uploadRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && fm.upload(e.target.files)}
      />

      {/* Preview Modal */}
      {preview && (
        <PreviewModal item={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
};

export default GerenciadorArquivosPage;
