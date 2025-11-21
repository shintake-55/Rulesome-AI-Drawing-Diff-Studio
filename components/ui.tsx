import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'icon' | 'danger', active?: boolean }> = ({ 
  className, 
  variant = 'secondary', 
  active = false,
  ...props 
}) => {
  const variants = {
    primary: "bg-google-blue text-white hover:bg-google-blueHover shadow-sm border-transparent",
    secondary: "bg-white text-google-text border-google-border hover:bg-google-gray",
    icon: "p-2 bg-transparent hover:bg-google-gray text-google-subtext hover:text-google-text border-transparent rounded-full",
    danger: "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
  };

  const activeStyle = active ? "bg-google-accent text-google-blue ring-2 ring-google-blue/20 border-google-blue" : "";

  return (
    <button 
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-google-blue/20 border h-9",
        variants[variant],
        activeStyle,
        className
      )}
      {...props}
    />
  );
};

export const Slider: React.FC<{
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  unit?: string;
}> = ({ label, value, min, max, step = 1, onChange, unit }) => (
  <div className="mb-4">
    <div className="flex justify-between mb-1">
      {label && <span className="text-xs font-medium text-google-subtext uppercase tracking-wider">{label}</span>}
      <span className="text-xs font-mono text-google-text">{value.toFixed(step < 0.1 ? 3 : (step < 1 ? 1 : 0))}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-google-blue"
    />
  </div>
);

export const SectionHeader: React.FC<{ title: string; icon?: React.ReactNode }> = ({ title, icon }) => (
  <div className="flex items-center gap-2 px-4 py-3 border-b border-google-border bg-white sticky top-0 z-10">
    {icon && <span className="text-google-subtext">{icon}</span>}
    <h3 className="text-sm font-semibold text-google-text">{title}</h3>
  </div>
);

export const Badge: React.FC<{ type: string }> = ({ type }) => {
  const styles: Record<string, string> = {
    ADDED: "bg-green-100 text-green-700 border-green-200",
    REMOVED: "bg-red-100 text-red-700 border-red-200",
    MODIFIED: "bg-yellow-100 text-yellow-800 border-yellow-200",
    MOVED: "bg-blue-100 text-blue-700 border-blue-200"
  };

  const labels: Record<string, string> = {
    ADDED: "追加",
    REMOVED: "削除",
    MODIFIED: "変更",
    MOVED: "移動"
  };

  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", styles[type] || "bg-gray-100")}>
      {labels[type] || type}
    </span>
  );
};
