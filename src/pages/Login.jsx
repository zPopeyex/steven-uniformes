import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

const Login = () => {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("No se pudo iniciar sesión. Verifica tus credenciales.");
    }
  };

  const handleGoogle = async () => {
    try {
      await loginWithGoogle();
      navigate("/");
    } catch {
      setError("Error al iniciar sesión con Google.");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Iniciar Sesión</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
        <div>
          <input
            type="email"
            placeholder="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit">Ingresar</button>
      </form>
      <button onClick={handleGoogle}>Continuar con Google</button>
      {error && <p style={{ color: "red", marginTop: 20 }}>{error}</p>}
    </div>
  );
};

export default Login;

