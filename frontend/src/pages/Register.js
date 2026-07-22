import React, { useState } from "react";
import { Form, Button, Container, Card } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    password: "",
    confirmPassword: "" 
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (form.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (form.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const success = await register({
      name: form.name,
      email: form.email,
      password: form.password
    });

    if (success) {
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
            <div className="mc-auth-icon" style={{ color: 'var(--mc-success)' }}>
              <i className="bi bi-person-plus-fill"></i>
            </div>
            <h3 className="mc-auth-title">Create Account</h3>
            <p className="mc-auth-subtitle">Join our supportive community today</p>
          </div>

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mc-form-group" controlId="name">
              <Form.Label className="mc-form-label">
                <i className="bi bi-person me-2"></i>Full Name
              </Form.Label>
              <Form.Control
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
                required
                isInvalid={!!errors.name}
                className="mc-form-control"
              />
              <Form.Control.Feedback type="invalid">
                {errors.name}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mc-form-group" controlId="email">
              <Form.Label className="mc-form-label">
                <i className="bi bi-envelope me-2"></i>Email Address
              </Form.Label>
              <Form.Control
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                isInvalid={!!errors.email}
                className="mc-form-control"
              />
              <Form.Control.Feedback type="invalid">
                {errors.email}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mc-form-group" controlId="password">
              <Form.Label className="mc-form-label">
                <i className="bi bi-lock me-2"></i>Password
              </Form.Label>
              <div className="position-relative">
                <Form.Control
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  isInvalid={!!errors.password}
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
              <Form.Control.Feedback type="invalid">
                {errors.password}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mc-form-group" controlId="confirmPassword">
              <Form.Label className="mc-form-label">
                <i className="bi bi-lock-fill me-2"></i>Confirm Password
              </Form.Label>
              <div className="position-relative">
                <Form.Control
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  isInvalid={!!errors.confirmPassword}
                  className="mc-form-control pe-5"
                />
                <button
                  type="button"
                  className="mc-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
              <Form.Control.Feedback type="invalid">
                {errors.confirmPassword}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Check
                type="checkbox"
                id="terms-check"
                label={
                  <small>
                    I understand this is an educational project and not for actual medical use
                  </small>
                }
                required
              />
            </Form.Group>

            <Button 
              variant="success" 
              type="submit" 
              className="mc-btn-primary w-100 mb-3"
              disabled={loading}
              style={{ background: 'linear-gradient(135deg, var(--mc-success) 0%, var(--mc-secondary-600) 100%)' }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Creating Account...
                </>
              ) : (
                <>
                  <i className="bi bi-person-check me-2"></i>
                  Create Account
                </>
              )}
            </Button>

            <div className="text-center">
              <p className="mb-0 text-muted">
                Already have an account?{" "}
                <Link to="/" className="text-decoration-none fw-semibold" style={{ color: 'var(--mc-primary-600)' }}>
                  Sign In
                </Link>
              </p>
            </div>
          </Form>
        </Card>
      </Container>
    </div>
  );
}

export default Register;