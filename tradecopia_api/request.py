import requests

def test():
    action = "delete_vps"
    resp = requests.post(f"http://localhost:8000/{action}", json={"email": "secondtest@gmail.com"}, verify=False, timeout=60)
    print(resp.json())

if __name__ == "__main__":
    print("Test...")
    test()