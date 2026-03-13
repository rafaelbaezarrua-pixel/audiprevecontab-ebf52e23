import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Building2,
    Users,
    Award,
    Shield,
    Calendar,
    FileText,
    Settings,
    Search,
    Briefcase
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export function GlobalSearch() {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    // Buscar empresas dinamicamente com base no input
    const { data: searchResults, isLoading } = useQuery({
        queryKey: ["globalSearch", searchTerm],
        queryFn: async () => {
            if (!searchTerm || searchTerm.length < 2) return [];
            
            // Busca por NOME ou CNPJ
            const { data, error } = await supabase
                .from("empresas")
                .select("id, nome_empresa, cnpj, situacao")
                .or(`nome_empresa.ilike.%${searchTerm}%,cnpj.ilike.%${searchTerm}%`)
                .limit(5);

            if (error) {
                console.error("Erro na busca global:", error);
                return [];
            }
            return data || [];
        },
        enabled: open && searchTerm.length >= 2,
    });

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 hover:bg-muted border border-border rounded-lg transition-colors group"
            >
                <Search size={16} className="group-hover:text-primary transition-colors" />
                <span className="hidden sm:inline-block">Pesquisa Global...</span>
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">Ctrl</span>+ K
                </kbd>
            </button>

            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput 
                    placeholder="Digite um CNPJ, Empresa ou Módulo..." 
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                />
                <CommandList>
                    <CommandEmpty>
                        {isLoading ? "Buscando..." : "Nenhum resultado encontrado."}
                    </CommandEmpty>

                    {/* Resultados Dinâmicos: Empresas */}
                    {searchResults && searchResults.length > 0 && (
                        <CommandGroup heading="Empresas Localizadas">
                            {searchResults.map((emp) => (
                                <CommandItem 
                                    key={emp.id} 
                                    onSelect={() => runCommand(() => navigate(`/societario/${emp.id}`))}
                                >
                                    <Briefcase className="mr-2 h-4 w-4 text-primary" />
                                    <div className="flex flex-col">
                                        <span className="font-bold">{emp.nome_empresa}</span>
                                        <span className="text-xs text-muted-foreground">CNPJ: {emp.cnpj || "N/A"} • Situação: {emp.situacao?.toUpperCase()}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    {searchResults && searchResults.length > 0 && <CommandSeparator />}

                    {/* Módulos do Sistema */}
                    <CommandGroup heading="Acesso Rápido - Departamentos">
                        <CommandItem onSelect={() => runCommand(() => navigate("/societario"))}>
                            <Building2 className="mr-2 h-4 w-4 text-primary" />
                            <span>Societário</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/fiscal"))}>
                            <FileText className="mr-2 h-4 w-4 text-primary" />
                            <span>Fiscal</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/pessoal"))}>
                            <Users className="mr-2 h-4 w-4 text-primary" />
                            <span>Pessoal</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/agendamentos"))}>
                            <Calendar className="mr-2 h-4 w-4 text-primary" />
                            <span>Agendamentos</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />
                    
                    <CommandGroup heading="Documentação e Controles">
                        <CommandItem onSelect={() => runCommand(() => navigate("/certificados"))}>
                            <Award className="mr-2 h-4 w-4 text-primary" />
                            <span>Certificados Digitais</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/licencas"))}>
                            <Shield className="mr-2 h-4 w-4 text-primary" />
                            <span>Licenças e Alvarás</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/relatorios"))}>
                            <FileText className="mr-2 h-4 w-4 text-primary" />
                            <span>Relatórios Personalizados</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />
                    
                    <CommandGroup heading="Admnistração">
                        <CommandItem onSelect={() => runCommand(() => navigate("/configuracoes"))}>
                            <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>Configurações do Sistema</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    );
}
