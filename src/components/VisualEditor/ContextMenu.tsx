// Fixed src/components/VisualEditor/ContextMenu.tsx
import React from 'react';
import { 
  Copy, Scissors as Cut, Play as Paste, Trash2, Edit, 
  MoveUp, MoveDown, Lock, EyeOff 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextMenuProps {
  x: number;
  y: number;
  elementId: string | null;
  onAction: (action: string, elementId?: string) => void;
  onClose: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  destructive?: boolean;
  type?: 'separator';
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x, y, elementId, onAction, onClose
}) => {
  const menuItems: (MenuItem | { type: 'separator' })[] = [
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

        const menuItem = item as MenuItem;
        const Icon = menuItem.icon;
        return (
          <button
            key={menuItem.id}
            onClick={() => handleAction(menuItem.id)}
            className={cn(
              "w-full flex items-center px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
              menuItem.destructive && "text-red-600 hover:bg-red-50"
            )}
          >
            <Icon className="h-4 w-4 mr-3" />
            {menuItem.label}
          </button>
        );
      })}
    </div>
  );
};