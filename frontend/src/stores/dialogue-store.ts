import { create } from "zustand";

export type DialogueSequence = "welcome" | "tutorial" | "phase";

export interface DialogueLine {
  id: string;
  speakerName: string;
  text: string;
  actionLabel?: string;
  autoCloseDelayMs?: number;
}

interface DialogueStore {
  isVisible: boolean;
  currentLine?: DialogueLine;
  queue: DialogueLine[];
  sequence?: DialogueSequence;
  typingSpeedMs: number;
  welcomeCompleted: boolean;
  tutorialCompleted: boolean;
  shouldOpenCommands: boolean;
  showDialogue: (text: string, autoCloseDelayMs?: number) => void;
  showSequence: (sequence: DialogueSequence, lines: DialogueLine[]) => void;
  showLine: (line: DialogueLine) => void;
  hideDialogue: () => void;
  advance: () => void;
  forceClose: () => void;
  consumeCommandPrompt: () => void;
  resetOnboarding: () => void;
}

const WELCOME_KEY = "jungle.dialogue.welcomeCompleted";
const TUTORIAL_KEY = "jungle.dialogue.tutorialCompleted";

function readFlag(key: string): boolean {
  if (typeof localStorage === "undefined") {
    return false;
  }

  return localStorage.getItem(key) === "true";
}

function writeFlag(key: string, value: boolean): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(key, String(value));
}

function completeSequence(sequence: DialogueSequence | undefined): Partial<DialogueStore> {
  if (sequence === "welcome") {
    writeFlag(WELCOME_KEY, true);
    return { welcomeCompleted: true };
  }

  if (sequence === "tutorial") {
    writeFlag(TUTORIAL_KEY, true);
    return { tutorialCompleted: true, shouldOpenCommands: true };
  }

  return {};
}

export const useDialogueStore = create<DialogueStore>((set) => ({
  isVisible: false,
  queue: [],
  typingSpeedMs: 28,
  welcomeCompleted: readFlag(WELCOME_KEY),
  tutorialCompleted: readFlag(TUTORIAL_KEY),
  shouldOpenCommands: false,
  showDialogue: (text, autoCloseDelayMs = 3000) =>
    set((state) => {
      if (state.sequence === "welcome" || state.sequence === "tutorial") {
        return state;
      }

      return {
        isVisible: true,
        currentLine: {
          id: `dialogue-${Date.now()}`,
          speakerName: "Nina, a cabra alpinista",
          text,
          autoCloseDelayMs,
        },
        queue: [],
        sequence: "phase",
      };
    }),
  showSequence: (sequence, lines) => {
    const [currentLine, ...queue] = lines;

    if (!currentLine) {
      set({
        isVisible: false,
        currentLine: undefined,
        queue: [],
        sequence: undefined,
        ...completeSequence(sequence),
      });
      return;
    }

    set({
      isVisible: true,
      currentLine,
      queue,
      sequence,
    });
  },
  showLine: (line) =>
    set((state) => {
      if (state.sequence === "welcome" || state.sequence === "tutorial") {
        return state;
      }

      return {
        isVisible: true,
        currentLine: line,
        queue: [],
        sequence: "phase",
      };
    }),
  hideDialogue: () => set({ isVisible: false }),
  advance: () =>
    set((state) => {
      const [currentLine, ...queue] = state.queue;

      if (currentLine) {
        return {
          isVisible: true,
          currentLine,
          queue,
        };
      }

      return {
        isVisible: false,
        currentLine: undefined,
        queue: [],
        sequence: undefined,
        ...completeSequence(state.sequence),
      };
    }),
  forceClose: () =>
    set((state) => ({
      isVisible: false,
      currentLine: undefined,
      queue: [],
      sequence: undefined,
      ...completeSequence(state.sequence),
    })),
  consumeCommandPrompt: () => set({ shouldOpenCommands: false }),
  resetOnboarding: () => {
    writeFlag(WELCOME_KEY, false);
    writeFlag(TUTORIAL_KEY, false);
    set({
      welcomeCompleted: false,
      tutorialCompleted: false,
      shouldOpenCommands: false,
    });
  },
}));
