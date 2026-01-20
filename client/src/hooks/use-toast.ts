import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

const toasts: Toast[] = [];
let setToastsFunction: ((toasts: Toast[]) => void) | null = null;

export function useToast() {
  const [toastList, setToastList] = useState<Toast[]>(toasts);
  
  if (!setToastsFunction) {
    setToastsFunction = setToastList;
  }

  const toast = useCallback(({ title, description, variant = "default" }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { id, title, description, variant };
    
    toasts.push(newToast);
    if (setToastsFunction) {
      setToastsFunction([...toasts]);
    }

    // Remove toast after 5 seconds
    setTimeout(() => {
      const index = toasts.findIndex(t => t.id === id);
      if (index > -1) {
        toasts.splice(index, 1);
        if (setToastsFunction) {
          setToastsFunction([...toasts]);
        }
      }
    }, 5000);
  }, []);

  const dismiss = useCallback((id: string) => {
    const index = toasts.findIndex(t => t.id === id);
    if (index > -1) {
      toasts.splice(index, 1);
      if (setToastsFunction) {
        setToastsFunction([...toasts]);
      }
    }
  }, []);

  return {
    toast,
    dismiss,
    toasts: toastList
  };
}

