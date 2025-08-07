/* eslint react-refresh/only-export-components: "off" */
import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, GoogleAuthProvider } from "../firebase/firebaseConfig";

// ---- Permisos base por rol ----
const DEFAULT_PERMISSIONS = {
  Admin: ["inventario", "stock", "ventas", "catalogo", "usuarios"],
  Vendedor: ["ventas"],
  Usuario: [],
};

const normalizeRole = (role) => {
  if (!role) return null;
  const lowered = role.toLowerCase();
  if (lowered === "admin") return "Admin";
  if (lowered === "vendedor") return "Vendedor";
  if (lowered === "usuario") return "Usuario";
  return role;
};

const getDefaultPermissions = (userRole) => {
  const normalized = normalizeRole(userRole);
  return DEFAULT_PERMISSIONS[normalized] ?? [];
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      // 🔽 Pasa todo el código async a esta función:
      const handleUser = async () => {
        if (currentUser) {
          try {
            const userRef = doc(db, "users", currentUser.uid);
            const snap = await getDoc(userRef);
            const data = snap.exists() ? snap.data() : {};
            let userRole = normalizeRole(data.role);
            let userPermissions = data.permissions;

            // Asigna permisos si es Admin o faltan permisos
            if (userRole === "Admin") {
              userPermissions = DEFAULT_PERMISSIONS.Admin;
              if (
                !data.permissions ||
                data.permissions.length !== DEFAULT_PERMISSIONS.Admin.length
              ) {
                await setDoc(
                  userRef,
                  { role: userRole, permissions: userPermissions },
                  { merge: true }
                );
              }
            } else if (!userPermissions || userPermissions.length === 0) {
              userPermissions = getDefaultPermissions(userRole);
              await setDoc(
                userRef,
                { role: userRole, permissions: userPermissions },
                { merge: true }
              );
            }

            setRole(userRole);
            setPermissions(userPermissions);
          } catch (error) {
            console.error("Error fetching user data:", error);
            setRole(null);
            setPermissions([]);
          }
        } else {
          setRole(null);
          setPermissions([]);
        }
        setLoading(false);
      };

      handleUser();
    });
    return () => unsubscribe();
  }, []);

  // ---- Login normal ----
  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  // ---- Login con Google ----
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const userRef = doc(db, "users", result.user.uid);
    const snap = await getDoc(userRef);

    let userRole = snap.exists() ? normalizeRole(snap.data().role) : "Vendedor";
    userRole = userRole || "Vendedor";
    let userPermissions = snap.exists() ? snap.data().permissions : undefined;

    if (userRole === "Admin") {
      userPermissions = DEFAULT_PERMISSIONS.Admin;
      if (
        !snap.exists() ||
        !snap.data().permissions ||
        snap.data().permissions.length !== DEFAULT_PERMISSIONS.Admin.length
      ) {
        await setDoc(
          userRef,
          { role: userRole, permissions: userPermissions },
          { merge: true }
        );
      }
    } else if (!snap.exists()) {
      userPermissions = getDefaultPermissions(userRole);
      await setDoc(
        userRef,
        { role: userRole, permissions: userPermissions },
        { merge: true }
      );
    } else if (!userPermissions || userPermissions.length === 0) {
      userPermissions = getDefaultPermissions(userRole);
      await setDoc(
        userRef,
        { permissions: userPermissions },
        { merge: true }
      );
    }

    setRole(userRole);
    setPermissions(userPermissions);
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        permissions,
        loading,
        login,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
