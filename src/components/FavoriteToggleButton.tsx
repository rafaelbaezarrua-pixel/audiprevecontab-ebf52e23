import React from "react";
import { Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface FavoriteToggleButtonProps {
  moduleId: string;
}

export const FavoriteToggleButton: React.FC<FavoriteToggleButtonProps> = ({ moduleId }) => {
  const { userData, toggleFavorito } = useAuth();
  
  if (!userData) return null;

  const isFavorited = (userData.favoritos || []).includes(moduleId);

  return (
    <button
      onClick={() => toggleFavorito(moduleId)}
      className={`p-2 rounded-xl transition-all border flex items-center justify-center
        ${isFavorited 
          ? "bg-amber-100/50 border-amber-200 text-amber-500 hover:bg-amber-100" 
          : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      title={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      aria-label="Alternar Favorito"
    >
      <Star size={20} className={isFavorited ? "fill-current text-amber-500" : ""} />
    </button>
  );
};
