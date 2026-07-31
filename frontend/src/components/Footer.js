import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-custom mt-auto">
      {/* Main Footer */}
      <div className="footer-main">
        <Container>
          <Row className="py-5">
            {/* About Section */}
            <Col lg={5} md={6} className="mb-4 mb-lg-0">
              <div className="footer-brand mb-3">
                <i className="bi bi-brain me-2" style={{ fontSize: '2rem', color: 'var(--mc-primary-400)' }}></i>
                <h4 className="d-inline fw-bold mb-0">MindCare</h4>
              </div>
              <p className="footer-text">
                Supporting mental health through comprehensive tools for medication management,
                appointment scheduling, and community support. Your wellness journey starts here.
              </p>
              <div className="social-links mt-3">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Facebook">
                  <i className="bi bi-facebook"></i>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Twitter">
                  <i className="bi bi-twitter-x"></i>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Instagram">
                  <i className="bi bi-instagram"></i>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="LinkedIn">
                  <i className="bi bi-linkedin"></i>
                </a>
              </div>
            </Col>

            {/* Quick Links */}
            <Col lg={3} md={6} className="mb-4 mb-lg-0">
              <h5 className="footer-heading mb-3">Quick Links</h5>
              <ul className="footer-links">
                <li>
                  <Link to="/dashboard">
                    <i className="bi bi-speedometer2 me-2"></i>Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/medications">
                    <i className="bi bi-capsule me-2"></i>Medications
                  </Link>
                </li>
                <li>
                  <Link to="/appointments">
                    <i className="bi bi-calendar-event me-2"></i>Appointments
                  </Link>
                </li>
                <li>
                  <Link to="/forum">
                    <i className="bi bi-chat-dots me-2"></i>Community Forum
                  </Link>
                </li>
                <li>
                  <Link to="/profile">
                    <i className="bi bi-person-circle me-2"></i>My Profile
                  </Link>
                </li>
              </ul>
            </Col>

            {/* Crisis Support */}
            <Col lg={4} md={12}>
              <h5 className="footer-heading mb-3">
                <i className="bi bi-telephone-fill me-2"></i>
                24/7 Crisis Support
              </h5>
              <div className="crisis-box">
                <p className="mb-2 fw-bold fs-5">Emergency Help Available Now</p>
                <p className="mb-2">
                  <i className="bi bi-telephone me-2 fs-5"></i>
                  <a href="tel:988" className="crisis-link fw-bold">
                    988 - Suicide & Crisis Lifeline
                  </a>
                </p>
                <p className="mb-2">
                  <i className="bi bi-chat-dots me-2 fs-5"></i>
                  <a href="https://988lifeline.org/chat/" target="_blank" rel="noopener noreferrer" className="crisis-link">
                    Crisis Chat Support
                  </a>
                </p>
                <p className="mb-0 small mt-3 opacity-75">
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  If you're in immediate danger, call 911
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Bottom Footer */}
      <div className="footer-bottom">
        <Container>
          <Row className="align-items-center py-3">
            <Col md={6} className="text-center text-md-start mb-2 mb-md-0">
              <p className="mb-0 small">
                © {currentYear} MindCare. All rights reserved.
              </p>
            </Col>
            <Col md={6} className="text-center text-md-end">
              <p className="mb-0 small">
                <i className="bi bi-heart-fill text-danger me-1"></i>
                Made with care for mental wellness
              </p>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Custom Styles */}
      <style>{`
        .footer-custom {
          background: var(--mc-bg-primary);
          border-top: 1px solid var(--mc-bg-tertiary);
          margin-top: var(--mc-space-xl);
        }

        .footer-main {
          background: linear-gradient(135deg, var(--mc-primary-50) 0%, var(--mc-secondary-50) 100%);
          padding-top: var(--mc-space-2xl);
        }

        .footer-brand {
          display: flex;
          align-items: center;
        }

        .footer-text {
          color: var(--mc-text-secondary);
          line-height: 1.6;
          font-size: 0.95rem;
        }

        .footer-heading {
          font-weight: 600;
          color: var(--mc-text-primary);
          font-size: 1.1rem;
          margin-bottom: 1rem;
        }

        .footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .footer-links li {
          margin-bottom: 0.6rem;
        }

        .footer-links a {
          color: var(--mc-text-secondary);
          text-decoration: none;
          transition: all var(--mc-transition-fast);
          display: inline-flex;
          align-items: center;
          font-size: 0.95rem;
        }

        .footer-links a:hover {
          color: var(--mc-primary-600);
          transform: translateX(5px);
        }

        .social-links {
          display: flex;
          gap: 1rem;
        }

        .social-icon {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--mc-bg-gradient);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          text-decoration: none;
          transition: all var(--mc-transition-normal);
          font-size: 1.2rem;
        }

        .social-icon:hover {
          transform: translateY(-3px) scale(1.1);
          box-shadow: var(--mc-shadow-lg);
        }

        .crisis-box {
          background: var(--mc-bg-primary);
          padding: var(--mc-space-lg);
          border-radius: var(--mc-radius-lg);
          border: 1px solid var(--mc-warning);
          box-shadow: var(--mc-shadow-md);
        }

        .crisis-link {
          color: var(--mc-text-primary);
          text-decoration: none;
          transition: color var(--mc-transition-fast);
        }

        .crisis-link:hover {
          color: var(--mc-primary-600);
          text-decoration: underline;
        }

        .footer-bottom {
          background: var(--mc-bg-secondary);
          font-size: 0.875rem;
          color: var(--mc-text-tertiary);
        }

        .footer-bottom p {
          margin: 0;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .footer-main {
            text-align: center;
          }

          .social-links {
            justify-content: center;
          }

          .footer-links a {
            transform: none !important;
          }

          .footer-links a:hover {
            transform: scale(1.05) !important;
          }

          .crisis-box {
            text-align: center;
          }
        }
      `}</style>
    </footer>
  );
}

export default Footer;