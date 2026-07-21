import React, { useState } from "react";
import { Form, Button, Container, Card, Alert } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login({ email, password });

    if (result) {
      navigate("/dashboard");
    }

    setLoading(false);
  };

  return (
    <div className="mc-auth-page">
      {/* Background decorative elements */}
      <div className="mc-animated-bg">
        <div className="mc-bg-blob mc-bg-blob-1"></div>
        <div className="mc-bg-blob mc-bg-blob-2"></div>
        <div className="mc-bg-blob mc-bg-blob-3"></div>
      </div>

      <Container>
        <Card className="mc-auth-card border-0">
          <div className="mc-auth-card-header">
            <div className="mc-auth-icon">
              <i className="bi bi-heart-pulse-fill"></i>
            </div>
            <h3 className="mc-auth-title">Welcome Back</h3>
            <p className="mc-auth-subtitle">Sign in to continue your wellness journey</p>
          </div>

          <Alert variant="info" className="mc-alert-info small border-0">
            <div className="d-flex align-items-start">
              <i className="bi bi-info-circle me-2 mt-1"></i>
              <div>
                <strong>Crisis Support:</strong> If you're experiencing a mental health emergency,
                please call your local emergency services or 988 immediately.
              </div>
            </div>
          </Alert>

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mc-form-group" controlId="email">
              <Form.Label className="mc-form-label">
                <i className="bi bi-envelope me-2"></i>Email Address
              </Form.Label>
              <Form.Control
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mc-form-control"
              />
            </Form.Group>

            <Form.Group className="mc-form-group" controlId="password">
              <Form.Label className="mc-form-label">
                <i className="bi bi-lock me-2"></i>Password
              </Form.Label>
              <div className="position-relative">
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="mc-form-control pe-5"
                />
                <button
                  type="button"
                  className="mc-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
            </Form.Group>

            <Button
              variant="primary"
              type="submit"
              className="mc-btn-primary w-100 mb-3"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Signing In...
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Sign In
                </>
              )}
            </Button>

            <div className="text-center">
              <p className="mb-0 text-muted">
                Don't have an account?{" "}
                <Link to="/register" className="text-decoration-none fw-semibold" style={{ color: 'var(--mc-primary-600)' }}>
                  Create Account
                </Link>
              </p>
            </div>
          </Form>

          <div className="text-center mt-4 pt-3 border-top">
            <small className="text-muted">
              <i className="bi bi-shield-lock me-1"></i>
              Your data is encrypted and secure
            </small>
          </div>
        </Card>
      </Container>
    </div>
  );
}

export default Login;