import React from 'react';

interface IconButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'active' | 'orange' | 'blue';
  title?: string;
  disabled?: boolean;
  className?: string;
}

export function IconButton({ 
  onClick, 
  children, 
  variant = 'default', 
  title, 
  disabled = false,
  className = '' 
}: IconButtonProps) {
  const baseClasses = "p-2 rounded-lg transition-colors";
  
  const variantClasses = {
    default: 'text-gray-400 hover:bg-gray-700/50',
    active: 'bg-blue-100/10 text-blue-400 hover:bg-blue-100/20',
    orange: 'bg-orange-100/10 text-orange-400 hover:bg-orange-100/20',
    blue: 'bg-blue-100/10 text-blue-400 hover:bg-blue-100/20'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
}