import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export interface KanbanColumn {
    id: string;
    title: string;
    colorClass: string;
}

export interface KanbanItem {
    id: string;
    status: string;
    renderContent: () => React.ReactNode;
}

interface KanbanBoardProps {
    columns: KanbanColumn[];
    items: KanbanItem[];
    onDragEnd: (itemId: string, newStatus: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ columns, items, onDragEnd }) => {
    // We need to group items by their column (status)
    const [boardData, setBoardData] = useState<Record<string, KanbanItem[]>>({});

    useEffect(() => {
        const newBoardData: Record<string, KanbanItem[]> = {};

        // Initialize empty arrays for all columns
        columns.forEach(col => {
            newBoardData[col.id] = [];
        });

        // Distribute items into their respective columns
        items.forEach(item => {
            if (newBoardData[item.status]) {
                newBoardData[item.status].push(item);
            } else {
                // Fallback if status doesn't match any column (shouldn't happen normally)
                const firstCol = columns[0]?.id;
                if (firstCol) newBoardData[firstCol].push(item);
            }
        });

        setBoardData(newBoardData);
    }, [items, columns]);

    const handleDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;

        // Dropped outside the list
        if (!destination) return;

        // Dropped in the exact same place
        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) {
            return;
        }

        const sourceColumnId = source.droppableId;
        const destColumnId = destination.droppableId;

        // Optimistic UI update
        const newBoardData = { ...boardData };
        const sourceItems = [...newBoardData[sourceColumnId]];
        const destItems = sourceColumnId === destColumnId ? sourceItems : [...newBoardData[destColumnId]];

        // Remove from source
        const [movedItem] = sourceItems.splice(source.index, 1);

        // Update the item's status locally for immediate visual feedback
        movedItem.status = destColumnId;

        // Add to destination
        destItems.splice(destination.index, 0, movedItem);

        newBoardData[sourceColumnId] = sourceItems;
        if (sourceColumnId !== destColumnId) {
            newBoardData[destColumnId] = destItems;
        }

        setBoardData(newBoardData);

        // Call the parent callback to persist the change in the database ONLY IF it changed columns
        if (sourceColumnId !== destColumnId) {
            onDragEnd(draggableId, destColumnId);
        }
    };

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 w-full h-full overflow-x-auto pb-4 no-scrollbar items-start">
                {columns.map(column => (
                    <div
                        key={column.id}
                        className="flex-shrink-0 w-80 sm:w-[340px] flex flex-col max-h-[calc(100vh-200px)] rounded-xl bg-muted/20 border border-border"
                    >
                        {/* Column Header */}
                        <div className={`p-4 border-b border-border flex items-center justify-between rounded-t-xl ${column.colorClass}`}>
                            <h3 className="font-bold text-sm uppercase tracking-wider">{column.title}</h3>
                            <span className="bg-background/50 text-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                                {boardData[column.id]?.length || 0}
                            </span>
                        </div>

                        {/* Droppable Area */}
                        <Droppable droppableId={column.id}>
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`flex-1 p-3 overflow-y-auto space-y-3 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-muted/40' : ''
                                        }`}
                                >
                                    {boardData[column.id]?.map((item, index) => (
                                        <Draggable key={item.id} draggableId={item.id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className={`
                            rounded-xl bg-card border border-border overflow-hidden transition-all
                            ${snapshot.isDragging ? 'shadow-xl scale-[1.02] rotate-1 z-50 ring-2 ring-primary/50' : 'hover:shadow-md'}
                          `}
                                                    style={{
                                                        ...provided.draggableProps.style,
                                                    }}
                                                >
                                                    {item.renderContent()}
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                ))}
            </div>
        </DragDropContext>
    );
};

export default KanbanBoard;
