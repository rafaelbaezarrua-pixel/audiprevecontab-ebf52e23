import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, ChevronLeft, ChevronRight, Check, MousePointer2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configurar o worker do PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfSignPositionerProps {
    fileUrl: string;
    onSelection: (data: { x: number; y: number; pageIndex: number }) => void;
    onCancel: () => void;
}

const PdfSignPositioner: React.FC<PdfSignPositionerProps> = ({ fileUrl, onSelection, onCancel }) => {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    const handlePageClick = (event: React.MouseEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Salvar posição relativa (percentual) para converter depois
        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;
        
        setPosition({ x: xPercent, y: yPercent });
    };

    const handleConfirm = () => {
        if (!position) return;
        onSelection({
            x: position.x,
            y: position.y,
            pageIndex: pageNumber - 1
        });
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 rounded-lg overflow-hidden border border-border shadow-2xl">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg border border-white/5">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                            disabled={pageNumber <= 1}
                            className="text-white hover:bg-white/10 h-8 w-8"
                        >
                            <ChevronLeft size={18} />
                        </Button>
                        <span className="text-xs font-bold text-white min-w-[60px] text-center">
                            {pageNumber} / {numPages || '?'}
                        </span>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                            disabled={pageNumber >= numPages}
                            className="text-white hover:bg-white/10 h-8 w-8"
                        >
                            <ChevronRight size={18} />
                        </Button>
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold hidden sm:block">
                        Clique no local da assinatura
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" className="text-white hover:bg-white/5 text-xs font-bold" onClick={onCancel}>
                        CANCELAR
                    </Button>
                    <Button 
                        onClick={handleConfirm} 
                        disabled={!position}
                        className="bg-primary hover:bg-primary/90 text-white font-bold text-xs px-6"
                    >
                        {position ? <Check className="mr-2 h-4 w-4" /> : <MousePointer2 className="mr-2 h-4 w-4" />}
                        {position ? "CONFIRMAR LOCAL" : "SELECIONE LOCAL"}
                    </Button>
                </div>
            </div>

            {/* Viewport */}
            <div className="flex-1 overflow-auto p-8 flex justify-center bg-slate-950/50 scrollbar-thin scrollbar-thumb-white/10" ref={containerRef}>
                <div className="relative shadow-2xl transition-transform duration-300 transform-gpu hover:scale-[1.01]">
                    <Document
                        file={fileUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={
                            <div className="flex flex-col items-center justify-center p-20 gap-4">
                                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                <span className="text-slate-400 text-sm font-medium">Renderizando PDF...</span>
                            </div>
                        }
                    >
                        <div className="relative group cursor-crosshair" onClick={handlePageClick}>
                            <Page 
                                pageNumber={pageNumber} 
                                renderAnnotationLayer={false} 
                                renderTextLayer={false}
                                className="border border-white/10" 
                            />
                            
                            {/* Overlay de Seleção */}
                            {position && (
                                <div 
                                    className="absolute w-40 h-20 border-2 border-primary bg-primary/20 backdrop-blur-[2px] transition-all flex flex-col items-center justify-center pointer-events-none -translate-x-1/2 -translate-y-1/2 ring-4 ring-primary/30"
                                    style={{ left: `${position.x}%`, top: `${position.y}%` }}
                                >
                                    <div className="absolute -top-3 -right-3 bg-primary text-white rounded-full p-1 shadow-lg ring-2 ring-white">
                                        <Check size={12} />
                                    </div>
                                    <span className="text-[10px] font-black text-white drop-shadow-md uppercase tracking-tight">Selo de Assinatura</span>
                                    <span className="text-[8px] text-white/80 font-medium pb-2">Audipreve Contabilidade</span>
                                </div>
                            )}

                            {/* Dica visual pairando */}
                            {!position && (
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <div className="flex flex-col items-center gap-2">
                                        <MousePointer2 className="w-8 h-8 text-white/50 animate-bounce" />
                                        <span className="text-white/50 text-xs font-bold bg-black/50 px-3 py-1 rounded-full uppercase tracking-widest">Clique para Posicionar</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Document>
                </div>
            </div>
        </div>
    );
};

export default PdfSignPositioner;
