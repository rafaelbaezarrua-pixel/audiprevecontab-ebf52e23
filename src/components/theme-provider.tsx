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
                if (['--primary', '--background', '--sidebar-background', '--card', '--secondary', '--accent'].includes(key)) {
                    let foregroundVar = '';
                    if (key === '--primary') foregroundVar = '--primary-foreground';
                    else if (key === '--background') foregroundVar = '--foreground';
                    else if (key === '--sidebar-background') foregroundVar = '--sidebar-foreground';
                    else if (key === '--card') foregroundVar = '--card-foreground';
                    else if (key === '--secondary') foregroundVar = '--secondary-foreground';
                    else if (key === '--accent') foregroundVar = '--accent-foreground';
                    
                    // Contrast rule: L > 75% -> Dark Text, else White if L < 50%, or intermediate.
                    // For buttons (primary), we usually want 100% white unless very light.
                    const textHsl = l > 70 ? '240 10% 10%' : '0 0% 100%';
                    if (foregroundVar) root.style.setProperty(foregroundVar, textHsl);
                }

                // 2. Harmonic Borders & Muted (based on background)
                if (key === '--background') {
                    // Borders are now much more subtle (+3 in dark mode instead of +8)
                    root.style.setProperty('--border', adjustLightness(hslValue, isDark ? 3 : -8));
                    root.style.setProperty('--input', adjustLightness(hslValue, isDark ? 4 : -8));
                    root.style.setProperty('--muted', adjustLightness(hslValue, isDark ? 5 : -4));
                    root.style.setProperty('--muted-foreground', isDark ? '240 5% 70%' : '240 4% 40%');
                    
                    if (!modeColors['--secondary']) root.style.setProperty('--secondary', adjustLightness(hslValue, isDark ? 5 : -5));
                    if (!modeColors['--accent']) root.style.setProperty('--accent', adjustLightness(hslValue, isDark ? 8 : -8));
                    
                    root.style.setProperty('--glass-bg', isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)');
                    root.style.setProperty('--surface-bg', `hsl(${hslValue})`);
                }

                // 2b. Sidebar Borders (based on sidebar background)
                if (key === '--sidebar-background') {
                    const sbL = getLightness(hslValue);
                    const isSbDark = sbL < 50;
                    root.style.setProperty('--sidebar-border', adjustLightness(hslValue, isSbDark ? 3 : -6));
                    root.style.setProperty('--sidebar-accent', adjustLightness(hslValue, isSbDark ? 8 : -8));
                }

                // 3. Ring follows Primary
                if (key === '--primary') {
                    root.style.setProperty('--ring', hslValue);
                    root.style.setProperty('--sidebar-primary', hslValue);
                    root.style.setProperty('--sidebar-primary-foreground', l > 70 ? '240 10% 10%' : '0 0% 100%');
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
        
        // Always clear previous custom variables to ensure no "leaking" between modes
        const varsToClear = [
            '--primary', '--background', '--sidebar-background', '--card', '--accent',
            '--gradient-bg', '--surface-bg', '--glass-bg', '--foreground', 
            '--card-foreground', '--sidebar-foreground', '--primary-foreground', 
            '--border', '--input', '--muted', '--muted-foreground', 
            '--secondary', '--secondary-foreground', '--accent-foreground', 
            '--ring', '--sidebar-primary', '--sidebar-primary-foreground'
        ];
        varsToClear.forEach(v => root.style.removeProperty(v));

        if (!colorsToApply) return;

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
