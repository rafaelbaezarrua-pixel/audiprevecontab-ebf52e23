const fs = require('fs');
const path = 'c:\\Users\\rafae\\OneDrive\\Desktop\\sistema\\audiprevecontab-ebf52e23\\src\\pages\\VencimentosPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update KPI Stats Grid
content = content.replace(
  /<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">[\s\S]*?<\/div>/,
  `<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { key: "vencido", label: "Expirados", count: counts.vencido, cls: "text-rose-500", bg: "bg-rose-500/10", icon: <AlertTriangle size={18} /> },
          { key: "próximo", label: "Vence Logo", count: counts.proximo, cls: "text-amber-500", bg: "bg-amber-500/10", icon: <Clock size={18} /> },
          { key: "em dia", label: "Vigentes", count: counts.emDia, cls: "text-emerald-500", bg: "bg-emerald-500/10", icon: <CheckCircle size={18} /> }
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={\`group bg-black/10 dark:bg-white/5 border rounded-2xl h-16 flex items-center justify-between px-6 transition-all duration-300 shadow-inner \${filter === s.key ? "border-primary/50 shadow-xl shadow-primary/10 ring-1 ring-primary/20 bg-card" : "border-border/10 hover:border-border/30 hover:bg-black/20"}\`}
          >
            <div className="text-left flex items-center gap-4">
               <div className={\`w-10 h-10 rounded-xl flex items-center justify-center \${s.bg} \${s.cls} shadow-sm group-hover:scale-110 transition-transform duration-300\`}>
                 {s.icon}
               </div>
               <div>
                  <p className="text-[8px] text-muted-foreground/50 uppercase font-black tracking-widest\">\${s.label}</p>
                  <p className={\`text-[16px] font-black tracking-tight \${filter === s.key ? s.cls : 'text-foreground'}\`}>\${s.count}</p>
               </div>
            </div>
          </button>
        ))}
      </div>`
);

// Update Enhanced Filters Section
content = content.replace(
  /<div className="flex flex-col lg:flex-row gap-4 items-center">[\s\S]*?<button[\s\S]*?RESTAURAR[\s\S]*?<\/button>[\s\S]*?<\/div>[\s\S]*?<\/div>/,
  `<div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full group">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="PESQUISAR CLIENTE OU VENCIMENTO..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-12 pr-6 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-inner placeholder:text-muted-foreground/30"
          />
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full md:w-56 h-10 px-4 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-foreground focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-inner appearance-none cursor-pointer"
          >
            <option value="todos">TUDO</option>
            <option value="certificado">CERTIFICADOS DIGITAIS</option>
            <option value="licença">LICENÇAS DE FUNCIONAMENTO</option>
            <option value="taxa">TAXAS E EMOLUMENTOS</option>
            <option value="certidão">CERTIDÕES NEGATIVAS</option>
            <option value="procuração">PROCURAÇÕES</option>
          </select>

          <button
            onClick={() => {setFilter("todos"); setCategoryFilter("todos"); setSearch("");}}
            className="h-10 px-6 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all bg-black/10 dark:bg-white/5 text-muted-foreground/50 hover:bg-black/20 hover:text-foreground border border-border/10 shadow-inner"
            title="Limpar Filtros"
          >
            Limpar
          </button>
        </div>
      </div>`
);

// Final fix for situation tabs if they are still broken
// I'll use a more targeted approach for the buttons inside Situation Tabs
content = content.replace(
    /px-8 py-3 rounded-xl text-\[10px\] font-black uppercase tracking-widest transition-all whitespace-nowrap \$\{activeStatusTab === tab\.key \? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card\/50"\}\`/g,
    'px-6 h-full rounded-md text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeStatusTab === tab.key ? "bg-card text-primary shadow-sm" : "text-muted-foreground/40 hover:text-foreground"}`'
);

fs.writeFileSync(path, content);
console.log('Successfully updated VencimentosPage.tsx');
