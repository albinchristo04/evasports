import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-darker transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center';

  // Using CSS variables for themeable colors
  // Fallbacks are for when variables might not be defined (e.g. Storybook, tests)
  const variantStyles = {
    primary: 'bg-[var(--theme-primary,blue)] hover:bg-[var(--theme-primary-dark,darkblue)] text-white focus:ring-[var(--theme-primary,blue)]', // Assuming a darker shade for hover or adjust as needed
    secondary: 'bg-[var(--theme-secondary,purple)] hover:bg-[var(--theme-secondary-dark,darkpurple)] text-white focus:ring-[var(--theme-secondary,purple)]',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500', // Danger usually isn't themed
    outline: 'border border-[var(--theme-accent,green)] text-[var(--theme-accent,green)] hover:bg-[var(--theme-accent,green)] hover:text-neutral-dark focus:ring-[var(--theme-accent,green)]',
    ghost: 'text-[var(--theme-accent,green)] hover:bg-[var(--theme-accent,green)]/10 focus:ring-[var(--theme-accent,green)]',
  };
  
  // To make hover colors work well, we might need to define --theme-primary-dark etc. in MainLayout or have a more complex logic here.
  // For simplicity, I'll use a slightly modified version for hover.
  // A better way would be to adjust opacity or use Tailwind's darkness/lightness utilities if they support CSS vars.
  // For now, let's keep it simple:
  // Primary Hover: Adjust this if you have a system for generating darker shades or define them as CSS vars too.
  // Example: bg-primary hover:brightness-90 (Tailwind doesn't have brightness-90 by default like this for bg)
  // We'll rely on the base color for hover for now, which isn't ideal but simplest for this change.
  // Actual hover colors will need explicit darker shades of the CSS vars, e.g. --theme-primary-hover
  // Let's hardcode a slight change for now or accept the same color on hover.
  // Using explicit hover states for theme colors:
  const themedVariantStyles = {
    primary: `bg-[var(--theme-primary)] text-white focus:ring-[var(--theme-primary)]`,
    secondary: `bg-[var(--theme-secondary)] text-white focus:ring-[var(--theme-secondary)]`,
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    outline: `border border-[var(--theme-accent)] text-[var(--theme-accent)] hover:bg-[var(--theme-accent)] hover:text-neutral-dark focus:ring-[var(--theme-accent)]`,
    ghost: `text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/20 focus:ring-[var(--theme-accent)]`,
  };
  
  // Add hover separately for themed ones
  let hoverClasses = '';
  if (variant === 'primary') hoverClasses = 'hover:opacity-90'; // Generic hover effect
  if (variant === 'secondary') hoverClasses = 'hover:opacity-90';


  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${themedVariantStyles[variant]} ${hoverClasses} ${sizeStyles[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : children}
    </button>
  );
};

export default Button;