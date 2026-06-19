import { StreamLanguage } from '@codemirror/language'
import type { StreamParser } from '@codemirror/language'

// CodeMirror ships no official CSV mode, so define a lightweight stream parser
// that highlights quoted fields, numeric fields, and the field delimiter.
const csvParser: StreamParser<unknown> = {
  name: 'csv',
  token(stream) {
    const character = stream.peek()

    if (character === '"') {
      stream.next()

      while (!stream.eol()) {
        const next = stream.next()

        if (next === '"') {
          // A doubled quote ("") is an escaped quote inside the field.
          if (stream.peek() === '"') {
            stream.next()
            continue
          }

          break
        }
      }

      return 'string'
    }

    if (character === ',') {
      stream.next()
      return 'punctuation'
    }

    if (stream.match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?=,|$)/)) {
      return 'number'
    }

    const consumed = stream.eatWhile(
      (value) => value !== ',' && value !== '"',
    )

    if (!consumed) {
      stream.next()
    }

    return null
  },
}

export const csvLanguage = StreamLanguage.define(csvParser)
