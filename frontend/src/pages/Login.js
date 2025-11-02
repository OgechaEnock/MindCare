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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate("/dashboard");
    }

    setLoading(false);
  };

  return (
    <Container 
      className="d-flex justify-content-center align-items-center" 
      style={{ minHeight: "100vh" }}
    >
      <Card className="p-4 shadow" style={{ width: "100%", maxWidth: "450px" }}>
        <div className="text-center mb-4">
          <i className="bi bi-heart-pulse-fill text-primary" style={{ fontSize: "3rem" }}></i>
          <h3 className="mt-3">Welcome Back</h3>
          <p className="text-muted">Login to your MindCare account</p>
        </div>

        <Alert variant="info" className="small">
          <i className="bi bi-info-circle me-2"></i>
          <strong>Crisis Support:</strong> If you're experiencing a mental health emergency, 
          please call your local emergency services immediately.
        </Alert>

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="email">
            <Form.Label>Email Address</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="password">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </Form.Group>

          <Button 
            variant="primary" 
            type="submit" 
            className="w-100 mb-3"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </Button>

          <div className="text-center">
            <p className="mb-0">
              Don't have an account?{" "}
              <Link to="/register" className="text-decoration-none">
                Register here
              </Link>
            </p>
          </div>
        </Form>

        <div className="text-center mt-3 text-muted small">
          <i className="bi bi-shield-lock me-1"></i>
          Your data is encrypted and secure
        </div>
      </Card>
    </Container>
  );
}

export default Login;