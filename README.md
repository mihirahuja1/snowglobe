# snowglobe

A real-time 3D visualizer for Kubernetes clusters.

I think Kubernetes gets oversold as complicated. Most of the confusion goes away once you can actually see what's going on. Snowglobe renders your cluster as a 3D scene: services sit around a central gateway, pods are pentagon-shaped vessels that fill up as they use CPU, replicas line up behind their lead pod, and traffic moves between services as particles.

What it shows:

- CPU usage as a fill level inside each pod (goes amber when a pod runs hot)
- Pending pods as dashed outlines that haven't been scheduled yet
- CrashLoopBackOff as a red pulse with the restart count
- Traffic between services, particle density scaled to req/s
- Everything updates live off Kubernetes watch streams, no polling

## Running it

No cluster needed, there's a built-in demo mode:

```sh
cd ui
npm install
npm run dev
```

Open http://localhost:8383. The demo cluster scales, crashes and recovers on its own so you can see all the states.

## How it works

There's no database and nothing leaves your machine. A small local CLI reads your existing kubeconfig, watches the Kubernetes API (read-only) and streams state to the browser over a websocket. CPU numbers come from metrics-server if it's installed. Request rates come from Prometheus if it's there, otherwise the traffic animation is illustrative.

```
browser (React + three.js)  <->  snowglobe CLI (local proxy)  ->  Kubernetes API (watch, read-only)
```

## Status

Early. The demo-mode frontend works, the live cluster proxy is in progress.

## License

MIT
