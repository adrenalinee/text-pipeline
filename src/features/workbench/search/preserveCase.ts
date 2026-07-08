const LETTER_PATTERN = /\p{L}/u

function isUpperCaseLetter(char: string) {
  return (
    LETTER_PATTERN.test(char) &&
    char === char.toUpperCase() &&
    char !== char.toLowerCase()
  )
}

function isLowerCaseLetter(char: string) {
  return (
    LETTER_PATTERN.test(char) &&
    char === char.toLowerCase() &&
    char !== char.toUpperCase()
  )
}

/**
 * Adapts a replacement string to the case style of the matched text
 * (IntelliJ-style "preserve case"):
 *
 * - `FOO` (all upper, more than one letter) -> replacement in upper case
 * - `Foo` (first letter upper)              -> replacement capitalized
 * - anything else                           -> replacement as typed
 */
export function adaptReplacementCase(matchText: string, replacement: string) {
  if (!replacement) {
    return replacement
  }

  const letters = Array.from(matchText).filter((char) =>
    LETTER_PATTERN.test(char),
  )

  if (letters.length === 0) {
    return replacement
  }

  if (letters.length > 1 && letters.every(isUpperCaseLetter)) {
    return replacement.toUpperCase()
  }

  const [firstLetter, ...restLetters] = letters

  if (
    isUpperCaseLetter(firstLetter) &&
    (restLetters.length === 0 || restLetters.every(isLowerCaseLetter))
  ) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1)
  }

  return replacement
}

/**
 * Expands `$&`, `$$` and `$1..$n` group references in a regexp replacement,
 * mirroring the (non-exported) replacement expansion of @codemirror/search.
 * Group references to groups that did not participate expand to an empty
 * string instead of the text "undefined".
 */
export function expandRegExpReplacement(
  replacement: string,
  match: RegExpMatchArray,
) {
  return replacement.replace(/\$([$&]|\d+)/g, (token, reference: string) => {
    if (reference === '&') {
      return match[0]
    }

    if (reference === '$') {
      return '$'
    }

    for (let length = reference.length; length > 0; length -= 1) {
      const groupIndex = Number(reference.slice(0, length))

      if (groupIndex > 0 && groupIndex < match.length) {
        return (match[groupIndex] ?? '') + reference.slice(length)
      }
    }

    return token
  })
}
