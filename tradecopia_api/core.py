import requests
import json
import os
from util import generate_strong_password, generate_random_hostname
from dotenv import load_dotenv

load_dotenv()

# === CONFIGURATION ===
CLOUD_VIRT_URL = os.getenv("CLOUD_VIRT_URL", "CLOUD_VIRT_URL")
ADMIN_VIRT_URL = os.getenv("ADMIN_VIRT_URL", "ADMIN_VIRT_URL")
CLOUD_API_KEY = os.getenv("CLOUD_API_KEY", "CLOUD_API_KEY")
CLOUD_API_PASS = os.getenv("CLOUD_API_PASS", "CLOUD_API_PASS")
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "ADMIN_API_KEY")
ADMIN_API_PASS = os.getenv("ADMIN_API_PASS", "ADMIN_API_PASS")

# Disable SSL warnings if using self-signed certificate
requests.packages.urllib3.disable_warnings()


# === Helper Function ===
def virt_api(action, params=None, method="GET", do=False, permission="admin"):
    """Send Admin/API request to Virtualizor with robust handling.

    method: "GET" or "POST". Mutations should use POST.
    do: when True, include do=1 like the Admin panel does on submit.
    permission: "admin" or "cloud".
    """
    if params is None:
        params = {}

    if permission == "admin":
        VIRT_URL = ADMIN_VIRT_URL
        common = {
            "api": "json",
            "adminapikey": ADMIN_API_KEY,
            "adminapipass": ADMIN_API_PASS,
        }
    else:
        VIRT_URL = CLOUD_VIRT_URL
        common = {"api": "json", "apikey": CLOUD_API_KEY, "apipass": CLOUD_API_PASS}

    base = f"{VIRT_URL}/index.php?act={action}"

    if do:
        common["do"] = 1

    try:
        if method.upper() == "POST":
            resp = requests.post(
                base, params=common, data=params, verify=False, timeout=60
            )
        else:
            merged = {**params, **common}
            resp = requests.get(base, params=merged, verify=False, timeout=30)
    except requests.RequestException as e:
        return {"ok": False, "error": str(e), "url": base}

    return resp.json()


# === Add users ===
def add_user(email):
    data = {
        "adduser": 1,
        "user_email": email,
        "user_password": generate_strong_password(),
    }
    result = virt_api("adduser", data, method="POST", do=True, permission="cloud")
    return result


# === Get uid with email ===
def get_uid_with_email(email):
    data = {
        "email": email,
    }
    user_list = virt_api("users", data, method="POST", do=True, permission="admin")
    user_keys = list(user_list["users"].keys())
    user_id = user_keys[0]
    return user_id


# === CREATE VPS ===
def create_vps(user_id):
    # Mirror the PHP addvs_v2 sample, using PHP-style field encoding
    vps_pass = generate_strong_password()
    data = {
        "virt": "kvm",
        "uid": user_id,
        "plid": 1,
        "osid": 1017,
        "hostname": generate_random_hostname(),
        "rootpass": vps_pass,
        "addvps": 1,
        "node_select": 1,
    }

    result = virt_api("addvs", data, method="POST", do=True, permission="admin")
    ip_address = result["newvs"]["ips"][0]
    return {"ip_address": ip_address, "password": vps_pass}


# === DELETE VPS ===
def get_vps_id_with_email(email):
    data = {"user": email}

    vps_list = virt_api("vs", data, method="POST", do=True, permission="admin")
    vps_ids = list(vps_list["vs"].keys())
    return vps_ids[0]


# === DELETE VPS ===
def delete_vps(vps_id):
    data = {"delete": vps_id}
    result = virt_api("vs", data, method="POST", do=True, permission="admin")
    return result["done"]


# === DELETE users ===
def delete_user(user_id):
    data = {"delete": user_id}
    result = virt_api("users", data, method="POST", do=True, permission="admin")
    return result["done"]


def add_user_admin():
    data = {
        "adduser": 1,
        "newemail": "email@gmail.com",
        "newpass": "password123",
        "priority": 0,
    }
    result = virt_api("adduser", data, method="POST", do=True, permission="admin")
    print(json.dumps(result, indent=2))
