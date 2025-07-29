import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Copy, Cut, Paste, Trash2, Edit, Layers, 
  MoveUp, MoveDown, Lock, Unlock, Eye, EyeOff 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextMenuProps {
  x: number;
  y: number;
  elementId: string | null;
  onAction: (action: string, elementId?: string) => void;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x, y, elementId, onAction, onClose
}) => {
  const menuItems = [
    { id: 'edit', label: 'Edit', icon: Edit },
    { id: 'copy', label: 'Copy', icon: Copy },
    { id: 'cut', label: 'Cut', icon: Cut },
    { id: 'paste', label: 'Paste', icon: Paste },
    { type: 'separator' },
    { id: 'moveUp', label: 'Move Up', icon: MoveUp },
    { id: 'moveDown', label: 'Move Down', icon: MoveDown },
    { type: 'separator' },
    { id: 'lock', label: 'Lock', icon: Lock },
    { id: 'hide', label: 'Hide', icon: EyeOff },
    { type: 'separator' },
    { id: 'delete', label: 'Delete', icon: Trash2, destructive: true },
  ];

  const handleAction = (actionId: string) => {
    onAction(actionId, elementId || undefined);
    onClose();
  };

  return (
    <div
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[160px]"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {menuItems.map((item, index) => {
        if (item.type === 'separator') {
          return <div key={index} className="h-px bg-gray-200 my-1" />;
        }

        const Icon = item.icon!;
        return (
          <button
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              elementId={contextMenu.elementId}
              onAction={handleContextAction}
              onClose={() => setContextMenu(null)}
            />
          </>
        )}
      </div>
    </DndProvider>
  );
};key={item.id}
            onClick={() => handleAction(item.id)}
            className={cn(
              "w-full flex items-center px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
              item.destructive && "text-red-600 hover:bg-red-50"
            )}
          >
            <Icon className="h-4 w-4 mr-3" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

