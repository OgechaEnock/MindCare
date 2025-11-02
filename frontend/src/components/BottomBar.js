import React from "react";

function BottomBar() {
  return (
    <footer
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        textAlign: "center",
        padding: "0.8rem",
        fontSize: "0.9rem",
      }}
    >
      <p style={{ margin: 0 }}>
        © {new Date().getFullYear()} MindCare — Empowering mental wellness 🌿
      </p>
    </footer>
  );
}

export default BottomBar;
