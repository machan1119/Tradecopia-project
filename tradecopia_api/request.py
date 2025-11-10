import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get API key from environment variable
API_KEY = os.getenv("API_KEY", "V16P1njOpYIAp1cccLWYpztMEzrTqv")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")


def make_authenticated_request(action: str, payload: dict):
    """Make an authenticated request to the API with API key in headers."""
    headers = {"X-API-Key": API_KEY, "Content-Type": "application/json"}

    resp = requests.post(
        f"{API_BASE_URL}/{action}",
        json=payload,
        headers=headers,
        verify=False,
        timeout=60,
    )

    # Raise an exception for bad status codes
    resp.raise_for_status()
    return resp.json()


def test():
    """Test function to demonstrate API usage."""
    action = "delete_vps"
    # action = "create_vps"

    payload = {"email": "secondtest@gmail.com"}

    try:
        result = make_authenticated_request(action, payload)
        print("Success:", result)
    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e}")
        if e.response is not None:
            print(f"Response: {e.response.text}")
    except requests.exceptions.RequestException as e:
        print(f"Request Error: {e}")


if __name__ == "__main__":
    print("Test...")
    test()
