import * as React from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import * as stylex from '@stylexjs/stylex';
import { color, radius, shadow, space, motion } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  content: {
    zIndex: 50,
    width: 288,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.line,
    backgroundColor: color.surface,
    padding: space.md,
    color: color.ink,
    boxShadow: shadow.hud,
    outline: 'none',
    transitionProperty: 'opacity, transform',
    transitionDuration: motion.fast,
  },
});

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

type PopoverContentProps = PopoverPrimitive.Popup.Props & {
  align?: PopoverPrimitive.Positioner.Props['align'];
  sideOffset?: PopoverPrimitive.Positioner.Props['sideOffset'];
};

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  (
    { className, align = 'center', sideOffset = 4, style, children, ...props },
    ref
  ) => {
    const x = sx(styles.content);
    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner align={align} sideOffset={sideOffset}>
          <PopoverPrimitive.Popup
            ref={ref}
            className={[
              x.className,
              typeof className === 'string' ? className : undefined,
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              ...x.style,
              ...(typeof style === 'object' ? style : undefined),
            }}
            {...props}
          >
            {children}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    );
  }
);
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverContent };
