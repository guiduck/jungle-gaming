import { useCallback, useEffect, useRef, useState } from "react";
import { AuthenticatedGame } from "./components/AuthenticatedGame";
import { PublicWelcome } from "./components/PublicWelcome";
import {
  AUTH_REQUIRED_EVENT,
  type AuthRequiredDetail,
  beginKeycloakLogin,
  completeKeycloakLoginFromCallback,
  getAccessToken,
} from "./services/auth";

const LOGIN_REDIRECT_SECONDS = 10;

export function App() {
  const [isCompletingLogin, setIsCompletingLogin] = useState(true);
  const [hasToken, setHasToken] = useState(Boolean(getAccessToken()));
  const [isLoginRequired, setIsLoginRequired] = useState(false);
  const [loginCountdown, setLoginCountdown] = useState(LOGIN_REDIRECT_SECONDS);
  const [loginReason, setLoginReason] = useState("Sua sessao nao foi encontrada.");
  const loginStartedRef = useRef(false);

  const startLogin = useCallback(() => {
    if (loginStartedRef.current) {
      return;
    }

    loginStartedRef.current = true;
    setIsLoginRequired(true);
    setLoginReason("Abrindo login seguro no Keycloak...");
    void beginKeycloakLogin().catch((error) => {
      loginStartedRef.current = false;
      setLoginCountdown(LOGIN_REDIRECT_SECONDS);
      setLoginReason(error instanceof Error ? error.message : "Nao foi possivel abrir o Keycloak.");
    });
  }, []);

  useEffect(() => {
    void completeKeycloakLoginFromCallback()
      .then((completed) => {
        setHasToken(Boolean(getAccessToken()) || completed);
      })
      .catch((error) => {
        setLoginReason(error instanceof Error ? error.message : "Nao foi possivel concluir o login.");
        setHasToken(false);
      })
      .finally(() => setIsCompletingLogin(false));
  }, []);

  useEffect(() => {
    const handleAuthRequired = (event: Event) => {
      const detail = (event as CustomEvent<AuthRequiredDetail>).detail;
      loginStartedRef.current = false;
      setIsLoginRequired(true);
      setLoginReason(detail?.reason ?? "Sua sessao expirou ou nao foi encontrada.");
      setHasToken(false);
      setIsCompletingLogin(false);
    };

    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
    return () => window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
  }, []);

  useEffect(() => {
    if (isCompletingLogin || hasToken || !isLoginRequired) {
      return;
    }

    setLoginCountdown(LOGIN_REDIRECT_SECONDS);
    const timer = window.setInterval(() => {
      setLoginCountdown((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer);
          startLogin();
          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [hasToken, isCompletingLogin, isLoginRequired, startLogin]);

  if (isCompletingLogin) {
    return (
      <main className="auth-screen">
        <section className="panel auth-panel">
          <h1>Goat Run</h1>
          <p>Concluindo login Keycloak...</p>
        </section>
      </main>
    );
  }

  if (!hasToken) {
    return (
      <PublicWelcome
        isLoginRequired={isLoginRequired}
        loginCountdown={loginCountdown}
        loginReason={loginReason}
        onLogin={startLogin}
      />
    );
  }

  return <AuthenticatedGame />;
}
