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

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate("/");
    } catch (error) {
      console.error("Error al iniciar sesión con Google:", error);
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
    </div>
  );
};

export default Login;

