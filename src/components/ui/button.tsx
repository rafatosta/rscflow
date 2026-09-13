import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

const buttonVariants = cva('button-base', {
  variants: {
    variant: {
      default: 'button-primary',
      outline: 'button-outline',
    },
    size: {
      default: 'px-4 py-2.5',
      sm: 'min-h-10 px-3 py-1.5',
      lg: 'px-8 py-3',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
