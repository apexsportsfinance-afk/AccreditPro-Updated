import React from "react";
import { cn } from "../../lib/utils";

const variants = {
  default: "bg-white/10 text-slate-300 border border-white/10",
  primary: "bg-primary-500/10 text-primary-400 border border-primary-500/20",
  success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  danger: "bg-red-500/10 text-red-400 border border-red-500/20",
  info: "bg-blue-500/10 text-blue-400 border border-blue-500/20"
};

export function Badge({ children, variant = "default", className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
        variants[variant] || variant,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
