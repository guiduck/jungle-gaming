export interface CommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  presentation?: "modal" | "inline";
}
