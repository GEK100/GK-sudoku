// Sudoku Puzzle Generator
// Generates valid Sudoku puzzles with unique solutions at various difficulty levels

class SudokuGenerator {
  constructor() {
    this.SIZE = 9;
    this.BOX_SIZE = 3;
  }

  // Create empty 9x9 board
  createEmptyBoard() {
    return Array(9).fill(null).map(() => Array(9).fill(0));
  }

  // Shuffle array using Fisher-Yates
  shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // Check if value is valid at position
  isValid(board, row, col, value) {
    // Check row
    for (let c = 0; c < 9; c++) {
      if (board[row][c] === value) return false;
    }

    // Check column
    for (let r = 0; r < 9; r++) {
      if (board[r][col] === value) return false;
    }

    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (board[r][c] === value) return false;
      }
    }

    return true;
  }

  // Fill board using backtracking with randomization
  fillBoard(board) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          const numbers = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (const num of numbers) {
            if (this.isValid(board, row, col, num)) {
              board[row][col] = num;
              if (this.fillBoard(board)) return true;
              board[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  // Count solutions (stop at 2 to detect non-uniqueness)
  countSolutions(board, limit = 2) {
    let count = 0;
    const boardCopy = board.map(row => [...row]);

    const solve = () => {
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (boardCopy[row][col] === 0) {
            for (let num = 1; num <= 9; num++) {
              if (this.isValid(boardCopy, row, col, num)) {
                boardCopy[row][col] = num;
                if (solve()) {
                  count++;
                  if (count >= limit) {
                    boardCopy[row][col] = 0;
                    return true;
                  }
                }
                boardCopy[row][col] = 0;
              }
            }
            return false;
          }
        }
      }
      return true;
    };

    solve();
    return count;
  }

  // Remove clues to create puzzle while maintaining unique solution
  removeClues(board, targetClues) {
    const puzzle = board.map(row => [...row]);
    const positions = this.shuffle(Array.from({ length: 81 }, (_, i) => i));

    let currentClues = 81;

    for (const pos of positions) {
      if (currentClues <= targetClues) break;

      const row = Math.floor(pos / 9);
      const col = pos % 9;
      const backup = puzzle[row][col];

      if (backup === 0) continue;

      puzzle[row][col] = 0;

      // Check if puzzle still has unique solution
      if (this.countSolutions(puzzle, 2) !== 1) {
        puzzle[row][col] = backup;
      } else {
        currentClues--;
      }
    }

    return puzzle;
  }

  // Grade puzzle difficulty based on solving techniques required
  gradePuzzle(puzzle) {
    const board = puzzle.map(row => [...row]);
    const candidates = this.initCandidates(board);
    let score = 0;
    let nakedSingles = 0;
    let hiddenSingles = 0;
    let nakedPairs = 0;
    let pointing = 0;

    let progress = true;
    while (progress) {
      progress = false;

      // Naked singles
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (board[row][col] === 0 && candidates[row][col].size === 1) {
            const value = [...candidates[row][col]][0];
            board[row][col] = value;
            this.eliminateValue(candidates, row, col, value);
            nakedSingles++;
            score += 1;
            progress = true;
          }
        }
      }

      // Hidden singles
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (board[row][col] === 0) {
            for (const num of candidates[row][col]) {
              // Check if num is unique in row
              let uniqueInRow = true;
              for (let c = 0; c < 9; c++) {
                if (c !== col && board[row][c] === 0 && candidates[row][c].has(num)) {
                  uniqueInRow = false;
                  break;
                }
              }
              if (uniqueInRow) {
                board[row][col] = num;
                candidates[row][col] = new Set([num]);
                this.eliminateValue(candidates, row, col, num);
                hiddenSingles++;
                score += 2;
                progress = true;
                break;
              }

              // Check if num is unique in column
              let uniqueInCol = true;
              for (let r = 0; r < 9; r++) {
                if (r !== row && board[r][col] === 0 && candidates[r][col].has(num)) {
                  uniqueInCol = false;
                  break;
                }
              }
              if (uniqueInCol) {
                board[row][col] = num;
                candidates[row][col] = new Set([num]);
                this.eliminateValue(candidates, row, col, num);
                hiddenSingles++;
                score += 2;
                progress = true;
                break;
              }

              // Check if num is unique in box
              const boxRow = Math.floor(row / 3) * 3;
              const boxCol = Math.floor(col / 3) * 3;
              let uniqueInBox = true;
              for (let r = boxRow; r < boxRow + 3; r++) {
                for (let c = boxCol; c < boxCol + 3; c++) {
                  if ((r !== row || c !== col) && board[r][c] === 0 && candidates[r][c].has(num)) {
                    uniqueInBox = false;
                    break;
                  }
                }
                if (!uniqueInBox) break;
              }
              if (uniqueInBox) {
                board[row][col] = num;
                candidates[row][col] = new Set([num]);
                this.eliminateValue(candidates, row, col, num);
                hiddenSingles++;
                score += 2;
                progress = true;
                break;
              }
            }
          }
        }
      }
    }

    // Determine difficulty
    const emptyCells = puzzle.flat().filter(v => v === 0).length;
    const solvedCells = 81 - board.flat().filter(v => v === 0).length - (81 - emptyCells);

    let difficulty;
    if (hiddenSingles === 0 && nakedSingles > 0) {
      difficulty = 'intermediate';
    } else if (score < 50) {
      difficulty = 'intermediate';
    } else if (score < 100) {
      difficulty = 'hard';
    } else {
      difficulty = 'expert';
    }

    return { difficulty, score, nakedSingles, hiddenSingles };
  }

  initCandidates(board) {
    const candidates = Array(9).fill(null)
      .map(() => Array(9).fill(null)
        .map(() => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9])));

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] !== 0) {
          candidates[row][col] = new Set([board[row][col]]);
          this.eliminateValue(candidates, row, col, board[row][col]);
        }
      }
    }
    return candidates;
  }

  eliminateValue(candidates, row, col, value) {
    // Remove from row
    for (let c = 0; c < 9; c++) {
      if (c !== col) candidates[row][c].delete(value);
    }
    // Remove from column
    for (let r = 0; r < 9; r++) {
      if (r !== row) candidates[r][col].delete(value);
    }
    // Remove from box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (r !== row || c !== col) candidates[r][c].delete(value);
      }
    }
  }

  // Generate a puzzle at specific difficulty
  generate(difficulty = 'intermediate') {
    const clueTargets = {
      intermediate: { min: 36, max: 42 },
      hard: { min: 30, max: 35 },
      expert: { min: 24, max: 29 }
    };

    const target = clueTargets[difficulty] || clueTargets.intermediate;
    const targetClues = Math.floor(Math.random() * (target.max - target.min + 1)) + target.min;

    // Generate complete solution
    const solution = this.createEmptyBoard();
    this.fillBoard(solution);

    // Remove clues to create puzzle
    const puzzle = this.removeClues(solution, targetClues);

    const clueCount = puzzle.flat().filter(v => v !== 0).length;

    return {
      puzzle: puzzle.map(row => [...row]),
      solution: solution.map(row => [...row]),
      difficulty,
      clueCount
    };
  }

  // Solve a puzzle (returns solution or null if unsolvable)
  solve(puzzle) {
    const board = puzzle.map(row => [...row]);

    const solveBacktrack = () => {
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (board[row][col] === 0) {
            for (let num = 1; num <= 9; num++) {
              if (this.isValid(board, row, col, num)) {
                board[row][col] = num;
                if (solveBacktrack()) return true;
                board[row][col] = 0;
              }
            }
            return false;
          }
        }
      }
      return true;
    };

    return solveBacktrack() ? board : null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SudokuGenerator;
}
