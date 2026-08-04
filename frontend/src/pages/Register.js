import React, { useState, useEffect } from "react";
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
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const validatePasswordRequirements = () => {
    const reqs = {
      length: form.password.length >= 8 && form.password.length <= 128,
      uppercase: /[A-Z]/.test(form.password),
      lowercase: /[a-z]/.test(form.password),
      digit: /[0-9]/.test(form.password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~ ]/.test(form.password),
    };
    return reqs;
  };

  const passwordRequirements = validatePasswordRequirements();
  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);

  // Real-time password match validation
  useEffect(() => {
    if (form.confirmPassword && form.password !== form.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: "Passwords do not match" }));
    } else if (form.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: null }));
    }
  }, [form.password, form.confirmPassword]);

  const validateForm = () => {
    const newErrors = {};

    if (form.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!allRequirementsMet) {
      newErrors.password = "Password does not meet all requirements";
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

    const result = await register(form.name, form.email, form.password);

    if (result.success) {
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
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  isInvalid={!!errors.password}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
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

              {/* Password Requirements Checklist */}
              {passwordFocused && (
                <div className="password-requirements mt-2 p-3 rounded" style={{ background: '#f8f9fa' }}>
                  <small className="text-muted mb-2 d-block">Password must contain:</small>
                  <div className="d-flex flex-column gap-1">
                    <div className={`req-item ${passwordRequirements.length ? 'met' : 'unmet'}`}>
                      <i className={`bi ${passwordRequirements.length ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'}`}></i>
                      <small>At least 8 characters (max 128)</small>
                    </div>
                    <div className={`req-item ${passwordRequirements.uppercase ? 'met' : 'unmet'}`}>
                      <i className={`bi ${passwordRequirements.uppercase ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'}`}></i>
                      <small>One uppercase letter (A-Z)</small>
                    </div>
                    <div className={`req-item ${passwordRequirements.lowercase ? 'met' : 'unmet'}`}>
                      <i className={`bi ${passwordRequirements.lowercase ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'}`}></i>
                      <small>One lowercase letter (a-z)</small>
                    </div>
                    <div className={`req-item ${passwordRequirements.digit ? 'met' : 'unmet'}`}>
                      <i className={`bi ${passwordRequirements.digit ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'}`}></i>
                      <small>One digit (0-9)</small>
                    </div>
                    <div className={`req-item ${passwordRequirements.special ? 'met' : 'unmet'}`}>
                      <i className={`bi ${passwordRequirements.special ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'}`}></i>
                      <small>One special character (!@#$%^&*)</small>
                    </div>
                  </div>
                </div>
              )}
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
              {errors.confirmPassword && (
                <div className="text-danger mt-1 small">
                  <i className="bi bi-exclamation-circle me-1"></i>
                  {errors.confirmPassword}
                </div>
              )}
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
              variant="primary"
              type="submit"
              className="mc-btn-primary w-100 mb-3"
              disabled={loading || !allRequirementsMet}
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