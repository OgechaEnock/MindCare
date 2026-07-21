import React from "react";

function BottomBar() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        background: "linear-gradient(135deg, var(--mc-primary-600) 0%, var(--mc-primary-800) 50%, #764ba2 100%)",
        color: "white",
        textAlign: "center",
        padding: "var(--mc-space-lg)",
        fontSize: "0.9rem",
      }}
      className="mt-auto"
    >
      <p style={{ margin: 0 }} className="mb-0">
        © {currentYear} MindCare — Empowering mental wellness
      </p>
    </footer>
  );
}

export default BottomBar;