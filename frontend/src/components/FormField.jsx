import React from "react";

export default function FormField({
  label,
  required = false,
  hint,
  error,
  children,
  className = "",
  labelFor,
}) {
  return (
    <div className={"form-field " + className}>
      {label && (
        <label htmlFor={labelFor} className="form-label">
          {label}
          {required && <span className="form-required">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <div className="form-hint">{hint}</div>}
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}


