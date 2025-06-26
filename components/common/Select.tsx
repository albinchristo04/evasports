
import React from 'react'; // React.ChangeEventHandler, React.SelectHTMLAttributes also implicitly imported

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
  placeholder?: string; // Custom prop for the first disabled option
  className?: string; // Added className prop
}

const Select: React.FC<SelectProps> = ({ label, id, error, options, className, placeholder, ...restProps }) => {
  const baseClasses = "block w-full pl-3 pr-10 py-2.5 rounded-md bg-neutral-dark border border-gray-600 focus:border-accent focus:ring-accent focus:outline-none text-neutral-text sm:text-sm transition duration-150 ease-in-out";
  const errorClasses = "border-red-500 focus:border-red-500 focus:ring-red-500";

  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>}
      <select
        id={id}
        className={`${baseClasses} ${error ? errorClasses : ''} ${className || ''}`} // Applied className
        {...restProps} // Spread remaining props, excluding placeholder
        // Set value to ensure controlled component if value is passed in restProps
        // If placeholder is active and no value is selected, the select should show the placeholder
        value={restProps.value !== undefined ? restProps.value : (placeholder ? "" : undefined)}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default Select;