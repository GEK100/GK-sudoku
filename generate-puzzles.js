// Puzzle Generation Script
// Run with: node generate-puzzles.js

const SudokuGenerator = require('./puzzle-generator.js');

const generator = new SudokuGenerator();

const PUZZLE_COUNTS = {
  intermediate: 100,
  hard: 100,
  expert: 100
};

function generatePuzzles() {
  const puzzles = {
    intermediate: [],
    hard: [],
    expert: []
  };

  for (const difficulty of Object.keys(PUZZLE_COUNTS)) {
    console.log(`Generating ${PUZZLE_COUNTS[difficulty]} ${difficulty} puzzles...`);

    for (let i = 0; i < PUZZLE_COUNTS[difficulty]; i++) {
      const puzzle = generator.generate(difficulty);
      puzzles[difficulty].push({
        puzzle: puzzle.puzzle,
        solution: puzzle.solution,
        clueCount: puzzle.clueCount
      });

      if ((i + 1) % 10 === 0) {
        console.log(`  Generated ${i + 1}/${PUZZLE_COUNTS[difficulty]}`);
      }
    }
  }

  return puzzles;
}

function formatPuzzles(puzzles) {
  let output = '// Pre-generated Sudoku Puzzles\n';
  output += '// 100 puzzles each for Intermediate, Hard, and Expert difficulties\n\n';
  output += 'const PUZZLES = {\n';

  for (const difficulty of Object.keys(puzzles)) {
    output += `  ${difficulty}: [\n`;

    for (let i = 0; i < puzzles[difficulty].length; i++) {
      const p = puzzles[difficulty][i];
      output += '    {\n';
      output += `      puzzle: ${JSON.stringify(p.puzzle)},\n`;
      output += `      solution: ${JSON.stringify(p.solution)},\n`;
      output += `      clueCount: ${p.clueCount}\n`;
      output += '    }';
      output += i < puzzles[difficulty].length - 1 ? ',\n' : '\n';
    }

    output += '  ]';
    output += difficulty !== 'expert' ? ',\n' : '\n';
  }

  output += '};\n';
  return output;
}

console.log('Starting puzzle generation...');
const puzzles = generatePuzzles();
const output = formatPuzzles(puzzles);

const fs = require('fs');
fs.writeFileSync('puzzles.js', output);

console.log('\nPuzzle generation complete!');
console.log(`Total puzzles: ${Object.values(PUZZLE_COUNTS).reduce((a, b) => a + b, 0)}`);
console.log('Output saved to puzzles.js');
