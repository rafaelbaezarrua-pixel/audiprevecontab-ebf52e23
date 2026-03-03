import React, { useState } from "react";
import { Search } from "lucide-react";

const RecalculosPage: React.FC = () => {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar recálculo..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
        </div>
      </div>

      <div className="module-card text-center py-12">
        <p className="text-muted-foreground">Módulo de Recálculos - Em desenvolvimento</p>
      </div>
    </div>
  );
};

export default RecalculosPage;
