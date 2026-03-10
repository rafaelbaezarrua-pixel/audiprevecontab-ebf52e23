import React from "react";
import { useTheme } from "./theme-provider";
import { Sun, Moon } from "lucide-react";

export const ThemeToggle: React.FC = () => {
    const { theme, setTheme } = useTheme();

    return (
        <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors relative"
            title="Alternar Tema"
        >
            {theme === 'dark' ? (
                <Sun size={18} className="text-muted-foreground" />
            ) : (
                <Moon size={18} className="text-muted-foreground" />
            )}
        </button>
    );
};
