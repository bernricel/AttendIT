import { GoogleLogin } from "@react-oauth/google";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import AuthLayout from "../components/AuthLayout";
import MessageBanner from "../components/MessageBanner";
import { ROUTES } from "../constants/routes";
import { loginWithGoogle } from "../services/authApi";
import {
  clearAuthSession,
  getDefaultRouteForUser,
  getStoredAuth,
  storeAuthSession,
} from "../services/authStorage";
import { getApiErrorMessage } from "../utils/apiError";
import { decodeJwt } from "../utils/decodeJwt";
import styles from "./LoginPage.module.css";
import common from "../styles/common.module.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const continueTo = location.state?.from || null;

  const hasGoogleClientId = useMemo(
    () => Boolean(googleClientId),
    [googleClientId]
  );

  const navigateAfterLogin = useCallback(
    (user) => {
      if (!user?.is_profile_complete) {
        navigate(ROUTES.COMPLETE_PROFILE, {
          replace: true,
          state: continueTo ? { from: continueTo } : undefined,
        });
        return;
      }

      if (continueTo) {
        const isFacultyPath = continueTo.startsWith("/faculty");
        const isAdminPath = continueTo.startsWith("/admin");
        const isUniversalScanPath = continueTo.startsWith("/scan/");
        if (
          ((isFacultyPath || isUniversalScanPath) && user.role === "faculty") ||
          (isAdminPath && user.role === "admin")
        ) {
          navigate(continueTo, { replace: true });
          return;
        }
      }

      navigate(getDefaultRouteForUser(user), { replace: true });
    },
    [continueTo, navigate]
  );

  useEffect(() => {
    const { token, user } = getStoredAuth();
    if (!token || !user) {
      return;
    }

    navigateAfterLogin(user);
  }, [navigateAfterLogin]);

  const handleGoogleLogin = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setError("Google did not return a credential token.");
      return;
    }

    setIsLoading(true);
    setError("");
    setStatusText("Signing in with your university Google account...");

    try {
      const decoded = decodeJwt(credentialResponse.credential);
      const payload = {
        id_token: credentialResponse.credential,
        google_user: {
          email: decoded?.email || "",
          name: decoded?.name || "",
        },
      };

      const data = await loginWithGoogle(payload);
      storeAuthSession({ token: data.token, user: data.user });

      navigateAfterLogin(data.user);
    } catch (apiError) {
      clearAuthSession();
      setError(
        getApiErrorMessage(apiError, "Sign in failed. Please try again.")
      );
    } finally {
      setIsLoading(false);
      setStatusText("");
    }
  };

  return (
    <AuthLayout
      title="AttendIT - CIT Faculty Attendance Portal"
      subtitle="Secure sign-in for CIT faculty and administrators."
      sideNote={
        <p>
          Access is limited to accounts ending with <strong>@ua.edu.ph</strong>.
        </p>
      }
    >
      <AuthCard
        title="Login"
        description="Access the CIT Faculty Attendance System."
      >
        {isLoading ? (
          <div className={styles.loaderLine}>Authenticating...</div>
        ) : null}
        <MessageBanner type="error" message={error} />
        <MessageBanner type="info" message={statusText} />

        {hasGoogleClientId ? (
          <div className={styles.googleBtnWrap}>
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => setError("Google sign in was canceled or failed.")}
              shape="pill"
              theme="outline"
              text="continue_with"
              size="large"
              width="100%"
            />
          </div>
        ) : (
          <MessageBanner
            type="error"
            message="Missing VITE_GOOGLE_CLIENT_ID. Add it to your frontend environment."
          />
        )}

        <div className={styles.authDivider} role="presentation">
          <span>or</span>
        </div>
        <Link className={`${common.ghostBtn} ${styles.authLinkBtn}`.trim()} to={ROUTES.ADMIN_LOGIN}>
          Admin Login
        </Link>
      </AuthCard>
    </AuthLayout>
  );
}
