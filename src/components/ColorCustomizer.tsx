import React, { useState, useEffect } from "react";
import { Palette, RotateCcw, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "./theme-provider";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { hexToHSLVariables, hslVariablesToHex } from "@/utils/color-utils";
import { toast } from "sonner";

export const ColorCustomizer: React.FC = () => {
    const { updateThemeConfig } = useAuth();
    const { theme, customColors, updateCustomColors, resetCustomColors, setPreviewColors } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    // Internal state to track changes before saving
    const [localColors, setLocalColors] = useState<any>({
        light: {
            '--primary': '',
            '--background': '',
            '--sidebar-background': '',
            '--card': '',
        },
        dark: {
            '--primary': '',
            '--background': '',
            '--sidebar-background': '',
            '--card': '',
        }
    });

    // Default CSS values (placeholders for reset or if not set)
    const defaults: any = {
        light: {
            '--primary': '211 100% 50%',
            '--background': '0 0% 98%',
            '--sidebar-background': '240 5% 96%',
            '--card': '0 0% 100%',
        },
        dark: {
            '--primary': '211 100% 56%',
            '--background': '240 6% 7%',
            '--sidebar-background': '240 6% 10%',
            '--card': '240 5% 12%',
        }
    };

    const PRESET_THEMES = [
        {
            name: "Original (Audipreve Azul)",
            color: "bg-blue-500",
            config: defaults
        },
        {
            name: "Roxo Noturno",
            color: "bg-purple-500",
            config: {
                light: { '--primary': '270 70% 50%', '--background': '270 20% 98%', '--sidebar-background': '270 10% 96%', '--card': '0 0% 100%' },
                dark: { '--primary': '270 70% 60%', '--background': '270 30% 8%', '--sidebar-background': '270 25% 12%', '--card': '270 20% 15%' }
            }
        },
        {
            name: "Fern Green (Original)",
            color: "bg-[#4F7942]",
            config: {
                light: { '--primary': '106 29% 37%', '--background': '106 10% 98%', '--sidebar-background': '106 5% 96%', '--card': '0 0% 100%' },
                dark: { '--primary': '106 29% 37%', '--background': '106 30% 10%', '--sidebar-background': '106 25% 15%', '--card': '106 20% 20%' }
            }
        },
        {
            name: "Laranja Solar",
            color: "bg-orange-500",
            config: {
                light: { '--primary': '24 95% 53%', '--background': '24 15% 98%', '--sidebar-background': '24 10% 96%', '--card': '0 0% 100%' },
                dark: { '--primary': '24 90% 58%', '--background': '24 35% 8%', '--sidebar-background': '24 30% 12%', '--card': '24 25% 16%' }
            }
        },
        {
            name: "Lavanda",
            color: "bg-indigo-400",
            config: {
                light: { '--primary': '245 58% 66%', '--background': '245 20% 99%', '--sidebar-background': '0 0% 100%', '--card': '0 0% 100%' },
                dark: { '--primary': '245 60% 70%', '--background': '245 40% 8%', '--sidebar-background': '245 35% 12%', '--card': '245 30% 15%' }
            }
        },
        {
            name: "Rosa Bubblegum",
            color: "bg-pink-500",
            config: {
                light: { '--primary': '330 81% 60%', '--background': '330 15% 99%', '--sidebar-background': '0 0% 100%', '--card': '0 0% 100%' },
                dark: { '--primary': '330 75% 65%', '--background': '330 40% 10%', '--sidebar-background': '330 35% 14%', '--card': '330 30% 18%' }
            }
        },
        {
            name: "Slate Modern",
            color: "bg-slate-700",
            config: {
                light: { '--primary': '215 25% 27%', '--background': '210 20% 98%', '--sidebar-background': '210 10% 96%', '--card': '0 0% 100%' },
                dark: { '--primary': '215 20% 80%', '--background': '222 47% 4%', '--sidebar-background': '222 47% 8%', '--card': '222 40% 12%' }
            }
        },
        {
            name: "Amora",
            color: "bg-fuchsia-700",
            config: {
                light: { '--primary': '320 70% 45%', '--background': '320 10% 98%', '--sidebar-background': '320 5% 96%', '--card': '0 0% 100%' },
                dark: { '--primary': '320 65% 55%', '--background': '320 40% 7%', '--sidebar-background': '320 35% 11%', '--card': '320 30% 15%' }
            }
        }
    ];

    useEffect(() => {
        if (customColors) {
            setLocalColors(customColors);
        }
    }, [customColors]);

    const handleColorChange = (mode: 'light' | 'dark', variable: string, hex: string) => {
        const hslValue = hexToHSLVariables(hex);
        const updatedModeColors = {
            ...(localColors[mode] || {}),
            [variable]: hslValue
        };

        setLocalColors((prev: any) => ({
            ...prev,
            [mode]: updatedModeColors
        }));

        // Apply preview instantly
        const currentMode = theme === 'system' 
            ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light')
            : theme;

        if (mode === currentMode) {
            setPreviewColors(updatedModeColors);
        }
    };

    const handleApplyPreset = async (presetConfig: any) => {
        setLocalColors(presetConfig);
        
        const currentMode = theme === 'system' 
            ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light')
            : theme;
            
        setPreviewColors(presetConfig[currentMode]);

        try {
            await updateThemeConfig(presetConfig);
            toast.success("Tema aplicado com sucesso!");
        } catch (error) {
            toast.error("Erro ao aplicar o tema.");
        }
    };

    const handleSave = async (mode: 'light' | 'dark') => {
        try {
            await updateCustomColors(localColors[mode]);
            toast.success(`Cores do modo ${mode === 'light' ? 'claro' : 'escuro'} atualizadas!`);
        } catch (error) {
            toast.error("Erro ao salvar cores.");
        }
    };

    const handleReset = async () => {
        try {
            await resetCustomColors();
            toast.success("Cores resetadas para o padrão.");
            setIsOpen(false);
        } catch (error) {
            toast.error("Erro ao resetar cores.");
        }
    };

    const renderPicker = (mode: 'light' | 'dark', label: string, variable: string) => {
        const value = localColors[mode]?.[variable] || defaults[mode][variable];
        const hex = hslVariablesToHex(value);

        return (
            <div className="flex items-center justify-between gap-4 mb-3">
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                <div className="flex items-center gap-2">
                    <div
                        className="w-6 h-6 rounded border border-border"
                        style={{ backgroundColor: hex }}
                    />
                    <input
                        type="color"
                        value={hex}
                        onChange={(e) => handleColorChange(mode, variable, e.target.value)}
                        className="w-8 h-8 p-0 border-0 bg-transparent cursor-pointer"
                    />
                </div>
            </div>
        );
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors relative"
                    title="Personalizar Cores"
                >
                    <Palette size={18} className="text-muted-foreground" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 overflow-hidden shadow-2xl border-border/50" align="end">
                <div className="p-4 border-b border-border bg-muted/30">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                        <Palette size={16} className="text-primary" />
                        Personalizar Sistema
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1">
                        Defina suas cores preferidas para cada modo.
                    </p>
                </div>

                <div className="p-4 border-b border-border bg-background">
                    <span className="text-xs font-semibold mb-3 block text-muted-foreground">Temas Prontos</span>
                    <div className="grid grid-cols-4 gap-3">
                        {PRESET_THEMES.map(t => (
                            <button
                                key={t.name}
                                title={t.name}
                                onClick={() => handleApplyPreset(t.config)}
                                className={`w-8 h-8 rounded-full shadow-md border border-border/50 hover:scale-110 transition-transform mx-auto ${t.color}`}
                            />
                        ))}
                    </div>
                </div>

                <Tabs defaultValue="light" className="w-full">
                    <TabsList className="w-full rounded-none h-10 bg-muted/20">
                        <TabsTrigger value="light" className="flex-1 text-xs">Modo Claro</TabsTrigger>
                        <TabsTrigger value="dark" className="flex-1 text-xs">Modo Escuro</TabsTrigger>
                    </TabsList>

                    <div className="p-4">
                        <TabsContent value="light" className="m-0 mt-2">
                            {renderPicker('light', 'Cor Primária', '--primary')}
                            {renderPicker('light', 'Fundo Principal', '--background')}
                            {renderPicker('light', 'Barra Lateral', '--sidebar-background')}
                            {renderPicker('light', 'Cartões/Popups', '--card')}

                            <div className="mt-6 flex gap-2">
                                <Button
                                    className="flex-1 h-8 text-xs bg-primary hover:bg-primary/90"
                                    onClick={() => handleSave('light')}
                                >
                                    <Check size={14} className="mr-2" /> Salvar Claro
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="dark" className="m-0 mt-2">
                            {renderPicker('dark', 'Cor Primária', '--primary')}
                            {renderPicker('dark', 'Fundo Principal', '--background')}
                            {renderPicker('dark', 'Barra Lateral', '--sidebar-background')}
                            {renderPicker('dark', 'Cartões/Popups', '--card')}

                            <div className="mt-6 flex gap-2">
                                <Button
                                    className="flex-1 h-8 text-xs bg-primary hover:bg-primary/90"
                                    onClick={() => handleSave('dark')}
                                >
                                    <Check size={14} className="mr-2" /> Salvar Escuro
                                </Button>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                <div className="p-3 bg-muted/10 border-t border-border flex justify-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] h-7 text-muted-foreground hover:text-destructive"
                        onClick={handleReset}
                    >
                        <RotateCcw size={12} className="mr-1.5" />
                        Resetar para os padrões
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};
