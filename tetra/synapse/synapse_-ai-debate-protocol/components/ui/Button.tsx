import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon,
  className = '',
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-primary hover:bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-blue-500/30",
    secondary: "bg-secondary hover:bg-purple-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)] border border-purple-500/30",
    outline: "bg-transparent border border-gray-600 text-gray-300 hover:bg-white/5 hover:border-gray-400",
    danger: "bg-danger/20 text-danger border border-danger/50 hover:bg-danger/30",
    ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-white/5",
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5 space-x-1",
    md: "text-sm px-4 py-2 space-x-2",
    lg: "text-base px-6 py-3 space-x-3",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} 
      {...props}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};