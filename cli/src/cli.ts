#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { kubectlAvailable, fetchCluster } from './k8s.js'
import { startServer } from './server.js'

const require = createRequire(import.meta.url)
const { version } = require('../package.json')

const { values } = parseArgs({
  options: {
    demo: { type: 'boolean', default: false },
    namespace: { type: 'string', short: 'n' },
    port: { type: 'string', short: 'p', default: '8383' },
    'no-browser': { type: 'boolean', default: false },
    version: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
})

if (values.help) {
  console.log(`kubemapper ${version} — real-time 3D visualizer for Kubernetes clusters

usage: kubemapper [options]

  --demo             run with a simulated cluster
  -n, --namespace    namespace to watch (default: all)
  -p, --port         port to listen on (default: 8383)
  --no-browser       don't open a browser
  --version          print version`)
  process.exit(0)
}
if (values.version) {
  console.log(`kubemapper ${version}`)
  process.exit(0)
}

const port = parseInt(values.port!, 10)
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`invalid port: ${values.port}`)
  process.exit(1)
}

function openBrowser(url: string): void {
  const plat = process.platform
  const cmd = plat === 'darwin' ? 'open' : plat === 'win32' ? 'start' : 'xdg-open'
  // `start` is a cmd.exe builtin, so it needs a shell; the empty title arg avoids
  // start treating the URL as a window title.
  const args = plat === 'win32' ? ['', url] : [url]
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true, shell: plat === 'win32' }).unref()
  } catch {
    /* opening a browser is best-effort */
  }
}

async function main(): Promise<void> {
  let mode: 'demo' | 'live' = values.demo ? 'demo' : 'live'
  let demoReason: string | undefined

  if (mode === 'live') {
    if (!(await kubectlAvailable())) {
      console.log('kubectl not found on PATH — starting in demo mode.')
      console.log('  install kubectl and re-run, or use --demo to silence this.')
      mode = 'demo'
      demoReason = 'kubectl not found'
    } else {
      const probe = await fetchCluster(values.namespace)
      if (!probe.ok) {
        if (probe.reason === 'forbidden') {
          console.log('access denied listing workloads cluster-wide — starting in demo mode.')
          console.log(`  try scoping to a namespace you can read:  kubemapper -n <namespace>`)
        } else if (probe.reason === 'empty') {
          console.log(`${probe.message} — starting in demo mode.`)
        } else {
          console.log(`couldn't reach a cluster (${probe.message}) — starting in demo mode.`)
          console.log('  check `kubectl get pods` works, then re-run.')
        }
        mode = 'demo'
        demoReason = probe.message
      } else {
        const c = probe.cluster
        console.log(`connected to "${c.name}" — ${c.services.length} workloads.`)
        if (c.metricsAvailable === false) {
          console.log('  note: metrics-server not detected, so CPU fill will read 0.')
        }
      }
    }
  }

  const url = `http://localhost:${port}`
  console.log(`kubemapper: ${mode === 'demo' ? 'demo cluster' : 'live cluster'} at ${url}`)

  startServer({ mode, port, namespace: values.namespace, demoReason })
  if (!values['no-browser']) openBrowser(url)
}

void main()
