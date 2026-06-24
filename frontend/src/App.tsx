import { AuthenticatedGame } from "./components/AuthenticatedGame";
import { PublicWelcome } from "./components/PublicWelcome";
import { useApp } from "./hooks/use-app";

export function App() {
  const {
    hasToken,
    isCompletingLogin,
    isLoginRequired,
    loginCountdown,
    loginReason,
    startLogin,
  } = useApp();

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
