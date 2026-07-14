"""Live cluster state via kubectl. No Kubernetes client library needed:
kubectl handles auth (exec plugins, EKS/GKE/AKS helpers) for us."""
import json
import math
import shutil
import subprocess

COLOR_CYCLE = ["#3b7dd8", "#1d9e75", "#d85a30", "#7a5cc4", "#c2417e", "#2a8fa3"]


def kubectl_available():
    return shutil.which("kubectl") is not None


def _run(args, timeout=15):
    try:
        out = subprocess.run(
            ["kubectl"] + args, capture_output=True, text=True, timeout=timeout
        )
        if out.returncode != 0:
            return None
        return out.stdout
    except (subprocess.TimeoutExpired, OSError):
        return None


def _pod_phase(pod):
    statuses = (pod.get("status", {}).get("containerStatuses") or [])
    for cs in statuses:
        waiting = (cs.get("state") or {}).get("waiting") or {}
        if waiting.get("reason") in ("CrashLoopBackOff", "ImagePullBackOff", "ErrImagePull"):
            return "crash"
    if pod.get("status", {}).get("phase") == "Pending":
        return "pending"
    return "ok"


def _pod_restarts(pod):
    return sum(cs.get("restartCount", 0) for cs in (pod.get("status", {}).get("containerStatuses") or []))


def _cpu_millicores(value):
    if not value:
        return 0
    if value.endswith("n"):
        return int(value[:-1]) / 1_000_000
    if value.endswith("m"):
        return int(value[:-1])
    return float(value) * 1000


def fetch_cluster(namespace):
    ns_args = ["-n", namespace] if namespace else ["--all-namespaces"]

    deploys_raw = _run(["get", "deployments", "-o", "json"] + ns_args)
    pods_raw = _run(["get", "pods", "-o", "json"] + ns_args)
    if deploys_raw is None or pods_raw is None:
        return None

    deploys = json.loads(deploys_raw).get("items", [])
    pods = json.loads(pods_raw).get("items", [])

    top = {}
    top_raw = _run(["top", "pods", "--no-headers"] + ns_args, timeout=10)
    if top_raw:
        for line in top_raw.strip().splitlines():
            parts = line.split()
            if namespace and len(parts) >= 2:
                top[parts[0]] = _cpu_millicores(parts[1])
            elif len(parts) >= 3:
                top[parts[1]] = _cpu_millicores(parts[2])

    services = []
    n = max(1, len(deploys))
    for i, dep in enumerate(deploys[:12]):
        dep_name = dep["metadata"]["name"]
        desired = dep.get("spec", {}).get("replicas", 1) or 1

        dep_pods = []
        for pod in pods:
            if not pod["metadata"]["name"].startswith(dep_name + "-"):
                continue
            name = pod["metadata"]["name"]
            limit = 0
            for c in pod.get("spec", {}).get("containers", []):
                lim = (c.get("resources", {}).get("limits") or {}).get("cpu")
                if lim:
                    limit += _cpu_millicores(lim)
            used = top.get(name, 0)
            util = used / limit if limit else min(1.0, used / 500)
            dep_pods.append({
                "id": name,
                "phase": _pod_phase(pod),
                "util": round(util, 3),
                "targetUtil": round(util, 3),
                "restarts": _pod_restarts(pod),
                "ticksInPhase": 0,
            })

        angle = -math.pi + (2 * math.pi * i) / n
        services.append({
            "name": dep_name,
            "color": COLOR_CYCLE[i % len(COLOR_CYCLE)],
            "angle": round(angle, 3),
            "dist": 9.5,
            "desired": desired,
            "pods": dep_pods or [{
                "id": f"{dep_name}-none", "phase": "pending", "util": 0,
                "targetUtil": 0, "restarts": 0, "ticksInPhase": 0,
            }],
            "rps": 0,
            "upstream": None,
        })

    context = (_run(["config", "current-context"], timeout=5) or "cluster").strip()
    return {"name": context, "gatewayName": "kubernetes", "services": services}
