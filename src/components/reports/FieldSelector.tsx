import React from "react";
import { Check, X } from "lucide-react";
import { ModuleConfig } from "@/constants/reports";

interface FieldSelectorProps {
  module: ModuleConfig;
  selectedFields: string[];
  onToggleField: (moduleId: string, fieldId: string) => void;
  onClose: () => void;
}

export const FieldSelector: React.FC<FieldSelectorProps> = ({ 
  module, selectedFields, onToggleField, onClose 
}) => {
  return (
    <div className="mt-4 p-5 bg-muted/40 rounded-2xl border border-border/50 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
          {module.icon} Campos de {module.label}
        </h4>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors">
          <X size={16} className="text-muted-foreground" />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {module.fields.map((field) => {
          const isSelected = selectedFields.includes(field.id);
          return (
            <button
              key={field.id}
              onClick={() => onToggleField(module.id, field.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                isSelected 
                  ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                  : "bg-card text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {isSelected ? <Check size={12} /> : <div className="w-3 h-3 rounded-sm border border-current opacity-30" />}
              <span className="truncate">{field.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
