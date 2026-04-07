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
          <div className="flex items-center gap-4 py-2">
            <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20 shrink-0">
              <Building2 size={22} />
            </div>
            <div className="flex flex-col">
              {isEditing ? (
                 <input
                   autoFocus
                   type="text"
                   defaultValue={emp.nome_empresa}
                   className="border-b border-primary bg-transparent outline-none text-base font-bold w-full"
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
                   className="font-black text-card-foreground group-hover:text-primary transition-colors text-base select-none truncate max-w-[200px] sm:max-w-xs cursor-text"
                   title="Dois cliques para editar"
                 >
                   {emp.nome_empresa}
                 </span>
              )}
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60 flex items-center gap-1">
                <Hash size={10} /> ID: {emp.id.split('-')[0]}
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
        <span className="text-muted-foreground font-mono text-xs">{row.original.cnpj || "—"}</span>
      )
    },
    {
      accessorKey: "regime_tributario",
      header: "Regime",
      cell: ({ row }) => {
        const val = row.original.regime_tributario;
        return (
          <span className="text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground border border-border/50 whitespace-nowrap">
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
             <span className={`badge-status ${sit.cls} shadow-sm shadow-current/5 font-black text-[10px] px-3 py-1`}>
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
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-muted/50 text-xs font-black text-card-foreground border border-border/50">
              {row.original.socios_count || 0}
            </span>
        </div>
      )
    },
    {
      id: "actions",
      header: () => <div className="text-right pr-8">Ações</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2 pr-8" onClick={(e) => e.stopPropagation()}>
           <button onClick={() => navigate(`/societario/${row.original.id}`)} className="p-3 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all border border-transparent hover:border-primary/20" title="Ver Detalhes">
             <Eye size={20} />
           </button>
           <button onClick={() => navigate(`/societario/${row.original.id}`)} className="p-3 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all border border-transparent hover:border-primary/20" title="Editar">
             <Edit2 size={20} />
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
    <div className="card-premium !p-0 overflow-hidden border-t-0 rounded-t-none flex flex-col pt-1">
      <div className="overflow-x-auto flex-1 relative min-h-[400px]">
        {isLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
        )}
        <table className="data-table w-full">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="first:rounded-tl-none whitespace-nowrap">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border/50">
            {empresas.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-24 text-muted-foreground bg-muted/5">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-6 rounded-full bg-muted/10">
                      <Building2 size={48} className="opacity-20" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-black text-xl text-card-foreground">Nenhuma empresa encontrada</p>
                      <p className="text-sm">Tente ajustar seus filtros de busca para encontrar o que procura.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr 
                  key={row.id} 
                  className="cursor-pointer group transition-all hover:bg-muted/10" 
                  onClick={() => navigate(`/societario/${row.original.id}`)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className={cell.column.id === 'nome_empresa' ? 'py-4' : ''}>
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
      <div className="flex items-center justify-between p-4 border-t border-border/50 bg-muted/10 rounded-b-xl">
        <div className="text-sm font-bold text-muted-foreground flex items-center gap-2">
            Mostrando <span className="text-foreground">{table.getRowModel().rows.length}</span> de <span className="text-foreground">{totalCount}</span>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-1 text-sm font-bold text-muted-foreground">
                <span className="text-foreground">Página {table.getState().pagination.pageIndex + 1}</span>
                <span className="text-[10px] uppercase tracking-widest">de {table.getPageCount() || 1}</span>
            </div>

            <div className="flex items-center gap-1 p-1 bg-card rounded-xl border border-border/50 shadow-sm">
            <button
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
            >
                <ChevronLeft size={18} />
            </button>
            <button
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
            >
                <ChevronRight size={18} />
            </button>
            </div>
            
            <select
               value={table.getState().pagination.pageSize}
               onChange={e => {
                 table.setPageSize(Number(e.target.value))
               }}
               className="p-2.5 rounded-lg border border-border/50 bg-card text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-primary/20"
            >
              {[10, 20, 50, 100].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  Mostrar {pageSize}
                </option>
              ))}
            </select>
        </div>
      </div>
    </div>
  );
};
