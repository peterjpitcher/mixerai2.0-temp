"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";
import { Button } from "@/components/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  verificationText?: string;
  verificationRequired?: boolean;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  verificationText,
  verificationRequired = false,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default"
}: ConfirmDialogProps) {
  const [verificationInput, setVerificationInput] = React.useState("");
  const isVerified = !verificationRequired || verificationInput === verificationText;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          {variant === "destructive" && (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
            </div>
          )}
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {verificationRequired && verificationText && (
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">
              To confirm, type <span className="font-semibold">{verificationText}</span> below:
            </p>
            <input
              type="text"
              className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
              value={verificationInput}
              onChange={(e) => setVerificationInput(e.target.value)}
              placeholder="Type confirmation text"
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setVerificationInput("");
            }}
          >
            {cancelText}
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
              setVerificationInput("");
            }}
            disabled={!isVerified}
            variant={variant}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 