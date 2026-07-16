import { StreamLanguage } from '@codemirror/language'
import type { StreamParser } from '@codemirror/language'

// A JWS compact token is `header.payload.signature`. There is no official
// CodeMirror mode, so tokenize the three dot-separated base64url segments and
// color them distinctly: header, payload, then a dimmed signature.
type JwtState = { segment: number }

const SEGMENT_TAGS = ['typeName', 'string', 'comment'] as const

const jwtParser: StreamParser<JwtState> = {
  name: 'jwt',
  startState: () => ({ segment: 0 }),
  token(stream, state) {
    if (stream.eatSpace()) {
      return null
    }

    if (stream.peek() === '.') {
      stream.next()
      state.segment = Math.min(state.segment + 1, SEGMENT_TAGS.length - 1)
      return 'punctuation'
    }

    stream.eatWhile((character) => character !== '.' && !/\s/.test(character))

    return SEGMENT_TAGS[state.segment] ?? null
  },
}

export const jwtLanguage = StreamLanguage.define(jwtParser)
