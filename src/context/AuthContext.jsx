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

const DEFAULT_PERMISSIONS = {
  Admin: ["inventario", "stock", "ventas", "catalogo", "usuarios"],
  Vendedor: ["ventas"],
  Usuario: [],
};

const getDefaultPermissions = (userRole) => DEFAULT_PERMISSIONS[userRole] ?? [];

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const snap = await getDoc(doc(db, "users", currentUser.uid));
          const data = snap.exists() ? snap.data() : {};
          const userRole = data.role ?? null;
          const userPermissions =
            data.permissions && data.permissions.length > 0
              ? data.permissions
              : getDefaultPermissions(userRole);
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
    });
    return () => unsubscribe();
  }, []);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const userRef = doc(db, "users", result.user.uid);
    const snap = await getDoc(userRef);
    let userRole = snap.exists() ? snap.data().role || "Vendedor" : "Vendedor";
    let userPermissions = snap.exists() ? snap.data().permissions : undefined;

    if (!snap.exists()) {
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

