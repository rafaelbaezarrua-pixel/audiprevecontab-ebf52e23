import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmpresaAccordionProps {
  icon: React.ReactNode;
  nome_empresa: string;
  cnpj?: string;
  status?: string;
  statusColor?: "success" | "warning" | "danger" | "info" | "default";
  isOpen: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  customHeader?: React.ReactNode;
}

export const EmpresaAccordion: React.FC<EmpresaAccordionProps> = ({
  icon,
  nome_empresa,
  cnpj,
  status,
  statusColor = "default",
  isOpen,
  onClick,
  children,
  className,
  customHeader,
}) => {
  const getStatusClasses = () => {
    switch (statusColor) {
      case "success":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "warning":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "danger":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "info":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-black/5 dark:bg-white/5 text-muted-foreground border-border/10";
    }
  };

  return (
    <div
      className={cn(
        "module-card !p-0 overflow-hidden border-border/10 transition-all duration-300",
        isOpen ? "ring-1 ring-primary/20 bg-primary/[0.02] shadow-lg mb-4" : "hover:bg-primary/[0.02] mb-2",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between px-4 cursor-pointer group min-h-[72px]",
           !customHeader && "py-4"
        )}
        onClick={onClick}
      >
        {customHeader ? (
          <div className="flex-1 w-full">{customHeader}</div>
        ) : (
          <>
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 border",
                  isOpen
                    ? "bg-primary text-white border-primary shadow-lg"
                    : "bg-black/5 dark:bg-white/5 border-border/10 group-hover:border-primary/20 group-hover:text-primary"
                )}
              >
                {icon}
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className={cn(
                    "font-black text-[13px] uppercase tracking-tight truncate transition-colors",
                    isOpen ? "text-primary" : "text-foreground group-hover:text-primary"
                  )}
                >
                  {nome_empresa}
                </span>
                {cnpj && (
                  <span className="text-[10px] text-muted-foreground/50 font-black uppercase tracking-widest font-mono">
                    {cnpj}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0 px-2">
              {status && (
                <span
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm transition-all animate-in fade-in zoom-in-95",
                    getStatusClasses()
                  )}
                >
                  {status}
                </span>
              )}
              <div
                className={cn(
                  "p-1.5 rounded-lg transition-all duration-300 bg-black/5 dark:bg-white/5 border border-border/5",
                  isOpen ? "rotate-180 bg-primary text-primary-foreground border-primary shadow-md" : "text-muted-foreground/20"
                )}
              >
                <ChevronDown size={14} />
              </div>
            </div>
          </>
        )}
      </div>

      {isOpen && (
        <div className="animate-in slide-in-from-top-1 duration-300 border-t border-border/5">
          <div className="p-4">{children}</div>
        </div>
      )}
    </div>
  );
};
