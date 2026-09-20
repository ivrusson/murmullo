import * as React from 'react';
import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import * as stylex from '@stylexjs/stylex';
import { color, radius, motion } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  root: {
    width: '100%',
  },
  control: {
    position: 'relative',
    display: 'flex',
    width: '100%',
    touchAction: 'none',
    userSelect: 'none',
    alignItems: 'center',
  },
  track: {
    position: 'relative',
    height: 8,
    flexGrow: 1,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: color.raised,
  },
  range: {
    position: 'absolute',
    height: '100%',
    backgroundColor: color.iris,
  },
  thumb: {
    display: 'block',
    height: 20,
    width: 20,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: color.iris,
    outline: 'none',
    cursor: 'pointer',
    transitionProperty: 'background-color',
    transitionDuration: motion.fast,
    backgroundColor: {
      default: color.surface,
      ':hover': color.raised,
    },
  },
});

const Slider = React.forwardRef<HTMLDivElement, SliderPrimitive.Root.Props>(
  ({ className, ...props }, ref) => {
    const rootSx = sx(styles.root);
    const controlSx = sx(styles.control);
    const trackSx = sx(styles.track);
    const rangeSx = sx(styles.range);
    const thumbSx = sx(styles.thumb);

    return (
      <SliderPrimitive.Root
        ref={ref}
        {...props}
        className={[
          rootSx.className,
          typeof className === 'string' ? className : undefined,
        ]
          .filter(Boolean)
          .join(' ')}
        style={rootSx.style}
      >
        <SliderPrimitive.Control
          className={controlSx.className}
          style={controlSx.style}
        >
          <SliderPrimitive.Track
            className={trackSx.className}
            style={trackSx.style}
          >
            <SliderPrimitive.Indicator
              className={rangeSx.className}
              style={rangeSx.style}
            />
            <SliderPrimitive.Thumb
              className={thumbSx.className}
              style={thumbSx.style}
            />
          </SliderPrimitive.Track>
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
    );
  }
);
Slider.displayName = 'Slider';

export { Slider };
