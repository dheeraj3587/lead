import React from "react";
import { LiquidButton, Button } from "@/components/ui/liquid-glass-button";

const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "danger", // 'danger' | 'warning' | 'info'
}) => {
  if (!isOpen) return null;

  const confirmVariant =
    variant === "danger"
      ? "destructive"
      : variant === "warning"
      ? "secondary"
      : "default";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600">{message}</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <Button variant="outline" onClick={onCancel}>
            {cancelText}
          </Button>
          <LiquidButton onClick={onConfirm} aria-label={confirmText}>
            {confirmText}
          </LiquidButton>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
