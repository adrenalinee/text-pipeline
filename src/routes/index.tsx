import { createFileRoute } from '@tanstack/react-router'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <MantineProvider>{/* Your app here */}</MantineProvider>
  )
}
