"""
AES encrypt/decrypt helpers, wire-compatible with the original Node backend's
utils/encrypt.js, which used crypto-js's `CryptoJS.AES.encrypt(data, passphrase)`.

crypto-js's passphrase-based AES.encrypt uses the OpenSSL "Salted__" format:
  - 8 random bytes of salt
  - key + IV derived from (passphrase, salt) via OpenSSL's EVP_BytesToKey (MD5)
  - AES-256-CBC encryption with PKCS7 padding
  - output = base64("Salted__" + salt + ciphertext)

Re-implementing that exact scheme here so any data already encrypted by the
Node version (and any data this Flask version encrypts) can be read by both.
"""
import hashlib
import os
from base64 import b64decode, b64encode

from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

from config import config

SECRET_KEY = config.ENCRYPTION_KEY

if not SECRET_KEY or len(SECRET_KEY) < 32:
    print("WARNING: ENCRYPTION_KEY must be at least 32 characters!")

_SALT_PREFIX = b"Salted__"
_KEY_LEN = 32  # AES-256
_IV_LEN = 16


def _evp_bytes_to_key(password: bytes, salt: bytes, key_len: int, iv_len: int):
    """OpenSSL's EVP_BytesToKey using MD5 (crypto-js's default KDF)."""
    d = d_i = b""
    while len(d) < key_len + iv_len:
        d_i = hashlib.md5(d_i + password + salt).digest()
        d += d_i
    return d[:key_len], d[key_len:key_len + iv_len]


def encrypt(data: str) -> str:
    """Encrypt plain text, returning a crypto-js-compatible base64 string."""
    if not data:
        return ""
    try:
        salt = os.urandom(8)
        key, iv = _evp_bytes_to_key(SECRET_KEY.encode("utf-8"), salt, _KEY_LEN, _IV_LEN)
        cipher = AES.new(key, AES.MODE_CBC, iv)
        padded = pad(data.encode("utf-8"), AES.block_size)
        ciphertext = cipher.encrypt(padded)
        return b64encode(_SALT_PREFIX + salt + ciphertext).decode("utf-8")
    except Exception as error:
        print(f"Encryption error: {error}")
        raise Exception("Failed to encrypt data")


def decrypt(cipher_text: str) -> str:
    """Decrypt a crypto-js-produced base64 string back to plain text."""
    if not cipher_text:
        return ""
    try:
        raw = b64decode(cipher_text)
        if raw[:8] != _SALT_PREFIX:
            raise ValueError("Invalid ciphertext format (missing OpenSSL salt header)")
        salt = raw[8:16]
        key, iv = _evp_bytes_to_key(SECRET_KEY.encode("utf-8"), salt, _KEY_LEN, _IV_LEN)
        cipher = AES.new(key, AES.MODE_CBC, iv)
        padded = cipher.decrypt(raw[16:])
        decrypted = unpad(padded, AES.block_size).decode("utf-8")
        if not decrypted:
            raise ValueError("Decryption resulted in empty string")
        return decrypted
    except Exception as error:
        print(f"Decryption error: {error}")
        raise Exception("Failed to decrypt data")