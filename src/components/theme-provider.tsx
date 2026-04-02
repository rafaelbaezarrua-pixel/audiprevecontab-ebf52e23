import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
};

type ThemeProviderState = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    customColors: any;
    updateCustomColors: (colors: any) => Promise<void>;
    resetCustomColors: () => Promise<void>;
};

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
    customColors: null,
    updateCustomColors: async () => {},
    resetCustomColors: async () => {},
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "vite-ui-theme",
    ...props
}: ThemeProviderProps) {
    const { userData, updateThemeConfig } = useAuth();
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
    );

    // Apply main theme class (light/dark)
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");

        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
                .matches
                ? "dark"
                : "light";

            root.classList.add(systemTheme);
            return;
        }

        root.classList.add(theme);
    }, [theme]);

    // Apply custom colors from userData
    useEffect(() => {
        const root = window.document.documentElement;
        const currentMode = theme === 'system' 
            ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light')
            : theme;
        
        const customTheme = userData?.theme_config;
        
        // Clear previous custom properties if any (optional, usually overwriting is enough)
        if (!customTheme || !customTheme[currentMode]) {
            // Remove specific custom style properties if they were set
            const varsToClear = [
                '--primary', '--background', '--sidebar-background', '--card', '--accent',
                '--gradient-bg', '--foreground', '--card-foreground', 
                '--sidebar-foreground', '--primary-foreground'
            ];
            varsToClear.forEach(v => root.style.removeProperty(v));
            return;
        }

        const modeColors = customTheme[currentMode];
        Object.entries(modeColors).forEach(([key, value]) => {
            if (value) {
                const hslValue = value as string;
                root.style.setProperty(key, hslValue);

                // Auto-disable background gradient if a solid custom background is given
                if (key === '--background') {
                    root.style.setProperty('--gradient-bg', 'none');
                }

                // Autoadapt text contrast based on the Lightness (L) parameter of "H S% L%"
                if (['--primary', '--background', '--sidebar-background', '--card'].includes(key)) {
                    const parts = hslValue.split(' ');
                    if (parts.length >= 3) {
                        const lMatch = parts[2].match(/\d+/);
                        if (lMatch) {
                            const l = parseInt(lMatch[0]);
                            const isDark = l < 50;
                            // Predefined text contrast variables: Light = White, Dark = Slate 900
                            const textHsl = isDark ? '0 0% 100%' : '215 25% 15%';
                            
                            if (key === '--primary') root.style.setProperty('--primary-foreground', textHsl);
                            if (key === '--background') root.style.setProperty('--foreground', textHsl);
                            if (key === '--sidebar-background') root.style.setProperty('--sidebar-foreground', textHsl);
                            if (key === '--card') root.style.setProperty('--card-foreground', textHsl);
                        }
                    }
                }
            }
        });

    }, [userData?.theme_config, theme]);

    const value = {
        theme,
        setTheme: (theme: Theme) => {
            localStorage.setItem(storageKey, theme);
            setTheme(theme);
        },
        customColors: userData?.theme_config || {},
        updateCustomColors: async (colors: any) => {
            const currentMode = theme === 'system' 
                ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light')
                : theme;
            
            const newConfig = {
                ...(userData?.theme_config || {}),
                [currentMode]: {
                    ...(userData?.theme_config?.[currentMode] || {}),
                    ...colors
                }
            };
            await updateThemeConfig(newConfig);
        },
        resetCustomColors: async () => {
            const currentMode = theme === 'system' 
                ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light')
                : theme;
                
            const newConfig = { ...(userData?.theme_config || {}) };
            delete newConfig[currentMode];
            await updateThemeConfig(newConfig);
            
            // Immediately clear from style
            const root = window.document.documentElement;
            const varsToClear = [
                '--primary', '--background', '--sidebar-background', '--card', '--accent',
                '--gradient-bg', '--foreground', '--card-foreground', 
                '--sidebar-foreground', '--primary-foreground'
            ];
            varsToClear.forEach(v => root.style.removeProperty(v));
        }
    };

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider");

    return context;
};
