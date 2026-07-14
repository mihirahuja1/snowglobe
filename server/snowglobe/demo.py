"""Simulated demo cluster, mirrors ui/src/mock.ts."""
import random

_pod_counter = 0

COLORS = {
    "frontend": "#3b7dd8",
    "api": "#1d9e75",
    "postgres": "#d85a30",
}


def _make_pod(util):
    global _pod_counter
    _pod_counter += 1
    return {
        "id": f"pod-{_pod_counter}",
        "phase": "ok",
        "util": util,
        "targetUtil": util,
        "restarts": 0,
        "ticksInPhase": 0,
    }


def initial_cluster():
    return {
        "name": "demo-prod",
        "gatewayName": "ingress-nginx",
        "services": [
            {
                "name": "frontend", "color": COLORS["frontend"],
                "angle": -2.62, "dist": 9.5, "desired": 4,
                "pods": [_make_pod(0.72), _make_pod(0.45), _make_pod(0.4), _make_pod(0.5)],
                "rps": 2000, "upstream": None,
            },
            {
                "name": "api", "color": COLORS["api"],
                "angle": -0.52, "dist": 9.5, "desired": 3,
                "pods": [_make_pod(0.5), _make_pod(0.62), _make_pod(0.35)],
                "rps": 850, "upstream": None,
            },
            {
                "name": "postgres", "color": COLORS["postgres"],
                "angle": 1.57, "dist": 9.0, "desired": 1,
                "pods": [_make_pod(0.31)],
                "rps": 120, "upstream": "api",
            },
        ],
    }


def _tick_pod(pod):
    pod["ticksInPhase"] += 1

    if pod["phase"] == "crash":
        if pod["ticksInPhase"] % 4 == 3:
            pod["restarts"] += 1
        if pod["ticksInPhase"] > 8 and random.random() < 0.25:
            pod["phase"] = "ok"
            pod["ticksInPhase"] = 0
            pod["targetUtil"] = 0.3 + random.random() * 0.3
        return

    if pod["phase"] == "pending":
        if pod["ticksInPhase"] > 3 and random.random() < 0.5:
            pod["phase"] = "ok"
            pod["ticksInPhase"] = 0
            pod["util"] = 0.1
            pod["targetUtil"] = 0.3 + random.random() * 0.4
        return

    if random.random() < 0.1:
        pod["targetUtil"] = 0.2 + random.random() * 0.7
    pod["util"] += (pod["targetUtil"] - pod["util"]) * 0.2
    if pod["util"] > 0.92 and random.random() < 0.15:
        pod["phase"] = "crash"
        pod["ticksInPhase"] = 0
        pod["restarts"] += 1
    elif random.random() < 0.004:
        pod["phase"] = "crash"
        pod["ticksInPhase"] = 0
        pod["restarts"] += 1


_RPS_BOUNDS = {"frontend": (1200, 3200), "api": (500, 1400), "postgres": (60, 260)}


def tick_cluster(state):
    for svc in state["services"]:
        for pod in svc["pods"]:
            _tick_pod(pod)

        if svc["name"] == "frontend" and random.random() < 0.04:
            svc["desired"] = 3 + random.randrange(3)
        if len(svc["pods"]) < svc["desired"]:
            pending = _make_pod(0.0)
            pending["phase"] = "pending"
            svc["pods"].append(pending)
        elif len(svc["pods"]) > svc["desired"]:
            svc["pods"] = svc["pods"][: svc["desired"]]

        lo, hi = _RPS_BOUNDS.get(svc["name"], (50, 5000))
        svc["rps"] = max(lo, min(hi, round(svc["rps"] * (0.9 + random.random() * 0.2))))
    return state
