import { useGameMutations } from "./use-game-mutations";
import { useGameQueries } from "./use-game-queries";
import { useGameSocket } from "./use-game-socket";
import { useMultiplierAnimation } from "./use-multiplier-animation";

export function useGame() {
  const {
    roundQuery,
    walletQuery,
    historyQuery,
    leaderboardQuery,
    myBetsQuery,
    verificationQuery,
    refresh,
  } = useGameQueries();
  const { placeBetMutation, cashoutMutation, readyMutation } = useGameMutations(refresh);

  useGameSocket(refresh);
  useMultiplierAnimation();

  return {
    roundQuery,
    walletQuery,
    historyQuery,
    leaderboardQuery,
    myBetsQuery,
    verificationQuery,
    placeBetMutation,
    cashoutMutation,
    readyMutation,
  };
}
