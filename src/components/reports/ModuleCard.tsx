import React from "react";
import { Check } from "lucide-react";
import { ModuleConfig } from "@/constants/reports";

interface ModuleCardProps {
  module: ModuleConfig;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({ module, isSelected, onToggle }) => {
  return (
    <button
      onClick={() => onToggle(module.id)}
      className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all h-28 ${
        isSelected 
          ? "bg-primary/10 border-primary shadow-sm" 
          : "bg-card border-border hover:border-primary/50"
      }`}
    >
      <div className={`p-2 rounded-xl mb-2 ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
        {module.icon}
      </div>
      <span className={`text-[11px] font-bold text-center leading-tight ${isSelected ? "text-primary" : "text-card-foreground"}`}>
        {module.label}
      </span>
      {isSelected && (
        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <Check size={10} className="text-primary-foreground" />
        </div>
      )}
    </button>
  );
};
