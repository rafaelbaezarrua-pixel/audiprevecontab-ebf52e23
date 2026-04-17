import React, { useState } from "react";
import { Building2, Eye, Edit2, ChevronLeft, ChevronRight, Hash } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Empresa } from "@/types/societario";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  PaginationState
} from "@tanstack/react-table";

interface EmpresaTableProps {
  empresas: Empresa[];
  totalCount: number;
  pagination: PaginationState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  isLoading: boolean;
  onInlineEdit?: (id: string, field: string, value: string | number | boolean) => void;
}

const regimeLabels: Record<string, string> = {
  simples: "Simples Nacional", lucro_presumido: "Lucro Presumido", lucro_real: "Lucro Real", mei: "MEI",
};

const situacaoConfig: Record<string, { label: string; cls: string }> = {
  ativa: { label: "Ativa", cls: "badge-success" },
  paralisada: { label: "Paralisada", cls: "badge-warning" },
  baixada: { label: "Baixada", cls: "badge-danger" },
};

export const EmpresaTable = ({
  empresas,
  totalCount,
  pagination,
  setPagination,
  isLoading,
  onInlineEdit
}: EmpresaTableProps) => {
  const navigate = useNavigate();

  const [editingId, setEditingId] = useState<string | null>(null);

  const columns: ColumnDef<Empresa>[] = [
    {
      accessorKey: "nome_empresa",
      header: "Empresa",
      cell: ({ row }) => {
        const emp = row.original;
        const isEditing = editingId === emp.id + '-nome';
        return (
          <div className="flex items-center gap-3 py-1">
            <div className="w-7 h-7 rounded-lg bg-black/10 dark:bg-white/5 flex items-center justify-center transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 shrink-0 shadow-inner">
              <Building2 size={13} />
            </div>
            <div className="flex flex-col">
              {isEditing ? (
                 <input
                   autoFocus
                   type="text"
                   defaultValue={emp.nome_empresa}
                   className="border-b border-primary bg-transparent outline-none text-[10px] font-black uppercase tracking-tighter w-full"
                   onBlur={(e) => {
                     setEditingId(null);
                     if (e.target.value !== emp.nome_empresa && onInlineEdit) {
                       onInlineEdit(emp.id, 'nome_empresa', e.target.value);
                     }
                   }}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter') e.currentTarget.blur();
                     if (e.key === 'Escape') setEditingId(null);
                   }}
                 />
              ) : (
                 <span 
                   onDoubleClick={(e) => { e.stopPropagation(); setEditingId(emp.id + '-nome'); }}
                   className="font-black text-card-foreground group-hover:text-primary transition-colors text-[10px] uppercase tracking-tighter select-none truncate max-w-[200px] sm:max-w-xs cursor-text"
                   title="Dois cliques para editar"
                 >
                   {emp.nome_empresa}
                 </span>
              )}
              <span className="text-[7px] text-muted-foreground/40 uppercase font-black tracking-widest flex items-center gap-0.5">
                <Hash size={7} /> ID: {emp.id.split('-')[0]}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      accessorKey: "cnpj",
      header: "CNPJ",
      cell: ({ row }) => (
        <span className="text-muted-foreground/60 font-mono text-[9px] tabular-nums">{row.original.cnpj || "—"}</span>
      )
    },
    {
      accessorKey: "regime_tributario",
      header: "Regime",
      cell: ({ row }) => {
        const val = row.original.regime_tributario;
        return (
          <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-black/5 text-muted-foreground/60 border border-border/5 whitespace-nowrap">
            {regimeLabels[val || ""] || "—"}
          </span>
        );
      }
    },
    {
      accessorKey: "situacao",
      header: () => <div className="text-center">Situação</div>,
      cell: ({ row }) => {
        const sit = situacaoConfig[row.original.situacao || "ativa"] || situacaoConfig.ativa;
        return (
          <div className="flex justify-center">
             <span className={`badge-status ${sit.cls} shadow-sm shadow-current/5 font-black text-[8px] px-2 py-0.5 uppercase tracking-widest`}>
               {sit.label}
             </span>
          </div>
        );
      }
    },
    {
      accessorKey: "socios_count",
      header: () => <div className="text-center">Sócios</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-black/5 text-[9px] font-black text-muted-foreground border border-border/5 shadow-inner">
              {row.original.socios_count || 0}
            </span>
        </div>
      )
    },
    {
      id: "actions",
      header: () => <div className="text-right pr-6">Ações</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1.5 pr-6" onClick={(e) => e.stopPropagation()}>
           <button onClick={() => navigate(`/societario/${row.original.id}`)} className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground/30 hover:text-primary transition-all border border-transparent" title="Ver Detalhes">
             <Eye size={14} />
           </button>
           <button onClick={() => navigate(`/societario/${row.original.id}`)} className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground/30 hover:text-primary transition-all border border-transparent" title="Editar">
             <Edit2 size={14} />
           </button>
        </div>
      )
    }
  ];

  const table = useReactTable({
    data: empresas,
    columns,
    rowCount: totalCount,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return (
    <div className="bg-card border border-border/10 !p-0 overflow-hidden rounded-xl flex flex-col shadow-2xl">
      <div className="overflow-x-auto flex-1 relative min-h-[300px]">
        {isLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
        )}
        <table className="data-table w-full">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="h-9 bg-black/5">
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="whitespace-nowrap py-0 px-4 text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 border-b border-border/10">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border/5">
            {empresas.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-20 text-muted-foreground bg-black/5">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 rounded-full bg-black/10">
                      <Building2 size={32} className="opacity-10" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-black text-[12px] text-card-foreground uppercase tracking-tight">Nenhuma empresa encontrada</p>
                      <p className="text-[9px] font-medium opacity-40 uppercase tracking-widest">Ajuste os filtros técnicos.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr 
                  key={row.id} 
                  className="cursor-pointer group transition-all hover:bg-black/5" 
                  onClick={() => navigate(`/societario/${row.original.id}`)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-2 border-b border-border/5 last:border-b-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between p-2 border-t border-border/10 bg-black/10 rounded-b-xl h-11 shrink-0">
        <div className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest flex items-center gap-1.5 ml-2">
            Mostrando <span className="text-foreground">{table.getRowModel().rows.length}</span> de <span className="text-foreground">{totalCount}</span> REGISTROS
        </div>
        
        <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1 text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">
                PÁGINA <span className="text-foreground text-[10px] tabular-nums">{table.getState().pagination.pageIndex + 1}</span>
                <span className="opacity-30">/</span> {table.getPageCount() || 1}
            </div>

            <div className="flex items-center gap-1 p-0.5 bg-black/10 rounded-lg border border-border/10 shadow-inner">
            <button
                className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground/30 hover:text-primary hover:bg-card disabled:opacity-10 transition-all"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
            >
                <ChevronLeft size={14} />
            </button>
            <button
                className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground/30 hover:text-primary hover:bg-card disabled:opacity-10 transition-all"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
            >
                <ChevronRight size={14} />
            </button>
            </div>
            
            <select
               value={table.getState().pagination.pageSize}
               onChange={e => {
                 table.setPageSize(Number(e.target.value))
               }}
               className="h-7 px-2 rounded-lg border border-border/10 bg-black/10 text-[8px] font-black uppercase tracking-widest shadow-inner outline-none cursor-pointer hover:bg-black/20 transition-all"
            >
              {[10, 20, 50, 100].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  {pageSize} POR PÁGINA
                </option>
              ))}
            </select>
        </div>
      </div>
    </div>
  );
};
