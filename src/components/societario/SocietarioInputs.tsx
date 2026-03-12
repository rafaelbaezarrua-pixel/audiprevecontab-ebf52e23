
import React, { useEffect, useState } from "react";

interface ControlledInputProps {
  value: string;
  onBlur: (v: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
}

export const ControlledInput = ({ value, onBlur, placeholder, className, type = "text" }: ControlledInputProps) => {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => { setLocalValue(value); }, [value]);
  return (
    <input
      type={type}
      value={localValue || ''}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => { if (localValue !== value) onBlur(localValue); }}
      placeholder={placeholder}
      className={className}
    />
  );
};

interface ControlledTextareaProps {
  value: string;
  onBlur: (v: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export const ControlledTextarea = ({ value, onBlur, placeholder, className, rows }: ControlledTextareaProps) => {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => { setLocalValue(value); }, [value]);
  return (
    <textarea
      value={localValue || ''}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => { if (localValue !== value) onBlur(localValue); }}
      placeholder={placeholder}
      className={className}
      rows={rows}
    />
  );
};
