# kubemapper

A real-time 3D visualizer for Kubernetes clusters.

I think Kubernetes gets oversold as complicated. Most of the confusion goes away once you can actually see what's going on. Kubemapper renders your cluster as a 3D scene: services sit around a central gateway, pods are pentagon-shaped vessels that fill up as they use CPU, replicas line up behind their lead pod, and traffic moves between services as particles.

What it shows:

- CPU usage as a fill level inside each pod (goes amber when a pod runs hot)
- Pending pods as dashed outlines that haven't been scheduled yet
- CrashLoopBackOff as a red pulse with the restart count
- Traffic between services, particle density scaled to req/s
- Live updates pushed to the browser over a websocket

## Installing

```sh
npx kubemapper          # no install
# or
npm install -g kubemapper
# or
brew install mihirahuja1/tap/kubemapper
```

Then:

```sh
kubemapper --demo   # simulated cluster, nothing required
kubemapper          # your real cluster, uses kubectl and your current context
```

Opens at http://localhost:8383. The demo cluster scales, crashes and recovers on its own so you can see all the states. Live mode needs kubectl on your PATH; CPU fill levels need metrics-server in the cluster.

## Developing

```sh
cd ui
npm install
npm run dev        # frontend only, falls back to the built-in demo
```

To run the CLI against the built frontend: `cd ui && npm run build`, then `cd ../cli && npm run build && node dist/cli.js --demo`.

## How it works

There's no database and nothing leaves your machine. A small local CLI (Node) reads your cluster through kubectl, using your current context, and streams state to the browser over a websocket. The React frontend does all the rendering with three.js. CPU numbers come from metrics-server if it's installed. Request-rate traffic in live mode isn't wired up yet, so those particles are illustrative for now.

```
browser (React + three.js)  <->  kubemapper CLI (Node, local)  ->  kubectl  ->  Kubernetes API
```

## Status

Early. Demo mode and live pod/replica/health rendering work. Request-rate traffic and richer topology are next.

## License

MIT
