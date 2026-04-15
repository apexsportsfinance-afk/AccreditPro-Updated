import React from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

export function StatsCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-primary-400",
  change,
  changeType = "neutral",
  chart = [40, 60, 45, 70, 50, 80, 65], // Default sparkline data
  className
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "glass-panel rounded-2xl p-6 relative group overflow-hidden",
        className
      )}
    >
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1 group-hover:text-primary-400 transition-colors">{title}</p>
          <p className="text-3xl font-black text-white tracking-tighter">{value}</p>
          {change && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className={cn(
                "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                changeType === "positive" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                changeType === "negative" && "bg-red-500/10 text-red-400 border-red-500/20",
                changeType === "neutral" && "bg-slate-500/10 text-slate-500 border-slate-500/20"
              )}>
                {change}
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-primary-500/10 group-hover:border-primary-500/20 transition-all">
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>
        )}
      </div>

      {/* CSS Micro-chart (Sparkline) */}
      <div className="absolute bottom-0 left-0 right-0 h-12 opacity-30 group-hover:opacity-60 transition-opacity">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <defs>
            <linearGradient id={`grad-${title.replace(/\s+/g, '-')}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" className={iconColor} />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" className={iconColor} />
            </linearGradient>
          </defs>
          <path
            d={`M 0 100 ${chart.map((v, i) => `L ${(i / (chart.length - 1)) * 100} ${100 - v}`).join(' ')} L 100 100 Z`}
            fill={`url(#grad-${title.replace(/\s+/g, '-')})`}
            className={iconColor}
          />
          <path
            d={chart.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (chart.length - 1)) * 100} ${100 - v}`).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={iconColor}
          />
        </svg>
      </div>
    </motion.div>
  );
}

export default StatsCard;
