declare module 'js-yaml' {
  export function dump(
    input: unknown,
    options?: {
      noRefs?: boolean
    },
  ): string

  export function load(input: string): unknown
}
