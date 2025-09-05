import * as React from "react";

const variantToClass = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  outline: "btn-outline",
};

export const Button = React.forwardRef(
  ({ className = "", variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={(variantToClass[variant] || variantToClass.primary) + (className ? " " + className : "")}
      {...props}
    />
  )
);
Button.displayName = "Button";

export default Button;
