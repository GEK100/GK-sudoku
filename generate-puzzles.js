// Puzzle Generation Script - All Expert Level
// Run with: node generate-puzzles.js

const SudokuGenerator = require('./puzzle-generator.js');

const generator = new SudokuGenerator();

const TOTAL_PUZZLES = 300;

function generatePuzzles() {
  const puzzles = [];

  console.log(`Generating ${TOTAL_PUZZLES} expert puzzles...`);

  for (let i = 0; i < TOTAL_PUZZLES; i++) {
    const puzzle = generator.generate('expert');
    puzzles.push({
      puzzle: puzzle.puzzle,
      solution: puzzle.solution,
      clueCount: puzzle.clueCount
    });

    if ((i + 1) % 25 === 0) {
      console.log(`  Generated ${i + 1}/${TOTAL_PUZZLES}`);
    }
  }

  return puzzles;
}

function formatPuzzles(puzzles) {
  let output = '// Pre-generated Sudoku Puzzles - All Expert Level\n';
  output += '// 300 expert puzzles (24-29 clues each)\n\n';
  output += 'const PUZZLES = {\n';
  output += '  expert: [\n';

  for (let i = 0; i < puzzles.length; i++) {
    const p = puzzles[i];
    output += '    {\n';
    output += `      puzzle: ${JSON.stringify(p.puzzle)},\n`;
    output += `      solution: ${JSON.stringify(p.solution)},\n`;
    output += `      clueCount: ${p.clueCount}\n`;
    output += '    }';
    output += i < puzzles.length - 1 ? ',\n' : '\n';
  }

  output += '  ]\n';
  output += '};\n';
  return output;
}

console.log('Starting puzzle generation...');
const puzzles = generatePuzzles();
const output = formatPuzzles(puzzles);

const fs = require('fs');
fs.writeFileSync('puzzles.js', output);

console.log('\nPuzzle generation complete!');
console.log(`Total expert puzzles: ${puzzles.length}`);
console.log('Output saved to puzzles.js');
