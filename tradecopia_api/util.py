import string
import secrets


def generate_random_hostname(length: int = 15) -> str:
    """Generate a random hostname of given length using only A-Z and a-z.

    The hostname will not include digits or hyphens, per the request.
    """
    if length <= 0:
        raise ValueError("length must be positive")
    letters = string.ascii_letters  # A-Z a-z
    hostname =  "".join(secrets.choice(letters) for _ in range(length)) + ".com"
    return hostname


def generate_strong_password(length: int = 12) -> str:
    """Generate a strong random password of given length.

    Ensures at least one lowercase, one uppercase, one digit, and one symbol are included.
    Example format (not fixed): IMW@@#Z0&9&%
    """
    if length < 4:
        raise ValueError("length must be at least 4 to satisfy complexity requirements")

    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    symbols = "@#$%&"  # common safe symbols

    # Guarantee required classes
    required = [
        secrets.choice(lowercase),
        secrets.choice(uppercase),
        secrets.choice(digits),
        secrets.choice(symbols),
    ]

    all_chars = lowercase + uppercase + digits + symbols
    remaining = [secrets.choice(all_chars) for _ in range(length - len(required))]

    # Shuffle in a cryptographically secure way
    password_chars = required + remaining
    for i in range(len(password_chars) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        password_chars[i], password_chars[j] = password_chars[j], password_chars[i]

    return "".join(password_chars)


