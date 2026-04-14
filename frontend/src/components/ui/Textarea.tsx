import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = "", rows = 4, ...props }: TextareaProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5 dark:text-slate-400">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 resize-vertical focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-brand-400 dark:focus:ring-brand-400/30 ${
          error ? "border-red-400" : "border-slate-200"
        }`}
        {...props}
      />
      {error && <p className="text-red-500 text-sm mt-1.5 dark:text-red-400">{error}</p>}
    </div>
  );
}
