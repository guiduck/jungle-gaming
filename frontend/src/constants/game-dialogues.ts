import type { DialogueLine } from "../stores/dialogue-store";

export type PlayerBetDialogueState = "none" | "pending" | "cashed_out" | "lost";

export const tutorialDialogues: DialogueLine[] = [
  {
    id: "tutorial-bet",
    speakerName: "Nina, a cabra alpinista",
    text:
      "Primeiro, espere a fase de apostas. Escolha o valor, ligue o saque automatico se quiser, e coloque a aposta antes da subida comecar.",
  },
  {
    id: "tutorial-run",
    speakerName: "Nina, a cabra alpinista",
    text:
      "Quando a rodada estiver subindo, o multiplicador sobe comigo. Saque antes do crash para transformar a escalada em pagamento.",
  },
  {
    id: "tutorial-verify",
    speakerName: "Nina, a cabra alpinista",
    text:
      "Depois da queda, confira historico, ranking, suas apostas e a verificacao provably fair. Agora vou abrir os comandos do teclado.",
    actionLabel: "Mostrar comandos",
  },
];

export const welcomeDialogues: DialogueLine[] = [
  {
    id: "welcome-thanks",
    speakerName: "Nina, a cabra alpinista",
    text:
      "Bem-vindo ao Goat Run. Obrigada por visitar o desafio: eu sou a Nina e vou guiar a primeira subida.",
  },
  {
    id: "welcome-goal",
    speakerName: "Nina, a cabra alpinista",
    text:
      "Aqui a montanha e o multiplicador sobem juntos. Para apostar de verdade, entre com Keycloak; por enquanto, esta apresentacao e publica.",
  },
  {
    id: "welcome-login",
    speakerName: "Nina, a cabra alpinista",
    text:
      "Quando estiver pronto, use o botao de entrada segura. Depois do login eu levo voce direto para a tela do jogo.",
  },
];

export function phaseDialogue(
  status: string | undefined,
  cashoutState: string,
  playerBetState: PlayerBetDialogueState,
): DialogueLine | undefined {
  if (playerBetState === "cashed_out" && cashoutState === "accepted") {
    return {
      id: "cashout-accepted-cashed-out",
      speakerName: "Nina, a cabra alpinista",
      text: "Belo saque. Guardamos o folego, garantimos o pagamento e seguimos para a proxima trilha.",
      autoCloseDelayMs: 3600,
    };
  }

  if (playerBetState === "pending" && cashoutState === "rejected") {
    return {
      id: "cashout-rejected-pending",
      speakerName: "Nina, a cabra alpinista",
      text: "Esse saque nao passou pelo servidor. Vamos esperar a proxima janela boa e tentar de novo.",
      autoCloseDelayMs: 3600,
    };
  }

  if (status === "betting") {
    if (playerBetState === "pending") {
      return {
        id: "phase-betting-pending",
        speakerName: "Nina, a cabra alpinista",
        text: "A aposta esta pronta no acampamento. Agora e esperar a largada e escolher bem o saque.",
        autoCloseDelayMs: 4200,
      };
    }

    return {
      id: "phase-betting-none",
      speakerName: "Nina, a cabra alpinista",
      text: "A trilha abriu. Escolha uma aposta e me mande para a subida quando estiver pronto.",
      autoCloseDelayMs: 4200,
    };
  }

  if (status === "running") {
    if (playerBetState === "pending") {
      return {
        id: "phase-running-pending",
        speakerName: "Nina, a cabra alpinista",
        text: "La vamos nos. Se o multiplicador ja estiver bom, saque antes que a montanha cobre o preco.",
        autoCloseDelayMs: 4200,
      };
    }

    if (playerBetState === "cashed_out") {
      return {
        id: "phase-running-cashed-out",
        speakerName: "Nina, a cabra alpinista",
        text: "Saque garantido. Agora da para assistir a subida sem pressa e torcer pela cabra.",
        autoCloseDelayMs: 4200,
      };
    }

    return {
      id: "phase-running-none",
      speakerName: "Nina, a cabra alpinista",
      text: "A Nina ja esta subindo nesta rodada. Sem aposta ativa, observe a curva e prepare a proxima entrada.",
      autoCloseDelayMs: 4200,
    };
  }

  if (status === "crashed") {
    if (playerBetState === "cashed_out") {
      return {
        id: "phase-crashed-cashed-out",
        speakerName: "Nina, a cabra alpinista",
        text: "Crash, mas seu saque ja estava seguro. Bela leitura da montanha.",
        autoCloseDelayMs: 4200,
      };
    }

    if (playerBetState === "lost") {
      return {
        id: "phase-crashed-lost",
        speakerName: "Nina, a cabra alpinista",
        text: "Crash. Essa aposta ficou na encosta, mas a proxima trilha ja vem ai.",
        autoCloseDelayMs: 4200,
      };
    }

    return {
      id: "phase-crashed-none",
      speakerName: "Nina, a cabra alpinista",
      text: "Crash. Rodada encerrada; confira o ponto revelado e prepare a proxima tentativa.",
      autoCloseDelayMs: 4200,
    };
  }

  return undefined;
}
