import { spawn, spawnSync } from "node:child_process"
import { createServer } from "node:net"

const DEFAULT_HOST = "localhost"
const DEFAULT_PORT = 4000

function getCommand() {
  const args = process.argv.slice(2)
  const commandIndex = args[0] === "--" ? 1 : 0
  const command = args[commandIndex]

  if (!command) {
    console.error(
      "Usage: node scripts/dev-port-bootstrap.mjs -- <command> [args...]"
    )
    process.exit(1)
  }

  return {
    command,
    args: args.slice(commandIndex + 1),
  }
}

function parseExplicitUrl(rawUrl) {
  const url = new URL(rawUrl)
  const port = url.port
    ? Number(url.port)
    : url.protocol === "https:"
      ? 443
      : 80

  return {
    port,
    url: rawUrl,
  }
}

function canListenOn(port) {
  return new Promise((resolve, reject) => {
    const server = createServer()

    server.unref()
    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        resolve(false)
        return
      }

      reject(error)
    })

    server.listen(port, DEFAULT_HOST, () => {
      server.close(() => resolve(true))
    })
  })
}

function isPortInUse(port) {
  const result = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"], {
    stdio: "ignore",
  })

  if (!result.error) {
    return result.status === 0
  }

  return null
}

async function findFreePort(startPort) {
  let port = startPort

  while (true) {
    const portInUse = isPortInUse(port)

    if (portInUse === false) {
      return port
    }

    if (portInUse === null && (await canListenOn(port))) {
      return port
    }

    port += 1
  }
}

async function resolveAppUrl() {
  if (process.env.PLAYWRIGHT_BASE_URL) {
    return parseExplicitUrl(process.env.PLAYWRIGHT_BASE_URL)
  }

  if (process.env.PORT) {
    return {
      port: Number(process.env.PORT),
      url: `http://${DEFAULT_HOST}:${process.env.PORT}`,
    }
  }

  const port = await findFreePort(DEFAULT_PORT)

  return {
    port,
    url: `http://${DEFAULT_HOST}:${port}`,
  }
}

async function main() {
  const { command, args } = getCommand()
  const { port, url } = await resolveAppUrl()

  console.log(`[dev-port-bootstrap] URL: ${url}`)

  const child = spawn(command, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: String(port),
      PLAYWRIGHT_BASE_URL: url,
    },
  })

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    process.exit(code ?? 0)
  })
}

main().catch((error) => {
  console.error("[dev-port-bootstrap] Failed to start command")
  console.error(error)
  process.exit(1)
})
