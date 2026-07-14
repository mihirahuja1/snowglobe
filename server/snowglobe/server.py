import asyncio
import json
from pathlib import Path

from aiohttp import web, WSMsgType

from . import demo, k8s

STATIC_DIR = Path(__file__).parent / "static"


def create_app(mode, namespace=None, interval=1.5):
    app = web.Application()
    app["mode"] = mode
    app["namespace"] = namespace
    app["interval"] = interval
    app["sockets"] = set()

    async def ws_handler(request):
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        request.app["sockets"].add(ws)
        try:
            async for msg in ws:
                if msg.type == WSMsgType.ERROR:
                    break
        finally:
            request.app["sockets"].discard(ws)
        return ws

    async def index(request):
        return web.FileResponse(STATIC_DIR / "index.html")

    app.router.add_get("/ws", ws_handler)
    app.router.add_get("/", index)
    if STATIC_DIR.exists():
        app.router.add_static("/", STATIC_DIR)

    async def broadcaster(app):
        state = demo.initial_cluster() if app["mode"] == "demo" else None
        while True:
            if app["mode"] == "demo":
                state = demo.tick_cluster(state)
                payload = state
            else:
                payload = await asyncio.get_event_loop().run_in_executor(
                    None, k8s.fetch_cluster, app["namespace"]
                )
            if payload is not None:
                msg = json.dumps(payload)
                for ws in list(app["sockets"]):
                    try:
                        await ws.send_str(msg)
                    except ConnectionResetError:
                        app["sockets"].discard(ws)
            await asyncio.sleep(app["interval"] if app["mode"] == "demo" else 2.5)

    async def start_broadcast(app):
        app["broadcast_task"] = asyncio.create_task(broadcaster(app))

    async def stop_broadcast(app):
        app["broadcast_task"].cancel()

    app.on_startup.append(start_broadcast)
    app.on_cleanup.append(stop_broadcast)
    return app
