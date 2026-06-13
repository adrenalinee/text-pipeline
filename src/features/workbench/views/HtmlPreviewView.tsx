import { Box } from '@mantine/core'

const HTML_PREVIEW_CSP = [
  "default-src 'none'",
  "script-src 'none'",
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  'img-src data:',
  "style-src 'unsafe-inline'",
].join('; ')

export function HtmlPreviewView({ value }: { value: string }) {
  return (
    <Box className="htmlPreviewShell">
      <iframe
        className="htmlPreviewFrame"
        referrerPolicy="no-referrer"
        sandbox=""
        srcDoc={createHtmlPreviewDocument(value)}
        title="Sandboxed HTML preview"
      />
    </Box>
  )
}

export function createHtmlPreviewDocument(value: string) {
  return `<!doctype html>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${HTML_PREVIEW_CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1">
${value}`
}
