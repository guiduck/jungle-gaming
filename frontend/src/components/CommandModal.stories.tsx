import type { Meta, StoryObj } from "@storybook/react";
import { CommandModal } from "./CommandModal";

const meta = {
  title: "Goat Run/Command Modal",
  component: CommandModal,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof CommandModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Inline: Story = {
  args: {
    isOpen: true,
    onClose: () => undefined,
    presentation: "inline",
  },
};
