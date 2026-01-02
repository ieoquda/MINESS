
export const calculateMultiplier = (totalTiles: number, minesCount: number, revealedCount: number): number => {
  if (revealedCount === 0) return 1;
  
  // House edge (e.g., 3%)
  const houseEdge = 0.97;
  
  // Basic probability calculation: 
  // Prob(next tile is safe) = (SafeRemaining) / (TotalRemaining)
  // Multiplier = 1 / Product(Prob_of_each_safe_pick)
  
  let probability = 1;
  for (let i = 0; i < revealedCount; i++) {
    const safeTilesAvailable = totalTiles - minesCount - i;
    const totalTilesAvailable = totalTiles - i;
    probability *= (safeTilesAvailable / totalTilesAvailable);
  }
  
  const rawMultiplier = 1 / probability;
  return Number((rawMultiplier * houseEdge).toFixed(2));
};

export const generateMines = (totalTiles: number, minesCount: number): Set<number> => {
  const mines = new Set<number>();
  while (mines.size < minesCount) {
    const randomIndex = Math.floor(Math.random() * totalTiles);
    mines.add(randomIndex);
  }
  return mines;
};
