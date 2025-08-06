import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
} from "../firebase/firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";

const Login = () => {
  const auth = getAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      setErrorMessage("No se pudo iniciar sesión. Verifica tus credenciales.");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate("/");
    } catch (error) {
      console.error("Error al iniciar sesión con Google:", error);
      setErrorMessage(
        "Error al iniciar sesión con Google. Verifica la configuración de Firebase.",
      );
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Iniciar Sesión</h2>
      <form onSubmit={handleEmailLogin} style={{ marginBottom: 20 }}>
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
      <button onClick={handleGoogleLogin}>Ingresar con Google</button>
      {errorMessage && (
        <p style={{ color: "red", marginTop: 20 }}>{errorMessage}</p>
      )}
    </div>
  );
};

export default Login;

