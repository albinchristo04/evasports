import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  error?: string;
  Icon?: React.ElementType;
  as?: 'input' | 'textarea'; // To specify if it should be an input or textarea
}

const Input: React.FC<InputProps> = ({ label, id, error, Icon, className, as = 'input', ...props }) => {
  const baseClasses = "block w-full px-4 py-2.5 rounded-md bg-neutral-dark border border-gray-600 focus:border-accent focus:ring-accent focus:outline-none placeholder-gray-500 text-neutral-text transition duration-150 ease-in-out";
  const errorClasses = "border-red-500 focus:border-red-500 focus:ring-red-500";
  const iconPadding = Icon && as === 'input' ? "pl-10" : "";

  const InputElement = as; // 'input' or 'textarea'

  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>}
      <div className="relative">
        {Icon && as === 'input' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
        )}
        <InputElement
          id={id}
          className={`${baseClasses} ${error ? errorClasses : ''} ${iconPadding} ${className} ${as === 'textarea' ? 'min-h-[100px]' : ''}`}
          {...(props as any)} // Type assertion needed due to union type of props
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default Input;