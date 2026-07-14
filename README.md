# snowglobe

**Your cluster in a snowglobe.** A real-time 3D visualizer that makes Kubernetes finally click.

Kubernetes isn't complicated — it's just invisible. Snowglobe renders your cluster as a living 3D scene: services orbit a central gateway, pods are pentagon vessels that fill up with CPU, replicas queue up behind their lead pod, and traffic flows as particle streams whose density matches real request rates.

- 🔷 **Pods as vessels** — fill level = CPU vs limit; turns amber as it runs hot
- 👻 **Pending pods** — dashed ghosts that haven't been scheduled yet
- 🔴 **CrashLoopBackOff** — pulses red with a live restart counter
- 🌊 **Traffic streams** — particle density proportional to req/s
- 🔁 **Real time** — driven by Kubernetes watch streams, not polling

## Try it (no cluster required)

```sh
cd ui
npm install
npm run dev
```

Open http://localhost:8383 — you get a demo cluster with live scaling, crashes, and recoveries.

## Architecture

No database, no deployment, nothing leaves your machine. A thin local CLI reads your existing kubeconfig, watches the Kubernetes API (read-only), and streams state to the browser over a websocket. Utilization comes from metrics-server when available; request rates from Prometheus if detected.

```
browser (React + three.js)  ⇄  snowglobe CLI (local proxy)  →  Kubernetes API (watch, read-only)
```

## Status

Early days. The demo-mode frontend is working; the live-cluster proxy is next.

## License

MIT
