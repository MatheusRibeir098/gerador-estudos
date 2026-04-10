import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-[#0F172A] mb-1">{label}</label>}
      <input
        className={`w-full border border-[#E2E8F0] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] outline-none ${
          error ? "border-[#EF4444]" : ""
        }`}
        {...props}
      />
      {error && <p className="text-[#EF4444] text-sm mt-1">{error}</p>}
    </div>
  );
}
