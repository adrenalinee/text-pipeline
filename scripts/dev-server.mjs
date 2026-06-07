#!/usr/bin/env node

import { spawn } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const runtimeDir = path.join(rootDir, '.tmp')
const statePath = path.join(runtimeDir, 'dev-server.json')
const stdoutPath = path.join(runtimeDir, 'dev-server.out.log')
const stderrPath = path.join(runtimeDir, 'dev-server.err.log')
const vitePath = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js')

const args = process.argv.slice(2)
const command = args[0] ?? 'start'
const options = parseOptions(args.slice(1))
const host = options.host ?? '127.0.0.1'
const port = Number(options.port ?? process.env.PORT ?? 3000)
const url = `http://${host}:${port}`

mkdirSync(runtimeDir, { recursive: true })

if (command === 'start') {
  await startServer()
} else if (command === 'status') {
  await reportStatus()
} else if (command === 'stop') {
  await stopServer()
} else if (command === 'logs') {
  printLogs()
} else {
  console.error(`Unknown command: ${command}`)
  process.exit(1)
}

async function startServer() {
  if (await isReady(url)) {
    console.log(`Dev server is already ready at ${url}`)
    return
  }

  const previousState = readState()
  if (previousState && isProcessRunning(previousState.pid)) {
    console.error(
      `Dev server process ${previousState.pid} exists but ${url} is not ready.`,
    )
    console.error(`Run "yarn run dev:stop" before starting it again.`)
    process.exit(1)
  }

  removeState()

  const stdout = openSync(stdoutPath, 'w')
  const stderr = openSync(stderrPath, 'w')
  const child = spawn(
    process.execPath,
    [vitePath, 'dev', '--host', host, '--port', String(port)],
    {
      cwd: rootDir,
      detached: true,
      env: createChildEnv(),
      stdio: ['ignore', stdout, stderr],
      windowsHide: true,
    },
  )

  writeFileSync(
    statePath,
    JSON.stringify(
      {
        host,
        pid: child.pid,
        port,
        startedAt: new Date().toISOString(),
        stderrPath,
        stdoutPath,
        url,
      },
      null,
      2,
    ),
  )

  child.unref()

  if (await waitUntilReady(url, child.pid, 30_000)) {
    console.log(`Dev server is ready at ${url}`)
    console.log(`Logs: ${stdoutPath}`)
    return
  }

  stopProcess(child.pid)
  removeState()
  console.error(`Dev server did not become ready at ${url}.`)
  printLogs()
  process.exit(1)
}

async function reportStatus() {
  const state = readState()

  if (await isReady(url)) {
    const pid = state?.pid ? ` pid=${state.pid}` : ''
    console.log(`Dev server is ready at ${url}${pid}`)
    return
  }

  if (state && isProcessRunning(state.pid)) {
    console.error(`Dev server process ${state.pid} is running but not ready.`)
    console.error(`Logs: ${state.stdoutPath}`)
    process.exit(1)
  }

  removeState()
  console.log(`Dev server is stopped for ${url}`)
}

async function stopServer() {
  const state = readState()

  if (!state) {
    console.log('No dev server state file found.')
    return
  }

  if (!isProcessRunning(state.pid)) {
    removeState()
    console.log(`Removed stale dev server state for pid ${state.pid}.`)
    return
  }

  stopProcess(state.pid)

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!isProcessRunning(state.pid)) {
      removeState()
      console.log(`Stopped dev server pid ${state.pid}.`)
      return
    }

    await delay(250)
  }

  console.error(`Dev server pid ${state.pid} did not stop cleanly.`)
  process.exit(1)
}

function parseOptions(optionArgs) {
  const parsed = {}

  for (let index = 0; index < optionArgs.length; index += 1) {
    const arg = optionArgs[index]

    if (arg === '--host') {
      parsed.host = optionArgs[index + 1]
      index += 1
    } else if (arg === '--port') {
      parsed.port = optionArgs[index + 1]
      index += 1
    } else if (arg.startsWith('--host=')) {
      parsed.host = arg.slice('--host='.length)
    } else if (arg.startsWith('--port=')) {
      parsed.port = arg.slice('--port='.length)
    }
  }

  return parsed
}

function createChildEnv() {
  if (process.platform !== 'win32') {
    return { ...process.env }
  }

  const env = {}
  const pathValue = process.env.Path ?? process.env.PATH ?? process.env.path

  for (const [key, value] of Object.entries(process.env)) {
    if (key.toLowerCase() !== 'path' && value !== undefined) {
      env[key] = value
    }
  }

  if (pathValue) {
    env.Path = pathValue
  }

  return env
}

async function waitUntilReady(targetUrl, pid, timeoutMs) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (await isReady(targetUrl)) {
      return true
    }

    if (!isProcessRunning(pid)) {
      return false
    }

    await delay(250)
  }

  return false
}

async function isReady(targetUrl) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1_000)

  try {
    const response = await fetch(targetUrl, { signal: controller.signal })
    return response.status >= 200 && response.status < 500
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

function readState() {
  if (!existsSync(statePath)) {
    return null
  }

  try {
    return JSON.parse(readFileSync(statePath, 'utf8'))
  } catch {
    return null
  }
}

function removeState() {
  try {
    rmSync(statePath, { force: true })
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.warn(`Could not remove ${statePath}: ${error.message}`)
    }
  }
}

function isProcessRunning(pid) {
  if (!pid) {
    return false
  }

  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function stopProcess(pid) {
  try {
    process.kill(pid)
  } catch {
    return
  }
}

function printLogs() {
  printTail('stdout', stdoutPath)
  printTail('stderr', stderrPath)
}

function printTail(label, filePath) {
  if (!existsSync(filePath)) {
    console.log(`${label}: <missing>`)
    return
  }

  const content = readFileSync(filePath, 'utf8')
  const tail = content.slice(-4_000).trim()
  console.log(`${label}:`)
  console.log(tail || '<empty>')
}
