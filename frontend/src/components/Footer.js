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
                <i className="bi bi-brain me-2" style={{ fontSize: '2rem' }}></i>
                <h4 className="d-inline fw-bold">MindCare</h4>
              </div>
              <p className="footer-text">
                Supporting mental health through comprehensive tools for medication management, 
                appointment scheduling, and community support. Your wellness journey starts here.
              </p>
              <div className="social-links mt-3">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon">
                  <i className="bi bi-facebook"></i>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon">
                  <i className="bi bi-twitter"></i>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon">
                  <i className="bi bi-instagram"></i>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-icon">
                  <i className="bi bi-linkedin"></i>
                </a>
              </div>
            </Col>

            {/* Quick Links */}
            <Col lg={3} md={6} className="mb-4 mb-lg-0">
              <h5 className="footer-heading mb-3">Quick Links</h5>
              <ul className="footer-links">
                <li><Link to="/dashboard">Dashboard</Link></li>
                <li><Link to="/medications">Medications</Link></li>
                <li><Link to="/appointments">Appointments</Link></li>
                <li><Link to="/forum">Community Forum</Link></li>
                <li><Link to="/profile">My Profile</Link></li>
              </ul>
            </Col>

            {/* Crisis Support */}
            <Col lg={4} md={12}>
              <h5 className="footer-heading mb-3">
                <i className="bi bi-telephone-fill me-2"></i>
                24/7 Crisis Support
              </h5>
              <div className="crisis-box">
                <p className="mb-2 fw-bold">Emergency Help Available Now</p>
                <p className="mb-2">
                  <i className="bi bi-telephone me-2"></i>
                  <a href="tel:988" className="crisis-link">988 - Suicide & Crisis Lifeline</a>
                </p>
                <p className="mb-2">
                  <i className="bi bi-chat-dots me-2"></i>
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
              <p className="mb-0">
                © {currentYear} MindCare. All rights reserved.
              </p>
            </Col>
            <Col md={6} className="text-center text-md-end">
              <p className="mb-0">
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .footer-main {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .footer-brand {
          color: white;
        }

        .footer-text {
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.6;
          font-size: 0.95rem;
        }

        .footer-heading {
          font-weight: 600;
          color: white;
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
          color: rgba(255, 255, 255, 0.85);
          text-decoration: none;
          transition: all 0.3s ease;
          display: inline-block;
          position: relative;
        }

        .footer-links a:hover {
          color: white;
          transform: translateX(5px);
        }

        .footer-links a::before {
          content: '→';
          position: absolute;
          left: -20px;
          opacity: 0;
          transition: all 0.3s ease;
        }

        .footer-links a:hover::before {
          left: -15px;
          opacity: 1;
        }

        .social-links {
          display: flex;
          gap: 1rem;
        }

        .social-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          text-decoration: none;
          transition: all 0.3s ease;
          font-size: 1.2rem;
        }

        .social-icon:hover {
          background-color: white;
          color: #667eea;
          transform: translateY(-3px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }

        .crisis-box {
          background-color: rgba(255, 255, 255, 0.1);
          padding: 1.2rem;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
        }

        .crisis-link {
          color: white;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .crisis-link:hover {
          color: #ffd700;
          text-decoration: underline;
        }

        .footer-bottom {
          background-color: rgba(0, 0, 0, 0.2);
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.85);
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

          .footer-links a::before {
            display: none;
          }

          .footer-links a:hover {
            transform: scale(1.05);
          }
        }

        /* Animation for footer appearance */
        .footer-custom {
          animation: slideUp 0.5s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </footer>
  );
}

export default Footer;