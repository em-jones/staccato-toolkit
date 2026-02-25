export interface ServiceContainer<
  T extends Record<string, unknown> = Record<string, unknown>,
  TKey extends keyof T = keyof T,
  TOptions = unknown,
> {
  get: (key: TKey, resolveOpts?: TOptions) => T[TKey];
}
