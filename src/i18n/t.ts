export type TranslateParams = Record<string, string | number>;

export type MessageLeaf = string | { one: string; other: string };

export type MessageTree = {
  [key: string]: MessageLeaf | MessageTree;
};

export type MessageKey<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends { one: string; other: string }
      ? K
      : T[K] extends Record<string, unknown>
        ? `${K}.${MessageKey<T[K]>}`
        : never;
}[keyof T & string];

export function interpolate(
  template: string,
  params?: TranslateParams
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value === undefined ? match : String(value);
  });
}

function getByPath(tree: MessageTree, path: string): MessageLeaf | undefined {
  const parts = path.split('.');
  let current: MessageLeaf | MessageTree | undefined = tree;
  for (const part of parts) {
    if (!current || typeof current === 'string' || 'one' in current) {
      return undefined;
    }
    current = current[part];
  }
  if (typeof current === 'string') return current;
  if (current && typeof current === 'object' && 'one' in current) {
    return current as { one: string; other: string };
  }
  return undefined;
}

export function translate(
  tree: MessageTree,
  key: string,
  params?: TranslateParams
): string {
  const leaf = getByPath(tree, key);
  if (typeof leaf === 'string') {
    return interpolate(leaf, params);
  }
  if (leaf && typeof leaf === 'object' && 'one' in leaf) {
    const count =
      typeof params?.count === 'number'
        ? params.count
        : typeof params?.n === 'number'
          ? params.n
          : Number(params?.count ?? params?.n ?? 1);
    const template = count === 1 ? leaf.one : leaf.other;
    return interpolate(template, params);
  }
  return key;
}
