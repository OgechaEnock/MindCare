import React, { useState, useEffect } from "react";
import { Navbar, Nav, Container, Button } from "react-bootstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

function Navigation() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
    { path: '/medications', icon: 'bi-capsule', label: 'Medications' },
    { path: '/appointments', icon: 'bi-calendar-event', label: 'Appointments' },
    { path: '/forum', icon: 'bi-chat-dots', label: 'Forum' },
    { path: '/profile', icon: 'bi-person-circle', label: 'Profile' },
  ];

  return (
    <Navbar
      expand="lg"
      className={`navbar-custom shadow-sm ${scrolled ? 'scrolled' : ''}`}
      style={{
        background: scrolled 
          ? 'rgba(255, 255, 255, 0.9)' 
          : 'linear-gradient(135deg, var(--mc-primary-600) 0%, var(--mc-primary-700) 100%)',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        transition: 'all var(--mc-transition-normal)',
      }}
    >
      <Container>
        <Navbar.Brand 
          as={Link} 
          to={user ? "/dashboard" : "/"} 
          className="brand-custom d-flex align-items-center"
          style={scrolled ? { color: 'var(--mc-primary-600)' } : {}}
        >
          <i className="bi bi-brain me-2" style={{ fontSize: '1.5rem' }}></i>
          <span className="fw-bold">MindCare</span>
        </Navbar.Brand>

        <Navbar.Toggle 
          aria-controls="main-navbar-nav" 
          className="border-0"
          style={{ 
            backgroundColor: scrolled ? 'var(--mc-primary-100)' : 'rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '0.5rem',
            transition: 'all var(--mc-transition-fast)'
          }}
        >
          <span className="navbar-toggler-icon"></span>
        </Navbar.Toggle>

        <Navbar.Collapse id="main-navbar-nav">
          <Nav className="me-auto ms-lg-4">
            {user && navItems.map((item) => (
              <Nav.Link 
                key={item.path}
                as={Link} 
                to={item.path}
                className={`nav-link-custom d-flex align-items-center ${isActive(item.path) ? 'active' : ''}`}
              >
                <i className={`bi ${item.icon} me-2`}></i>
                {item.label}
              </Nav.Link>
            ))}
          </Nav>

          <Nav className="align-items-lg-center">
            {user ? (
              <div className="d-flex align-items-center gap-2">
                <NotificationBell />
                
                <div className="text-white me-2 d-none d-lg-block">
                  <small className="opacity-75 d-block" style={{ fontSize: '0.75rem' }}>Welcome,</small>
                  <div className="fw-bold" style={{ 
                    fontSize: '0.9rem',
                    color: scrolled ? 'var(--mc-text-primary)' : 'var(--mc-text-inverse)'
                  }}>
                    {user.name || user.email}
                  </div>
                </div>
                
                <Button
                  variant={scrolled ? "primary" : "light"}
                  size="sm"
                  onClick={handleLogout}
                  className="logout-btn d-flex align-items-center"
                >
                  <i className="bi bi-box-arrow-right me-2"></i>
                  Logout
                </Button>
              </div>
            ) : (
              <div className="d-flex gap-2 mt-2 mt-lg-0">
                <Button
                  as={Link}
                  to="/"
                  variant={scrolled ? "outline-primary" : "outline-light"}
                  size="sm"
                  className="auth-btn"
                >
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Login
                </Button>
                <Button
                  as={Link}
                  to="/register"
                  variant={scrolled ? "primary" : "light"}
                  size="sm"
                  className="auth-btn-register"
                >
                  <i className="bi bi-person-plus me-2"></i>
                  Register
                </Button>
              </div>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>

      {/* Custom Styles */}
      <style>{`
        .navbar-custom {
          padding: 1rem 0;
          transition: all var(--mc-transition-normal);
        }

        .navbar-custom.scrolled {
          padding: 0.75rem 0;
          box-shadow: var(--mc-shadow-md) !important;
        }

        .brand-custom {
          font-size: 1.5rem;
          transition: all var(--mc-transition-normal);
        }

        .brand-custom:hover {
          transform: scale(1.05);
          opacity: 0.9;
        }

        .nav-link-custom {
          color: ${scrolled ? 'var(--mc-text-primary)' : 'rgba(255, 255, 255, 0.9)'} !important;
          padding: 0.6rem 1rem !important;
          margin: 0.2rem;
          border-radius: 8px;
          font-weight: 500;
          transition: all var(--mc-transition-normal);
          position: relative;
        }

        .nav-link-custom:hover {
          color: ${scrolled ? 'var(--mc-primary-600)' : 'white'} !important;
          background-color: ${scrolled ? 'var(--mc-primary-50)' : 'rgba(255, 255, 255, 0.15)'};
          transform: translateY(-2px);
        }

        .nav-link-custom.active {
          color: ${scrolled ? 'var(--mc-primary-600)' : 'white'} !important;
          background-color: ${scrolled ? 'var(--mc-primary-100)' : 'rgba(255, 255, 255, 0.25)'};
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .nav-link-custom.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 30px;
          height: 3px;
          background: ${scrolled ? 'var(--mc-primary-600)' : 'white'};
          border-radius: 2px;
        }

        .logout-btn {
          padding: 0.5rem 1.2rem;
          border-radius: 8px;
          font-weight: 600;
          transition: all var(--mc-transition-normal);
        }

        .logout-btn:hover {
          transform: translateY(-2px);
          box-shadow: var(--mc-shadow-md);
        }

        .auth-btn {
          padding: 0.5rem 1.2rem;
          border-radius: 8px;
          font-weight: 600;
          transition: all var(--mc-transition-normal);
        }

        .auth-btn-register {
          padding: 0.5rem 1.2rem;
          border-radius: 8px;
          font-weight: 600;
          transition: all var(--mc-transition-normal);
        }

        @media (max-width: 991px) {
          .nav-link-custom {
            margin: 0.3rem 0;
          }
        }
      `}</style>
    </Navbar>
  );
}

export default Navigation;