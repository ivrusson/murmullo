import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { color, radius, shadow, space, motion } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    backgroundColor: color.overlay,
    backdropFilter: 'blur(8px)',
  },
  content: {
    position: 'fixed',
    left: '50%',
    top: '50%',
    zIndex: 50,
    display: 'grid',
    width: '100%',
    maxWidth: 512,
    transform: 'translate(-50%, -50%)',
    gap: space.md,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.line,
    backgroundColor: color.surface,
    padding: space.lg,
    boxShadow: shadow.hud,
    borderRadius: radius.xl,
    transitionProperty: 'opacity, transform',
    transitionDuration: motion.normal,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    textAlign: 'left',
  },
  footer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 1,
    letterSpacing: '-0.015em',
    color: color.ink,
    margin: 0,
  },
  description: {
    fontSize: 14,
    color: color.muted,
    lineHeight: 1.5,
    margin: 0,
  },
  close: {
    position: 'absolute',
    right: 16,
    top: 16,
    borderRadius: radius.pill,
    transitionProperty: 'opacity, background-color',
    transitionDuration: motion.fast,
    cursor: 'pointer',
    borderWidth: 0,
    color: color.muted,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    opacity: {
      default: 0.7,
      ':hover': 1,
    },
    backgroundColor: {
      default: 'transparent',
      ':hover': color.raised,
    },
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: 0,
  },
});

const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;
const DialogTrigger = DialogPrimitive.Trigger;

const DialogOverlay = React.forwardRef<
  HTMLDivElement,
  DialogPrimitive.Backdrop.Props
>(({ className, ...props }, ref) => {
  const x = sx(styles.overlay);
  return (
    <DialogPrimitive.Backdrop
      ref={ref}
      className={[
        x.className,
        typeof className === 'string' ? className : undefined,
      ]
        .filter(Boolean)
        .join(' ')}
      style={x.style}
      {...props}
    />
  );
});
DialogOverlay.displayName = 'DialogOverlay';

const DialogContent = React.forwardRef<
  HTMLDivElement,
  DialogPrimitive.Popup.Props
>(({ className, children, ...props }, ref) => {
  const x = sx(styles.content);
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        ref={ref}
        className={[
          x.className,
          typeof className === 'string' ? className : undefined,
        ]
          .filter(Boolean)
          .join(' ')}
        style={x.style}
        {...props}
      >
        {children}
        <DialogPrimitive.Close {...stylex.props(styles.close)}>
          <X size={16} />
          <span {...stylex.props(styles.srOnly)}>Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
});
DialogContent.displayName = 'DialogContent';

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const x = sx(styles.header);
  return (
    <div
      className={[x.className, className].filter(Boolean).join(' ')}
      style={x.style}
      {...props}
    />
  );
};
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const x = sx(styles.footer);
  return (
    <div
      className={[x.className, className].filter(Boolean).join(' ')}
      style={x.style}
      {...props}
    />
  );
};
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  DialogPrimitive.Title.Props
>(({ className, ...props }, ref) => {
  const x = sx(styles.title);
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={[
        x.className,
        typeof className === 'string' ? className : undefined,
      ]
        .filter(Boolean)
        .join(' ')}
      style={x.style}
      {...props}
    />
  );
});
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  DialogPrimitive.Description.Props
>(({ className, ...props }, ref) => {
  const x = sx(styles.description);
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={[
        x.className,
        typeof className === 'string' ? className : undefined,
      ]
        .filter(Boolean)
        .join(' ')}
      style={x.style}
      {...props}
    />
  );
});
DialogDescription.displayName = 'DialogDescription';

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
