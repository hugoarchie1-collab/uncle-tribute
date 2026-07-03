import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-sans font-semibold tracking-[0.04em] transition-all duration-300 ease-smooth disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
  {
    variants: {
      variant: {
        solid: "bg-ink text-bg hover:bg-ink/90",
        accent: "bg-accent text-bg hover:bg-accent-soft",
        outline: "border border-ink/30 text-ink hover:bg-ink/5 hover:border-ink/60",
        ghost: "text-ink/70 hover:text-ink",
        link: "text-ink underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-4 text-[13px]",
        md: "h-11 px-6 text-[14px]",
        lg: "h-14 px-8 text-[13px]",
      },
      shape: {
        pill: "rounded-full",
        square: "rounded-sm",
      },
    },
    defaultVariants: {
      variant: "solid",
      size: "md",
      shape: "pill",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, shape }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
