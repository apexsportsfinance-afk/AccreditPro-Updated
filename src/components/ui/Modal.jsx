import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

const MODAL_SIZES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-6xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  className,
  light = false
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 transition-opacity duration-300 backdrop-blur-sm",
          light ? "bg-slate-900/40" : "bg-black/80"
        )}
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div 
        className={cn(
          "relative w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col",
          light ? "bg-white border-slate-200" : "bg-slate-900 border-primary-500/30",
          MODAL_SIZES[size] || MODAL_SIZES.md,
          className
        )}
        style={{ zIndex: 10001 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between px-6 py-4 border-b flex-shrink-0",
          light ? "border-slate-100 bg-slate-50/50" : "border-white/[0.05] bg-white/[0.02]"
        )}>
          {title && (
            <h2 className={cn(
              "text-xl font-bold tracking-tight",
              light ? "text-slate-900" : "text-white"
            )}>
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className={cn(
              "p-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95",
              light 
                ? "text-slate-400 hover:text-slate-600 hover:bg-slate-100" 
                : "text-slate-500 hover:text-white hover:bg-white/10"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}