import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  hover = false,
  glow = false,
  ...props 
}) => {
  return (
    <div 
      className={cn(
        'bg-slate-900/50 border border-slate-800 rounded-xl p-4 backdrop-blur-sm',
        hover && 'transition-all duration-300 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/10 hover:-translate-y-0.5',
        glow && 'shadow-lg shadow-primary-500/20',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;





