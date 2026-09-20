import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';

export function sx(
  ...styles: Array<StyleXStyles | null | undefined | false>
): ReturnType<typeof stylex.props> {
  const next = styles.filter((item): item is StyleXStyles => Boolean(item));
  return stylex.props(...next);
}
