import React from "react";
import { cn } from "../../lib/utils";

export function Card({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "glass-panel rounded-3xl overflow-hidden shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)] transition-all duration-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "px-8 py-6 border-b border-white/5 bg-white/[0.01]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({ children, className, ...props }) {
  return (
    <div className={cn("px-8 py-6", className)} {...props}>
      {children}
    </div>
  );
}

export default Card;
