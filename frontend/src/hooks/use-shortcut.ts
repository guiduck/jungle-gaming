import { useEffect, useRef } from "react";

export interface Shortcut {
  key: string;
  handler: (event: KeyboardEvent) => void;
  options?: {
    debounce?: number;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    /**
     * Defaults to false so gameplay shortcuts do not fire while the player types
     * bet amounts, auto-cashout targets, or dev-auth values.
     */
    allowInInputs?: boolean;
  };
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export function useShortcut(shortcuts: Shortcut[]): void {
  const debounceTimeouts = useRef(new Map<string, number>());

  useEffect(() => {
    const keydownEvent = (event: KeyboardEvent) => {
      const shortcut = shortcuts.find((candidate) => {
        const keyMatches = candidate.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatches = candidate.options?.ctrlKey ? event.ctrlKey : !event.ctrlKey;
        const metaMatches = candidate.options?.metaKey ? event.metaKey : !event.metaKey;
        const shiftMatches = candidate.options?.shiftKey ? event.shiftKey : !event.shiftKey;

        return keyMatches && ctrlMatches && metaMatches && shiftMatches;
      });

      if (!shortcut) {
        return;
      }

      if (!shortcut.options?.allowInInputs && isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();

      if (!shortcut.options?.debounce) {
        shortcut.handler(event);
        return;
      }

      const debounceKey = `${shortcut.key}:${shortcut.options.ctrlKey ? "ctrl" : ""}:${
        shortcut.options.shiftKey ? "shift" : ""
      }`;
      const existingTimeout = debounceTimeouts.current.get(debounceKey);
      if (existingTimeout) {
        window.clearTimeout(existingTimeout);
      }

      const timeout = window.setTimeout(() => {
        shortcut.handler(event);
        debounceTimeouts.current.delete(debounceKey);
      }, shortcut.options.debounce);

      debounceTimeouts.current.set(debounceKey, timeout);
    };

    window.addEventListener("keydown", keydownEvent);

    return () => {
      window.removeEventListener("keydown", keydownEvent);
      debounceTimeouts.current.forEach((timeout) => window.clearTimeout(timeout));
      debounceTimeouts.current.clear();
    };
  }, [shortcuts]);
}
