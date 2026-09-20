import * as React from 'react';
import * as stylex from '@stylexjs/stylex';
import { color, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  alert: {
    position: 'relative',
    width: '100%',
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'solid',
    padding: space.md,
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
  },
  default: {
    backgroundColor: color.surface,
    borderColor: color.line,
    color: color.ink,
  },
  destructive: {
    backgroundColor: 'rgba(224, 131, 126, 0.05)',
    borderColor: 'rgba(224, 131, 126, 0.2)',
    color: color.danger,
  },
  title: {
    fontWeight: 600,
    lineHeight: 1.25,
    letterSpacing: '-0.01em',
    fontSize: 14,
  },
  description: {
    fontSize: 13,
    lineHeight: 1.5,
    opacity: 0.9,
  },
});

export const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'destructive' }
>(({ className, variant = 'default', style, ...props }, ref) => {
  const x = sx(styles.alert, styles[variant]);
  return (
    <div
      ref={ref}
      role="alert"
      {...props}
      className={[x.className, className].filter(Boolean).join(' ')}
      style={{ ...x.style, ...style }}
    />
  );
});
Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, style, ...props }, ref) => {
  const x = sx(styles.title);
  return (
    <h5
      ref={ref}
      {...props}
      className={[x.className, className].filter(Boolean).join(' ')}
      style={{ ...x.style, ...style }}
    />
  );
});
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, style, ...props }, ref) => {
  const x = sx(styles.description);
  return (
    <div
      ref={ref}
      {...props}
      className={[x.className, className].filter(Boolean).join(' ')}
      style={{ ...x.style, ...style }}
    />
  );
});
AlertDescription.displayName = 'AlertDescription';
