import os
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from dotenv import load_dotenv

from core import (
    add_user,
    get_uid_with_email,
    create_vps,
    get_vps_id_with_email,
    delete_vps,
    delete_user,
)
from db import save_vps_creation, mark_vps_deleted

load_dotenv()

# Load API key from environment variable
API_KEY = os.getenv("API_KEY", "api_key")

# API Key Header
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(x_api_key: str = Depends(api_key_header)):
    """Verify the API key from the request header."""
    if not x_api_key:
        raise HTTPException(
            status_code=401,
            detail="API key is required. Please provide X-API-Key header.",
        )
    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key. Access denied.")
    return x_api_key


app = FastAPI(title="Tradecopia Virtualizor API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/create_vps")
async def admin_create_vps(request: Request, api_key: str = Depends(verify_api_key)):
    """Create VPS via Admin API (act=addvs). Payload should use PHP-style keys when needed.
    Example keys: "virt", "hostname", "rootpass", "osid", "plid", "ips[]", "space[0][size]", ...
    """
    body = await request.json()
    email = body.get("email")
    plan_id = body.get("plan_id")

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if not plan_id:
        raise HTTPException(status_code=400, detail="Plan id is required")

    add_user(email)
    user_id = get_uid_with_email(email)
    vps_details = create_vps(user_id, plan_id)
    # save_vps_creation(
    #     email=email,
    #     ip_address=vps_details["ip_address"],
    #     password=vps_details["password"],
    #     plan_id=plan_id,
    # )

    return vps_details


@app.post("/delete_vps")
async def admin_delete_vps(request: Request, api_key: str = Depends(verify_api_key)):
    body = await request.json()
    email = body.get("email")

    if not email:
        raise HTTPException(status_code=400, detail="email is required")

    vps_id = get_vps_id_with_email(email)
    vps_result = delete_vps(vps_id)
    if not vps_result:
        raise HTTPException(
            status_code=502, detail="failed to delete vps in virtualizor"
        )

    user_id = get_uid_with_email(email)
    user_result = delete_user(user_id)
    if not user_result:
        raise HTTPException(
            status_code=502, detail="failed to delete user in virtualizor"
        )

    mark_vps_deleted(email)

    return {
        "vps_deleted": vps_id,
        "user_deleted": email,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
