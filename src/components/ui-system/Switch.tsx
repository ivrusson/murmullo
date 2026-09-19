import * as React from 'react';
import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { color, radius, motion } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  root: {
    display: 'inline-flex',
    height: 24,
    width: 44,
    flexShrink: 0,
    cursor: 'pointer',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'transparent',
    transitionProperty: 'background-color',
    transitionDuration: motion.fast,
    outline: 'none',
    backgroundColor: color.raised,
    padding: 0,
  },
  rootOn: {
    backgroundColor: color.ink,
  },
  thumb: {
    pointerEvents: 'none',
    display: 'block',
    height: 20,
    width: 20,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transitionProperty: 'transform',
    transitionDuration: motion.fast,
    transform: 'translateX(0)',
  },
  thumbOn: {
    transform: 'translateX(20px)',
  },
});

const Switch = React.forwardRef<HTMLElement, SwitchPrimitive.Root.Props>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <SwitchPrimitive.Root
        {...props}
        ref={ref}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={state => {
          const x = sx(styles.root, state.checked && styles.rootOn);
          const extra =
            typeof className === 'function' ? className(state) : className;
          return [x.className, extra].filter(Boolean).join(' ');
        }}
        style={state => sx(styles.root, state.checked && styles.rootOn).style}
      >
        <SwitchPrimitive.Thumb
          className={state =>
            sx(styles.thumb, state.checked && styles.thumbOn).className
          }
          style={state =>
            sx(styles.thumb, state.checked && styles.thumbOn).style
          }
        />
      </SwitchPrimitive.Root>
    );
  }
);
Switch.displayName = 'Switch';

export { Switch };
