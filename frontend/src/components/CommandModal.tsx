import { useEffect } from "react";

interface CommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  presentation?: "modal" | "inline";
}

const commands = [
  { key: "Enter", label: "Completar ou avancar o dialogo atual" },
  { key: "H", label: "Mostrar ou ocultar comandos" },
  { key: "B", label: "Apostar na rodada aberta" },
  { key: "C", label: "Sacar durante a subida" },
  { key: "A", label: "Ativar ou desativar saque automatico" },
  { key: "[", label: "Diminuir a aposta em R$ 1,00" },
  { key: "]", label: "Aumentar a aposta em R$ 1,00" },
  { key: "Esc", label: "Fechar modal ou dialogo atual" },
];

export function CommandModal({ isOpen, onClose, presentation = "modal" }: CommandModalProps) {
  useEffect(() => {
    if (!isOpen || presentation === "inline") {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, presentation]);

  if (!isOpen) {
    return null;
  }

  const modal = (
    <section
      className="command-modal"
      aria-modal={presentation === "modal"}
      aria-labelledby="command-modal-title"
      role="dialog"
      onClick={(event) => event.stopPropagation()}
    >
      <header className="command-header">
        <h2 id="command-modal-title">Comandos da escalada</h2>
        <button className="icon-button" onClick={onClose} aria-label="Fechar comandos">
          x
        </button>
      </header>
      <div className="command-content">
        <section>
          <h3>Como jogar</h3>
          <p>
            Aposte quando a trilha estiver aberta, acompanhe a cabra subir e saque antes do
            crash. O servidor continua decidindo rodada, crash, saldo e pagamento.
          </p>
        </section>
        <section>
          <h3>Teclado</h3>
          <div className="command-grid">
            {commands.map((command) => (
              <div className="command-item" key={command.key}>
                <kbd>{command.key}</kbd>
                <span>{command.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h3>Login</h3>
          <p>
            A tela do jogo abre o login em uma experiencia propria, mas a validacao segue pelo
            Keycloak com PKCE para manter o fluxo seguro do desafio.
          </p>
        </section>
      </div>
      <footer className="command-footer">
        <button onClick={onClose}>Entendi, vamos subir</button>
      </footer>
    </section>
  );

  if (presentation === "inline") {
    return modal;
  }

  return (
    <div className="command-overlay" onClick={onClose}>
      {modal}
    </div>
  );
}
