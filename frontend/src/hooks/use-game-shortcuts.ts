import { useMemo } from "react";
import { useShortcut, type Shortcut } from "./use-shortcut";

export interface GameShortcutHandlers {
  canToggleAutoCashout: boolean;
  isCommandModalOpen: boolean;
  onCashout: () => void;
  onCloseCommands: () => void;
  onDecreaseBet: () => void;
  onForceCloseDialogue: () => void;
  onIncreaseBet: () => void;
  onSubmitBet: () => void;
  onToggleAutoCashout: () => void;
  onToggleCommands: () => void;
}

export function useGameShortcuts({
  canToggleAutoCashout,
  isCommandModalOpen,
  onCashout,
  onCloseCommands,
  onDecreaseBet,
  onForceCloseDialogue,
  onIncreaseBet,
  onSubmitBet,
  onToggleAutoCashout,
  onToggleCommands,
}: GameShortcutHandlers): void {
  const shortcuts = useMemo<Shortcut[]>(
    () => [
      {
        key: "h",
        handler: onToggleCommands,
      },
      {
        key: "b",
        handler: onSubmitBet,
        options: { debounce: 150 },
      },
      {
        key: "c",
        handler: onCashout,
        options: { allowInInputs: true },
      },
      {
        key: "a",
        handler: () => {
          if (canToggleAutoCashout) {
            onToggleAutoCashout();
          }
        },
      },
      {
        key: "[",
        handler: onDecreaseBet,
        options: { debounce: 80 },
      },
      {
        key: "]",
        handler: onIncreaseBet,
        options: { debounce: 80 },
      },
      {
        key: "Escape",
        handler: () => {
          if (isCommandModalOpen) {
            onCloseCommands();
            return;
          }

          onForceCloseDialogue();
        },
      },
    ],
    [
      canToggleAutoCashout,
      isCommandModalOpen,
      onCashout,
      onCloseCommands,
      onDecreaseBet,
      onForceCloseDialogue,
      onIncreaseBet,
      onSubmitBet,
      onToggleAutoCashout,
      onToggleCommands,
    ],
  );

  useShortcut(shortcuts);
}
