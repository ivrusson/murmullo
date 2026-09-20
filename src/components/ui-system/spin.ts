import * as stylex from '@stylexjs/stylex';

const spinKeyframes = stylex.keyframes({
  from: { transform: 'rotate(0deg)' },
  to: { transform: 'rotate(360deg)' },
});

export const spin = stylex.create({
  icon: {
    animationName: spinKeyframes,
    animationDuration: '1s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear',
  },
});
