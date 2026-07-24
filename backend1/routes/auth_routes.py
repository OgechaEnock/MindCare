"""
Equivalent to routes/authRoutes.js
"""
import bcrypt
from flask import Blueprint, g, jsonify, request

from db import query
from middleware.auth import authenticate_token, generate_token

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/register")
def register():
    try:
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")

        if not name or not email or not password:
            return jsonify({"error": "All fields are required"}), 400

        if len(password) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400

        existing = query("SELECT id FROM users WHERE email = %s", (email,))
        if len(existing) > 0:
            return jsonify({"error": "Email already registered"}), 409

        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(10)).decode("utf-8")

        rows = query(
            """INSERT INTO users (name, email, password)
               VALUES (%s, %s, %s)
               RETURNING id, name, email, created_at""",
            (name, email, hashed_password),
        )
        user = rows[0]

        token = generate_token({"id": user["id"], "email": user["email"], "name": user["name"]})

        return jsonify({
            "message": "Registration successful",
            "access": token,
            "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
        }), 201

    except Exception as err:
        print(f"Register error: {err}")
        return jsonify({"error": "Registration failed"}), 500


@auth_bp.post("/login")
def login():
    try:
        data = request.get_json(silent=True) or {}
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        rows = query("SELECT * FROM users WHERE email = %s", (email,))
        if len(rows) == 0:
            return jsonify({"error": "Invalid email or password"}), 401

        user = rows[0]
        valid_password = bcrypt.checkpw(password.encode("utf-8"), user["password"].encode("utf-8"))

        if not valid_password:
            return jsonify({"error": "Invalid email or password"}), 401

        token = generate_token({"id": user["id"], "email": user["email"], "name": user["name"]})

        return jsonify({
            "message": "Login successful",
            "access": token,
            "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
        })

    except Exception as err:
        print(f"Login error: {err}")
        return jsonify({"error": "Login failed"}), 500


@auth_bp.get("/me")
@authenticate_token
def me():
    try:
        rows = query(
            "SELECT id, name, email, created_at FROM users WHERE id = %s",
            (g.user["id"],),
        )
        if len(rows) == 0:
            return jsonify({"error": "User not found"}), 404
        return jsonify(rows[0])
    except Exception as err:
        print(f"Get user error: {err}")
        return jsonify({"error": "Failed to fetch user data"}), 500


@auth_bp.post("/logout")
@authenticate_token
def logout():
    return jsonify({"message": "Logout successful"})