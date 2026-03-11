import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Home } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground animate-fade-in">
                    <div className="max-w-md text-center p-8 bg-card border border-border rounded-xl shadow-xl">
                        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={32} />
                        </div>
                        <h1 className="text-2xl font-bold mb-3">Ops! Algo deu errado.</h1>
                        <p className="text-muted-foreground mb-6 text-sm">
                            Infelizmente ocorreu um erro interno nesta tela. O problema foi registrado e nossa equipe já foi notificada.
                        </p>
                        {this.state.error && (
                            <div className="bg-muted p-3 rounded text-left mb-6 overflow-hidden">
                                <p className="text-xs font-mono text-muted-foreground break-words truncate">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}
                        <button
                            onClick={() => window.location.href = '/'}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-lg transition-all hover:bg-primary/90 hover:scale-105"
                        >
                            <Home size={18} />
                            Voltar ao Início
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
