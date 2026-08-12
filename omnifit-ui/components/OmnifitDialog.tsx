import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface OmnifitDialogProps {
  title: string;
  children: React.ReactNode;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'sm:max-w-[425px]',
  md: 'sm:max-w-[500px]',
  lg: 'sm:max-w-[700px]',
  xl: 'sm:max-w-[900px]',
};

export function OmnifitDialog({
  title,
  children,
  trigger,
  open,
  onOpenChange,
  size = 'md',
}: OmnifitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={`${sizeMap[size]} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
