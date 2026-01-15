import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        bg-slate-900/60 
        backdrop-blur-md 
        border border-slate-800 
        rounded-xl 
        p-6 
        shadow-lg 
        hover:border-primary-500/50 
        hover:shadow-primary-500/10 
        transition-all 
        duration-300
        ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
