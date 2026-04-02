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
    const { theme, customColors, updateCustomColors, resetCustomColors } = useTheme();
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
    // These are approximations of the defaults in index.css
    const defaults: any = {
        light: {
            '--primary': '217 91% 60%',
            '--background': '210 20% 98%',
            '--sidebar-background': '0 0% 100%',
            '--card': '0 0% 100%',
        },
        dark: {
            '--primary': '217 91% 60%',
            '--background': '222 47% 11%',
            '--sidebar-background': '222 47% 11%',
            '--card': '215 28% 17%',
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
                light: { '--primary': '300 59% 25%', '--background': '300 10% 98%', '--sidebar-background': '0 0% 100%', '--card': '0 0% 100%' },
                dark: { '--primary': '300 59% 25%', '--background': '300 30% 12%', '--sidebar-background': '300 30% 15%', '--card': '300 25% 20%' }
            }
        },
        {
            name: "Fern Green",
            color: "bg-[#4F7942]",
            config: {
                light: { '--primary': '106 29% 37%', '--background': '106 10% 98%', '--sidebar-background': '0 0% 100%', '--card': '0 0% 100%' },
                dark: { '--primary': '106 29% 37%', '--background': '106 30% 10%', '--sidebar-background': '106 25% 15%', '--card': '106 20% 20%' }
            }
        },
        {
            name: "Pôr do Sol",
            color: "bg-orange-500",
            config: {
                light: { '--primary': '24 90% 55%', '--background': '30 10% 98%', '--sidebar-background': '0 0% 100%', '--card': '0 0% 100%' },
                dark: { '--primary': '24 90% 55%', '--background': '24 30% 12%', '--sidebar-background': '24 30% 16%', '--card': '24 25% 20%' }
            }
        },
        {
            name: "Lavanda Pastel",
            color: "bg-[#B19CD9]",
            config: {
                light: { '--primary': '260 40% 65%', '--background': '260 15% 98%', '--sidebar-background': '0 0% 100%', '--card': '0 0% 100%' },
                dark: { '--primary': '260 40% 65%', '--background': '260 20% 12%', '--sidebar-background': '260 20% 15%', '--card': '260 15% 18%' }
            }
        },
        {
            name: "Menta Pastel",
            color: "bg-[#98FF98]",
            config: {
                light: { '--primary': '140 50% 60%', '--background': '140 15% 98%', '--sidebar-background': '0 0% 100%', '--card': '0 0% 100%' },
                dark: { '--primary': '140 50% 60%', '--background': '140 20% 10%', '--sidebar-background': '140 20% 14%', '--card': '140 15% 18%' }
            }
        },
        {
            name: "Pêssego Pastel",
            color: "bg-[#FFDAB9]",
            config: {
                light: { '--primary': '20 70% 65%', '--background': '20 15% 98%', '--sidebar-background': '0 0% 100%', '--card': '0 0% 100%' },
                dark: { '--primary': '20 70% 65%', '--background': '20 20% 12%', '--sidebar-background': '20 20% 15%', '--card': '20 15% 18%' }
            }
        },
        {
            name: "Oceano Pastel",
            color: "bg-[#AEC6CF]",
            config: {
                light: { '--primary': '200 40% 65%', '--background': '200 15% 98%', '--sidebar-background': '0 0% 100%', '--card': '0 0% 100%' },
                dark: { '--primary': '200 40% 65%', '--background': '200 25% 12%', '--sidebar-background': '200 25% 15%', '--card': '200 20% 18%' }
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
        setLocalColors((prev: any) => ({
            ...prev,
            [mode]: {
                ...(prev[mode] || {}),
                [variable]: hslValue
            }
        }));
    };

    const handleApplyPreset = async (presetConfig: any) => {
        setLocalColors(presetConfig);
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
