import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    Search
} from "lucide-react";

export function GlobalSearch() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

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
                <span className="hidden sm:inline-block">Buscar...</span>
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </button>

            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Digite uma área ou empresa..." />
                <CommandList>
                    <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
                    <CommandGroup heading="Acesso Rápido">
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
                    <CommandGroup heading="Documentação">
                        <CommandItem onSelect={() => runCommand(() => navigate("/certificados"))}>
                            <Award className="mr-2 h-4 w-4 text-primary" />
                            <span>Certificados</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/licencas"))}>
                            <Shield className="mr-2 h-4 w-4 text-primary" />
                            <span>Licenças</span>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Configurações">
                        <CommandItem onSelect={() => runCommand(() => navigate("/configuracoes"))}>
                            <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>Configurações</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    );
}
