import { useCallback, useEffect, useMemo, useState } from "react";
import { useDialogueStore } from "../stores/dialogue-store";

export function DialogueSystem() {
  const isVisible = useDialogueStore((state) => state.isVisible);
  const currentLine = useDialogueStore((state) => state.currentLine);
  const queue = useDialogueStore((state) => state.queue);
  const typingSpeedMs = useDialogueStore((state) => state.typingSpeedMs);
  const advance = useDialogueStore((state) => state.advance);
  const hideDialogue = useDialogueStore((state) => state.hideDialogue);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const completeOrAdvance = useCallback(() => {
    if (!currentLine) {
      return;
    }

    if (isTyping) {
      setDisplayedText(currentLine.text);
      setIsTyping(false);
      return;
    }

    advance();
  }, [advance, currentLine, isTyping]);

  useEffect(() => {
    if (!isVisible || !currentLine) {
      setDisplayedText("");
      setIsTyping(false);
      return;
    }

    let index = 0;
    setDisplayedText("");
    setIsTyping(true);

    const interval = window.setInterval(() => {
      index += 1;
      setDisplayedText(currentLine.text.slice(0, index));

      if (index >= currentLine.text.length) {
        window.clearInterval(interval);
        setIsTyping(false);
      }
    }, typingSpeedMs);

    return () => window.clearInterval(interval);
  }, [currentLine, isVisible, typingSpeedMs]);

  useEffect(() => {
    if (!currentLine?.autoCloseDelayMs || isTyping) {
      return;
    }

    const timeout = window.setTimeout(() => {
      hideDialogue();
    }, currentLine.autoCloseDelayMs);

    return () => window.clearTimeout(timeout);
  }, [currentLine?.autoCloseDelayMs, hideDialogue, isTyping]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      completeOrAdvance();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [completeOrAdvance, isVisible]);

  const buttonLabel = useMemo(() => {
    if (isTyping) {
      return "Completar (Enter)";
    }

    if (currentLine?.actionLabel) {
      return `${currentLine.actionLabel} (Enter)`;
    }

    return queue.length > 0 ? "Proximo (Enter)" : "Fechar (Enter)";
  }, [currentLine?.actionLabel, isTyping, queue.length]);

  if (!isVisible || !currentLine) {
    return null;
  }

  return (
    <aside className="dialogue-system" aria-live="polite">
      <div className="dialogue-box">
        <div className="dialogue-speaker">
          <span className="dialogue-avatar" aria-hidden="true">
            <img src="/assets/goat/idle.png" alt="" />
          </span>
          <span>{currentLine.speakerName}</span>
        </div>
        <p className="dialogue-text">
          {displayedText}
          {isTyping ? <span className="dialogue-cursor" aria-hidden="true" /> : null}
        </p>
        <button
          className="dialogue-next"
          onClick={completeOrAdvance}
        >
          {buttonLabel}
        </button>
      </div>
    </aside>
  );
}
