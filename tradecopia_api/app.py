from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from core import add_user, get_uid_with_email, create_vps, get_vps_id_with_email, delete_vps, delete_user
from db import save_vps_creation, mark_vps_deleted


app = FastAPI(title="Tradecopia Virtualizor API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/create_vps")
async def admin_create_vps(request: Request):
    """Create VPS via Admin API (act=addvs). Payload should use PHP-style keys when needed.
    Example keys: "virt", "hostname", "rootpass", "osid", "plid", "ips[]", "space[0][size]", ...
    """
    body = await request.json()
    email = body.get('email')

    if not email:
        raise HTTPException(status_code=400, detail="email is required")

    add_user(email)
    user_id = get_uid_with_email(email)
    vps_details = create_vps(user_id)
    record = save_vps_creation(
        email=email,
        ip_address=vps_details["ip_address"],
        password=vps_details["password"],
    )

    return {
        "virtualizor": vps_details,
        "database_record": record,
    }

@app.post("/delete_vps")
async def admin_delete_vps(request: Request):
    body = await request.json()
    email = body.get('email')

    if not email:
        raise HTTPException(status_code=400, detail="email is required")

    vps_id = get_vps_id_with_email(email)
    vps_result  = delete_vps(vps_id)
    if not vps_result:
        raise HTTPException(status_code=502, detail="failed to delete vps in virtualizor")

    user_id = get_uid_with_email(email)
    user_result = delete_user(user_id)
    if not user_result:
        raise HTTPException(status_code=502, detail="failed to delete user in virtualizor")

    record = mark_vps_deleted(email)

    return {
        "virtualizor": {
            "vps_deleted": bool(vps_result),
            "user_deleted": bool(user_result),
        },
        "database_record": record,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)


