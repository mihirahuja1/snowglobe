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

async function main(): Promise<void> {
  let mode: 'demo' | 'live' = values.demo ? 'demo' : 'live'
  if (mode === 'live') {
    if (!(await kubectlAvailable())) {
      console.log('kubectl not found, starting in demo mode (use --demo to hide this message)')
      mode = 'demo'
    } else if ((await fetchCluster(values.namespace)) === null) {
      console.log("couldn't reach a cluster with kubectl, starting in demo mode")
      mode = 'demo'
    }
  }

  const url = `http://localhost:${port}`
  console.log(`kubemapper: ${mode === 'demo' ? 'demo cluster' : 'live cluster'} at ${url}`)

  startServer({ mode, port, namespace: values.namespace })

  if (!values['no-browser']) {
    const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
    spawn(opener, [url], { stdio: 'ignore', detached: true }).unref()
  }
}

void main()
