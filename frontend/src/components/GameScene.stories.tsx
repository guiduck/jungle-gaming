import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { useGameStore } from "../stores/game-store";
import { GameScene } from "./GameScene";
import React from "react";

function SceneState({
  phase,
  multiplierBps,
}: {
  phase: "betting" | "running" | "crashed" | "settled";
  multiplierBps: number;
}) {
  useEffect(() => {
    useGameStore.setState({
      phase,
      displayedMultiplierBps: multiplierBps,
      authoritativeMultiplierBps: multiplierBps,
      targetMultiplierBps: multiplierBps,
    });
  }, [multiplierBps, phase]);

  return (
    <div style={{ maxWidth: 900 }}>
      <GameScene />
    </div>
  );
}

const meta = {
  title: "Goat Run/Game Scene",
  component: GameScene,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof GameScene>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Betting: Story = {
  render: () => <SceneState phase="betting" multiplierBps={10000} />,
};

export const Running: Story = {
  render: () => <SceneState phase="running" multiplierBps={24500} />,
};

export const Crashed: Story = {
  render: () => <SceneState phase="crashed" multiplierBps={46624} />,
};
