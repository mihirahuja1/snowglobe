# kubemapper

<img width="1774" height="1012" alt="image" src="https://github.com/user-attachments/assets/636134dd-0eed-40d8-be6b-d88a01b8faec" />

A real-time 3D visualizer for Kubernetes clusters.

I think Kubernetes gets oversold as complicated. Most of the confusion goes away once you can actually see what's going on. Kubemapper renders your cluster as a 3D scene: services sit around a central gateway, pods are pentagon-shaped vessels that fill up as they use CPU, replicas line up behind their lead pod, and traffic moves between services as particles.

What it shows:

- Deployments, StatefulSets and DaemonSets, each as a cluster of pods
- CPU usage as a fill level inside each pod (goes amber when a pod runs hot)
- Pending pods as dashed outlines that haven't been scheduled yet
- CrashLoopBackOff as a red pulse with the restart count
- Traffic between services, particle density scaled to req/s (demo mode only for now, see below)
- Light and dark mode
- Live updates pushed to the browser over a websocket

## Installing

```sh
npx kubemapper
# or
npm install -g kubemapper
```

Then:

```sh
kubemapper --demo             # simulated cluster, nothing required
kubemapper                    # your real cluster, uses kubectl and your current context
kubemapper -n my-namespace    # scope to one namespace
```

Opens at http://localhost:8383. The demo cluster scales, crashes and recovers on its own so you can see all the states. Live mode needs kubectl on your PATH; CPU fill levels need metrics-server in the cluster. If either isn't there, or kubectl can't reach anything, kubemapper falls back to demo mode and says so in the UI rather than pretending it's your cluster.

A Homebrew tap is planned but not published yet — for now, npx/npm is the way to install.

## Developing

```sh
cd ui
npm install
npm run dev        # frontend only, falls back to the built-in demo
```

To run the CLI against the built frontend: `cd ui && npm run build`, then `cd ../cli && npm run build && node dist/cli.js --demo`.

## How it works

There's no database and nothing leaves your machine. A small local CLI (Node) reads your cluster through kubectl, using your current context, and streams state to the browser over a websocket. The React frontend does all the rendering with three.js. CPU numbers come from metrics-server if it's installed. Kubernetes itself has no concept of request rates between services, so live-mode traffic isn't wired up yet — those particles only animate in `--demo`.

```
browser (React + three.js)  <->  kubemapper CLI (Node, local)  ->  kubectl  ->  Kubernetes API
```

## Status

Early, but the core is solid: demo mode, and live pod/replica/health rendering for Deployments, StatefulSets and DaemonSets, tested against both minikube and a real GKE cluster. Known gaps: no live request-rate traffic yet, no Jobs/CronJobs, and very large clusters (100s of pods) will strain the layout. Published on npm as `kubemapper`.

## License

MIT
