import React from "react";

function Footer() {
  return (
    <footer className="bg-white border-top py-4 mt-auto">
      <div className="container text-center">
        <small className="text-muted">
          <i className="bi bi-shield-lock me-1"></i>
          Your data is encrypted and secure • MindCare &copy; {new Date().getFullYear()}
        </small>
      </div>
    </footer>
  );
}

export default Footer;