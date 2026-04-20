import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
};

import { adjustLightness, getLightness } from "@/utils/color-utils";

type ThemeProviderState = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    customColors: any;
    updateCustomColors: (colors: any) => Promise<void>;
    resetCustomColors: () => Promise<void>;
    setPreviewColors: (colors: any) => void;
};

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
    customColors: null,
    updateCustomColors: async () => {},
    resetCustomColors: async () => {},
    setPreviewColors: () => {},
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
    const [previewColors, setPreviewColors] = useState<any>(null);

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

    // Function to apply a set of colors to the DOM
    const applyColorsToDOM = (modeColors: any) => {
        const root = window.document.documentElement;
        const currentMode = theme === 'system' 
            ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light')
            : theme;

        Object.entries(modeColors).forEach(([key, value]) => {
            if (value) {
                const hslValue = value as string;
                root.style.setProperty(key, hslValue);

                // Auto-disable background gradient if a custom background is given
                if (key === '--background') {
                    root.style.setProperty('--gradient-bg', 'none');
                    root.style.setProperty('--surface-bg', `hsl(${hslValue})`);
                }

                // Autoadapt accessory variables
                const l = getLightness(hslValue);
                const isDark = l < 50;

                // 1. Text Contrast (Foregrounds)
                if (['--primary', '--background', '--sidebar-background', '--card'].includes(key)) {
                    const textHsl = isDark ? '0 0% 100%' : '240 10% 10%';
                    if (key === '--primary') root.style.setProperty('--primary-foreground', textHsl);
                    if (key === '--background') root.style.setProperty('--foreground', textHsl);
                    if (key === '--sidebar-background') root.style.setProperty('--sidebar-foreground', textHsl);
                    if (key === '--card') root.style.setProperty('--card-foreground', textHsl);
                }

                // 2. Harmonic Borders & Muted (based on background)
                if (key === '--background') {
                    const borderL = isDark ? l + 8 : l - 8;
                    const mutedL = isDark ? l + 5 : l - 4;
                    root.style.setProperty('--border', adjustLightness(hslValue, isDark ? 8 : -10));
                    root.style.setProperty('--input', adjustLightness(hslValue, isDark ? 8 : -10));
                    root.style.setProperty('--muted', adjustLightness(hslValue, isDark ? 5 : -4));
                    root.style.setProperty('--muted-foreground', isDark ? '240 5% 70%' : '240 4% 40%');
                    root.style.setProperty('--secondary', adjustLightness(hslValue, isDark ? 6 : -5));
                    root.style.setProperty('--secondary-foreground', isDark ? '0 0% 100%' : '240 10% 10%');
                    root.style.setProperty('--accent', adjustLightness(hslValue, isDark ? 10 : -8));
                    root.style.setProperty('--accent-foreground', isDark ? '0 0% 100%' : '240 10% 10%');
                    
                    // Sidebar accent harmony
                    root.style.setProperty('--sidebar-accent', adjustLightness(hslValue, isDark ? 12 : -6));
                    root.style.setProperty('--sidebar-border', adjustLightness(hslValue, isDark ? 8 : -8));
                    
                    // Glassmorphism update
                    root.style.setProperty('--glass-bg', isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)');
                }

                // 3. Ring follows Primary
                if (key === '--primary') {
                    root.style.setProperty('--ring', hslValue);
                    root.style.setProperty('--sidebar-primary', hslValue);
                }
            }
        });
    };

    // Apply colors from userData OR preview
    useEffect(() => {
        const root = window.document.documentElement;
        const currentMode = theme === 'system' 
            ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light')
            : theme;
        
        const colorsToApply = previewColors || userData?.theme_config?.[currentMode];
        
        if (!colorsToApply) {
            const varsToClear = [
                '--primary', '--background', '--sidebar-background', '--card', '--accent',
                '--gradient-bg', '--foreground', '--card-foreground', 
                '--sidebar-foreground', '--primary-foreground', '--border', '--input',
                '--muted', '--muted-foreground', '--secondary', '--secondary-foreground',
                '--accent-foreground', '--ring', '--sidebar-primary'
            ];
            varsToClear.forEach(v => root.style.removeProperty(v));
            return;
        }

        applyColorsToDOM(colorsToApply);
    }, [userData?.theme_config, theme, previewColors]);

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
            setPreviewColors(null); // Clear preview when saving
            await updateThemeConfig(newConfig);
        },
        setPreviewColors: (colors: any) => {
            setPreviewColors(colors);
        },
        resetCustomColors: async () => {
            const currentMode = theme === 'system' 
                ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light')
                : theme;
                
            const newConfig = { ...(userData?.theme_config || {}) };
            delete newConfig[currentMode];
            setPreviewColors(null);
            await updateThemeConfig(newConfig);
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
