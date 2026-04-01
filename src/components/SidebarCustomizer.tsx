import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { 
  GripVertical, Edit2, Check, X, RotateCcw, 
  EyeOff, Eye, Hash, LayoutDashboard, Settings
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_NAV_ITEMS, NavItemConfig } from "@/constants/navigation";
import { toast } from "sonner";

interface SidebarItemConfig {
  id: string;
  label: string;
  section: string;
  hidden?: boolean;
}

export const SidebarCustomizer: React.FC = () => {
  const { userData, updateSidebarConfig } = useAuth();
  const [items, setItems] = useState<SidebarItemConfig[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ label: "", section: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Initialize items from user config or defaults
    const config = userData?.sidebar_config || [];
    const defaultItems = DEFAULT_NAV_ITEMS.map(item => ({
      id: item.id,
      label: item.label,
      section: item.section || "",
      hidden: false
    }));

    if (config.length === 0) {
      setItems(defaultItems);
    } else {
      // Merge: keeping user order and adding new default items
      const merged = [...config];
      defaultItems.forEach(dItem => {
        if (!merged.find(m => m.id === dItem.id)) {
          merged.push(dItem);
        }
      });
      // Remove items that no longer exist in DEFAULT_NAV_ITEMS
      const filtered = merged.filter(m => defaultItems.find(d => d.id === m.id));
      setItems(filtered);
    }
  }, [userData?.sidebar_config]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    
    setItems(newItems);
  };

  const handleToggleHidden = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, hidden: !item.hidden } : item
    ));
  };

  const startEditing = (item: SidebarItemConfig) => {
    setEditingId(item.id);
    setEditForm({ label: item.label, section: item.section });
  };

  const saveEdit = () => {
    setItems(prev => prev.map(item => 
      item.id === editingId ? { ...item, label: editForm.label, section: editForm.section } : item
    ));
    setEditingId(null);
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await updateSidebarConfig(items);
      toast.success("Menu personalizado com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar personalização.");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    const defaultItems = DEFAULT_NAV_ITEMS.map(item => ({
      id: item.id,
      label: item.label,
      section: item.section || "",
      hidden: false
    }));
    setItems(defaultItems);
    toast.info("Configurações resetadas. Clique em salvar para confirmar.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-card-foreground">Personalizar Barra Lateral</h3>
          <p className="text-sm text-muted-foreground">Arraste para reordenar e clique para editar nomes e seções.</p>
        </div>
        <button 
          onClick={resetToDefault}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg bg-muted/20"
        >
          <RotateCcw size={14} /> Restaurar Padrão
        </button>
      </div>

      <div className="bg-muted/10 border border-border rounded-2xl p-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="sidebar-items">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className="space-y-2"
              >
                {items.map((item, index) => {
                  const isEditing = editingId === item.id;
                  const icon = DEFAULT_NAV_ITEMS.find(d => d.id === item.id)?.icon || <Hash size={18} />;

                  return (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`
                            group flex items-center gap-3 p-3 bg-card border rounded-xl transition-all
                            ${snapshot.isDragging ? "shadow-2xl ring-2 ring-primary border-primary z-50 rotate-1 scale-105" : "border-border hover:border-primary/30"}
                            ${item.hidden ? "opacity-50 grayscale" : ""}
                          `}
                        >
                          <div {...provided.dragHandleProps} className="text-muted-foreground/40 group-hover:text-primary transition-colors cursor-grab active:cursor-grabbing">
                            <GripVertical size={20} />
                          </div>

                          <div className={`p-2 rounded-lg ${item.hidden ? "bg-muted" : "bg-primary/10 text-primary"}`}>
                            {icon}
                          </div>

                          {isEditing ? (
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in slide-in-from-left-2 duration-300">
                              <input 
                                value={editForm.label} 
                                onChange={e => setEditForm({ ...editForm, label: e.target.value })}
                                className="px-3 py-1.5 text-sm bg-background border border-primary rounded-lg outline-none ring-2 ring-primary/20"
                                placeholder="Nome do Módulo"
                                autoFocus
                              />
                              <input 
                                value={editForm.section} 
                                onChange={e => setEditForm({ ...editForm, section: e.target.value.toUpperCase() })}
                                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-background border border-border rounded-lg outline-none"
                                placeholder="Seção (ex: GERAL)"
                              />
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col justify-center min-w-0">
                              <span className="text-sm font-bold truncate pr-2">{item.label}</span>
                              {item.section && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{item.section}</span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isEditing ? (
                              <>
                                <button onClick={saveEdit} className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors">
                                  <Check size={18} />
                                </button>
                                <button onClick={() => setEditingId(null)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                                  <X size={18} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEditing(item)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                                  <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleToggleHidden(item.id)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                                  {item.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleUpdate} 
          disabled={saving} 
          className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all border-b-4 border-primary-foreground/20"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={18} />}
          {saving ? "Salvando..." : "Confirmar Alterações"}
        </button>
      </div>
    </div>
  );
};
