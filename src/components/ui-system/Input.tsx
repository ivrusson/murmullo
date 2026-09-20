import * as React from 'react';
import { Input as BaseInput } from '@base-ui/react/input';
import * as stylex from '@stylexjs/stylex';
import { color, radius, space, motion } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  input: {
    display: 'flex',
    height: 40,
    width: '100%',
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'solid',
    backgroundColor: color.surface,
    paddingInline: space.md,
    paddingBlock: space.sm,
    fontSize: 14,
    color: {
      default: color.ink,
      '::placeholder': color.muted,
    },
    transitionProperty: 'border-color, box-shadow',
    transitionDuration: motion.fast,
    outline: 'none',
    borderColor: {
      default: color.line,
      ':focus': color.iris,
    },
    boxShadow: {
      default: 'none',
      ':focus': '0 0 0 2px rgba(138, 127, 214, 0.25)',
    },
    cursor: {
      default: 'auto',
      ':disabled': 'not-allowed',
    },
    opacity: {
      default: 1,
      ':disabled': 0.5,
    },
  },
});

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof BaseInput>
>(({ className, type, ...props }, ref) => {
  const x = sx(styles.input);
  return (
    <BaseInput
      type={type}
      ref={ref}
      {...props}
      className={[
        x.className,
        typeof className === 'string' ? className : undefined,
      ]
        .filter(Boolean)
        .join(' ')}
      style={x.style}
    />
  );
});
Input.displayName = 'Input';

export { Input };
