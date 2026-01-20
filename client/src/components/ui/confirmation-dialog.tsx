import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, AlertTriangle, RotateCcw } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'delete' | 'restore' | 'permanent';
  itemName?: string;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = 'delete',
  itemName = 'item'
}: ConfirmationDialogProps) {
  
  const getIcon = () => {
    switch (type) {
      case 'restore':
        return <RotateCcw className="h-6 w-6 text-blue-600" />;
      case 'permanent':
        return <AlertTriangle className="h-6 w-6 text-red-600" />;
      default:
        return <Trash2 className="h-6 w-6 text-orange-600" />;
    }
  };

  const getButtonStyle = () => {
    switch (type) {
      case 'restore':
        return "bg-blue-600 hover:bg-blue-700 text-white";
      case 'permanent':
        return "bg-red-600 hover:bg-red-700 text-white";
      default:
        return "bg-orange-600 hover:bg-orange-700 text-white";
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            {getIcon()}
            <AlertDialogTitle className="text-lg font-semibold">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-gray-600 leading-relaxed">
            {description}
          </AlertDialogDescription>
          
          {type === 'permanent' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-semibold text-red-800">
                  Warning: This action cannot be undone
                </span>
              </div>
              <p className="text-xs text-red-700 mt-1">
                The item will be permanently removed from the system and cannot be recovered.
              </p>
            </div>
          )}
          
          {itemName && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-3">
              <span className="text-sm font-medium text-gray-700">Item: </span>
              <span className="text-sm text-gray-900">{itemName}</span>
            </div>
          )}
        </AlertDialogHeader>
        
        <AlertDialogFooter className="gap-2 pt-4">
          <AlertDialogCancel 
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={getButtonStyle()}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}