import { useEffect, useRef } from "react";
import {
  phaseDialogue,
  type PlayerBetDialogueState,
  tutorialDialogues,
} from "../game-dialogues";
import { useDialogueStore } from "../stores/dialogue-store";
import type { Round } from "../types";

export interface GameDialogueInput {
  cashoutState: string;
  playerBetState: PlayerBetDialogueState;
  round?: Round;
  onOpenCommands: () => void;
}

export function useGameDialogue({
  cashoutState,
  playerBetState,
  round,
  onOpenCommands,
}: GameDialogueInput): void {
  const showSequence = useDialogueStore((state) => state.showSequence);
  const showLine = useDialogueStore((state) => state.showLine);
  const tutorialCompleted = useDialogueStore((state) => state.tutorialCompleted);
  const shouldOpenCommands = useDialogueStore((state) => state.shouldOpenCommands);
  const consumeCommandPrompt = useDialogueStore((state) => state.consumeCommandPrompt);
  const lastPhaseDialogueId = useRef<string | undefined>(undefined);
  const tutorialStartedRef = useRef(false);

  useEffect(() => {
    if (!tutorialCompleted && round && !tutorialStartedRef.current) {
      tutorialStartedRef.current = true;
      showSequence("tutorial", tutorialDialogues);
    }
  }, [round, showSequence, tutorialCompleted]);

  useEffect(() => {
    if (shouldOpenCommands) {
      onOpenCommands();
      consumeCommandPrompt();
    }
  }, [consumeCommandPrompt, onOpenCommands, shouldOpenCommands]);

  useEffect(() => {
    if (!tutorialCompleted) {
      return;
    }

    const line = phaseDialogue(round?.status, cashoutState, playerBetState);
    if (!line || lastPhaseDialogueId.current === line.id) {
      return;
    }

    lastPhaseDialogueId.current = line.id;
    showLine(line);
  }, [cashoutState, playerBetState, round?.status, showLine, tutorialCompleted]);
}
