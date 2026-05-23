"""FastAPI dependencies shared across routers."""
from dataclasses import dataclass

from fastapi import Request


@dataclass
class HAUser:
    id: str            # X-Remote-User-Id  (or "" if not via ingress)
    name: str          # X-Remote-User-Name
    display_name: str  # X-Remote-User-Display-Name


def get_ha_user(request: Request) -> HAUser:
    """Extract the HA user identity from ingress-injected headers.

    Security: we only trust X-Remote-User-* when X-Ingress-Path is also
    present. X-Ingress-Path is injected exclusively by the HA supervisor when
    it proxies a request through ingress; it is absent on direct connections to
    port 8099. This prevents an attacker on the local network from impersonating
    another user by sending a fake X-Remote-User-Id to the direct port.

    Residual risk: someone on the LAN could send both headers to port 8099.
    This matches HA's own ingress security model (network isolation, no
    cryptographic signing). No HA addon can do better without supervisor changes.
    """
    if not request.headers.get("X-Ingress-Path"):
        # Direct port access (e.g. Google OAuth callback) — unauthenticated
        return HAUser(id="", name="", display_name="")
    return HAUser(
        id=request.headers.get("X-Remote-User-Id", ""),
        name=request.headers.get("X-Remote-User-Name", ""),
        display_name=request.headers.get("X-Remote-User-Display-Name", ""),
    )
