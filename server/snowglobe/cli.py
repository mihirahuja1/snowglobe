import argparse
import webbrowser

from aiohttp import web

from . import __version__, k8s
from .server import create_app


def main():
    parser = argparse.ArgumentParser(
        prog="snowglobe",
        description="Real-time 3D visualizer for Kubernetes clusters.",
    )
    parser.add_argument("--demo", action="store_true", help="run with a simulated cluster")
    parser.add_argument("-n", "--namespace", help="namespace to watch (default: all)")
    parser.add_argument("-p", "--port", type=int, default=8383)
    parser.add_argument("--no-browser", action="store_true", help="don't open a browser")
    parser.add_argument("--version", action="version", version=f"snowglobe {__version__}")
    args = parser.parse_args()

    mode = "demo" if args.demo else "live"
    if mode == "live":
        if not k8s.kubectl_available():
            print("kubectl not found, starting in demo mode (use --demo to hide this message)")
            mode = "demo"
        elif k8s.fetch_cluster(args.namespace) is None:
            print("couldn't reach a cluster with kubectl, starting in demo mode")
            mode = "demo"

    url = f"http://localhost:{args.port}"
    label = "demo cluster" if mode == "demo" else "live cluster"
    print(f"snowglobe: {label} at {url}")

    app = create_app(mode, namespace=args.namespace)
    if not args.no_browser:
        webbrowser.open(url)
    web.run_app(app, host="127.0.0.1", port=args.port, print=None)


if __name__ == "__main__":
    main()
