// Sudoku App - Main Game Logic

class SudokuGame {
  constructor() {
    this.currentPuzzle = null;
    this.currentSolution = null;
    this.board = [];
    this.initialBoard = [];
    this.pencilMarks = [];
    this.selectedCell = null;
    this.pencilMode = false;
    this.history = [];
    this.historyIndex = -1;
    this.timer = 0;
    this.timerInterval = null;
    this.mistakes = 0;
    this.isComplete = false;

    // Current difficulty and puzzle index
    this.difficulty = 'intermediate';
    this.puzzleIndex = 0;

    // Progress tracking
    this.progress = this.loadProgress();

    // Generator for new puzzles if needed
    this.generator = new SudokuGenerator();

    this.init();
  }

  init() {
    this.createGrid();
    this.bindEvents();
    this.loadTheme();
    this.loadLastGame();
    this.checkInstallPrompt();
  }

  createGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';

    for (let i = 0; i < 81; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.index = i;
      grid.appendChild(cell);
    }
  }

  bindEvents() {
    // Grid clicks
    document.getElementById('grid').addEventListener('click', (e) => {
      const cell = e.target.closest('.cell');
      if (cell) {
        this.selectCell(parseInt(cell.dataset.index));
      }
    });

    // Number pad
    document.querySelectorAll('.num-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const num = parseInt(btn.dataset.num);
        this.enterNumber(num);
      });
    });

    // Action buttons
    document.getElementById('undo-btn').addEventListener('click', () => this.undo());
    document.getElementById('erase-btn').addEventListener('click', () => this.erase());
    document.getElementById('pencil-btn').addEventListener('click', () => this.togglePencilMode());
    document.getElementById('hint-btn').addEventListener('click', () => this.getHint());

    // Menu
    document.getElementById('menu-btn').addEventListener('click', () => this.showMenu());
    document.getElementById('close-menu').addEventListener('click', () => this.hideMenu());

    // Difficulty tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.difficulty = btn.dataset.difficulty;
        this.updatePuzzleList();
      });
    });

    // Theme toggle
    document.getElementById('theme-btn').addEventListener('click', () => this.toggleTheme());

    // Win modal
    document.getElementById('next-puzzle').addEventListener('click', () => this.nextPuzzle());
    document.getElementById('close-win').addEventListener('click', () => this.hideWinModal());

    // Install banner
    document.getElementById('install-btn').addEventListener('click', () => this.installApp());
    document.getElementById('dismiss-install').addEventListener('click', () => this.dismissInstall());

    // Keyboard support
    document.addEventListener('keydown', (e) => this.handleKeydown(e));

    // Modal backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    });

    // Save on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveGame();
        this.pauseTimer();
      } else {
        this.startTimer();
      }
    });
  }

  loadPuzzle(difficulty, index) {
    this.difficulty = difficulty;
    this.puzzleIndex = index;

    // Get puzzle from pre-generated puzzles
    const puzzleData = PUZZLES[difficulty][index];

    this.currentPuzzle = puzzleData.puzzle.map(row => [...row]);
    this.currentSolution = puzzleData.solution.map(row => [...row]);
    this.board = puzzleData.puzzle.map(row => [...row]);
    this.initialBoard = puzzleData.puzzle.map(row => [...row]);
    this.pencilMarks = Array(9).fill(null).map(() =>
      Array(9).fill(null).map(() => new Set())
    );

    this.selectedCell = null;
    this.history = [];
    this.historyIndex = -1;
    this.timer = 0;
    this.mistakes = 0;
    this.isComplete = false;

    this.updateDisplay();
    this.updateHeader();
    this.startTimer();
    this.saveGame();
  }

  selectCell(index) {
    this.selectedCell = index;
    this.updateCellHighlighting();
  }

  enterNumber(num) {
    if (this.selectedCell === null || this.isComplete) return;

    const row = Math.floor(this.selectedCell / 9);
    const col = this.selectedCell % 9;

    // Can't modify given cells
    if (this.initialBoard[row][col] !== 0) return;

    if (this.pencilMode) {
      this.togglePencilMark(row, col, num);
    } else {
      this.placeNumber(row, col, num);
    }
  }

  placeNumber(row, col, num) {
    // Save state for undo
    this.saveState();

    const previousValue = this.board[row][col];
    this.board[row][col] = num;

    // Clear pencil marks for this cell
    this.pencilMarks[row][col].clear();

    // Auto-remove pencil marks in same row, column, box
    this.removePencilMarksForNumber(row, col, num);

    // Check if correct
    if (num !== this.currentSolution[row][col]) {
      this.mistakes++;
      document.getElementById('mistakes').textContent = this.mistakes;
      this.animateCell(row * 9 + col, 'shake');
    } else {
      this.animateCell(row * 9 + col, 'pop');
    }

    this.updateDisplay();
    this.checkWin();
    this.saveGame();
  }

  togglePencilMark(row, col, num) {
    // Can only add pencil marks to empty cells
    if (this.board[row][col] !== 0) return;

    this.saveState();

    if (this.pencilMarks[row][col].has(num)) {
      this.pencilMarks[row][col].delete(num);
    } else {
      this.pencilMarks[row][col].add(num);
    }

    this.updateDisplay();
    this.saveGame();
  }

  removePencilMarksForNumber(row, col, num) {
    // Remove from row
    for (let c = 0; c < 9; c++) {
      this.pencilMarks[row][c].delete(num);
    }
    // Remove from column
    for (let r = 0; r < 9; r++) {
      this.pencilMarks[r][col].delete(num);
    }
    // Remove from box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        this.pencilMarks[r][c].delete(num);
      }
    }
  }

  erase() {
    if (this.selectedCell === null || this.isComplete) return;

    const row = Math.floor(this.selectedCell / 9);
    const col = this.selectedCell % 9;

    if (this.initialBoard[row][col] !== 0) return;

    if (this.board[row][col] !== 0 || this.pencilMarks[row][col].size > 0) {
      this.saveState();
      this.board[row][col] = 0;
      this.pencilMarks[row][col].clear();
      this.updateDisplay();
      this.saveGame();
    }
  }

  togglePencilMode() {
    this.pencilMode = !this.pencilMode;
    document.getElementById('pencil-btn').classList.toggle('active', this.pencilMode);
  }

  getHint() {
    if (this.isComplete) return;

    // Find first empty cell or incorrect cell
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (this.board[row][col] === 0) {
          this.saveState();
          this.board[row][col] = this.currentSolution[row][col];
          this.pencilMarks[row][col].clear();
          this.removePencilMarksForNumber(row, col, this.currentSolution[row][col]);
          this.selectedCell = row * 9 + col;
          this.animateCell(this.selectedCell, 'pop');
          this.updateDisplay();
          this.checkWin();
          this.saveGame();
          return;
        }
      }
    }
  }

  saveState() {
    // Remove any redo states
    this.history = this.history.slice(0, this.historyIndex + 1);

    this.history.push({
      board: this.board.map(row => [...row]),
      pencilMarks: this.pencilMarks.map(row =>
        row.map(marks => new Set(marks))
      )
    });
    this.historyIndex++;

    // Limit history size
    if (this.history.length > 100) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  undo() {
    if (this.historyIndex < 0 || this.isComplete) return;

    const state = this.history[this.historyIndex];
    this.board = state.board.map(row => [...row]);
    this.pencilMarks = state.pencilMarks.map(row =>
      row.map(marks => new Set(marks))
    );
    this.historyIndex--;

    this.updateDisplay();
    this.saveGame();
  }

  updateDisplay() {
    const cells = document.querySelectorAll('.cell');
    const digitCounts = Array(10).fill(0);

    cells.forEach((cell, index) => {
      const row = Math.floor(index / 9);
      const col = index % 9;
      const value = this.board[row][col];
      const isGiven = this.initialBoard[row][col] !== 0;
      const marks = this.pencilMarks[row][col];

      cell.className = 'cell';

      if (isGiven) {
        cell.classList.add('given');
        cell.innerHTML = `<span class="cell-value">${value}</span>`;
        digitCounts[value]++;
      } else if (value !== 0) {
        cell.classList.add('user-input');
        cell.innerHTML = `<span class="cell-value">${value}</span>`;
        digitCounts[value]++;

        // Check for conflicts
        if (this.hasConflict(row, col, value)) {
          cell.classList.add('conflict');
        }
      } else if (marks.size > 0) {
        let marksHtml = '<div class="pencil-marks">';
        for (let n = 1; n <= 9; n++) {
          marksHtml += `<span class="pencil-mark">${marks.has(n) ? n : ''}</span>`;
        }
        marksHtml += '</div>';
        cell.innerHTML = marksHtml;
      } else {
        cell.innerHTML = '';
      }
    });

    this.updateCellHighlighting();
    this.updateNumberPad(digitCounts);
  }

  updateCellHighlighting() {
    const cells = document.querySelectorAll('.cell');

    cells.forEach((cell, index) => {
      cell.classList.remove('selected', 'highlighted', 'same-digit');

      if (this.selectedCell !== null) {
        const selectedRow = Math.floor(this.selectedCell / 9);
        const selectedCol = this.selectedCell % 9;
        const row = Math.floor(index / 9);
        const col = index % 9;
        const boxRow = Math.floor(row / 3);
        const boxCol = Math.floor(col / 3);
        const selectedBoxRow = Math.floor(selectedRow / 3);
        const selectedBoxCol = Math.floor(selectedCol / 3);

        if (index === this.selectedCell) {
          cell.classList.add('selected');
        } else if (row === selectedRow || col === selectedCol ||
                   (boxRow === selectedBoxRow && boxCol === selectedBoxCol)) {
          cell.classList.add('highlighted');
        }

        // Highlight same digit
        const selectedValue = this.board[selectedRow][selectedCol];
        if (selectedValue !== 0 && this.board[row][col] === selectedValue) {
          cell.classList.add('same-digit');
        }
      }
    });
  }

  updateNumberPad(digitCounts) {
    document.querySelectorAll('.num-btn').forEach(btn => {
      const num = parseInt(btn.dataset.num);
      if (digitCounts[num] >= 9) {
        btn.classList.add('completed');
      } else {
        btn.classList.remove('completed');
      }
    });
  }

  hasConflict(row, col, value) {
    // Check row
    for (let c = 0; c < 9; c++) {
      if (c !== col && this.board[row][c] === value) return true;
    }
    // Check column
    for (let r = 0; r < 9; r++) {
      if (r !== row && this.board[r][col] === value) return true;
    }
    // Check box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if ((r !== row || c !== col) && this.board[r][c] === value) return true;
      }
    }
    return false;
  }

  animateCell(index, animation) {
    const cell = document.querySelectorAll('.cell')[index];
    cell.classList.add(animation);
    setTimeout(() => cell.classList.remove(animation), 300);
  }

  checkWin() {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (this.board[row][col] !== this.currentSolution[row][col]) {
          return false;
        }
      }
    }

    this.isComplete = true;
    this.pauseTimer();
    this.markPuzzleComplete();
    this.showWinModal();
    return true;
  }

  // Timer functions
  startTimer() {
    if (this.timerInterval || this.isComplete) return;

    this.timerInterval = setInterval(() => {
      this.timer++;
      this.updateTimerDisplay();
    }, 1000);
  }

  pauseTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateTimerDisplay() {
    const minutes = Math.floor(this.timer / 60);
    const seconds = this.timer % 60;
    document.getElementById('timer').textContent =
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Keyboard support
  handleKeydown(e) {
    if (this.selectedCell === null) return;

    const row = Math.floor(this.selectedCell / 9);
    const col = this.selectedCell % 9;

    switch (e.key) {
      case 'ArrowUp':
        if (row > 0) this.selectCell((row - 1) * 9 + col);
        e.preventDefault();
        break;
      case 'ArrowDown':
        if (row < 8) this.selectCell((row + 1) * 9 + col);
        e.preventDefault();
        break;
      case 'ArrowLeft':
        if (col > 0) this.selectCell(row * 9 + (col - 1));
        e.preventDefault();
        break;
      case 'ArrowRight':
        if (col < 8) this.selectCell(row * 9 + (col + 1));
        e.preventDefault();
        break;
      case '1': case '2': case '3': case '4': case '5':
      case '6': case '7': case '8': case '9':
        this.enterNumber(parseInt(e.key));
        break;
      case 'Backspace':
      case 'Delete':
      case '0':
        this.erase();
        break;
      case 'z':
        if (e.ctrlKey || e.metaKey) {
          this.undo();
          e.preventDefault();
        }
        break;
      case 'p':
        this.togglePencilMode();
        break;
    }
  }

  // Menu and puzzle selection
  showMenu() {
    document.getElementById('menu-modal').classList.remove('hidden');

    // Set active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.difficulty === this.difficulty);
    });

    this.updatePuzzleList();
  }

  hideMenu() {
    document.getElementById('menu-modal').classList.add('hidden');
  }

  updatePuzzleList() {
    const list = document.getElementById('puzzle-list');
    const puzzles = PUZZLES[this.difficulty];
    const completed = this.progress[this.difficulty] || [];

    list.innerHTML = '';

    puzzles.forEach((_, index) => {
      const btn = document.createElement('button');
      btn.className = 'puzzle-item';
      btn.textContent = index + 1;

      if (completed.includes(index)) {
        btn.classList.add('completed');
      }
      if (this.difficulty === this.difficulty && index === this.puzzleIndex) {
        btn.classList.add('current');
      }

      btn.addEventListener('click', () => {
        this.loadPuzzle(this.difficulty, index);
        this.hideMenu();
      });

      list.appendChild(btn);
    });
  }

  updateHeader() {
    const difficultyLabels = {
      intermediate: 'Intermediate',
      hard: 'Hard',
      expert: 'Expert'
    };

    document.getElementById('difficulty-label').textContent = difficultyLabels[this.difficulty];
    document.getElementById('puzzle-number').textContent = `#${this.puzzleIndex + 1}`;
  }

  // Win modal
  showWinModal() {
    document.getElementById('win-time').textContent = document.getElementById('timer').textContent;
    document.getElementById('win-mistakes').textContent = this.mistakes;
    document.getElementById('win-modal').classList.remove('hidden');
  }

  hideWinModal() {
    document.getElementById('win-modal').classList.add('hidden');
  }

  nextPuzzle() {
    this.hideWinModal();

    const puzzles = PUZZLES[this.difficulty];
    let nextIndex = this.puzzleIndex + 1;

    if (nextIndex >= puzzles.length) {
      // Move to next difficulty or wrap around
      const difficulties = ['intermediate', 'hard', 'expert'];
      const currentDiffIndex = difficulties.indexOf(this.difficulty);

      if (currentDiffIndex < difficulties.length - 1) {
        this.difficulty = difficulties[currentDiffIndex + 1];
        nextIndex = 0;
      } else {
        nextIndex = 0; // Start from beginning of current difficulty
      }
    }

    this.loadPuzzle(this.difficulty, nextIndex);
  }

  // Progress tracking
  markPuzzleComplete() {
    if (!this.progress[this.difficulty]) {
      this.progress[this.difficulty] = [];
    }

    if (!this.progress[this.difficulty].includes(this.puzzleIndex)) {
      this.progress[this.difficulty].push(this.puzzleIndex);
      this.saveProgress();
    }
  }

  loadProgress() {
    const saved = localStorage.getItem('sudoku-progress');
    return saved ? JSON.parse(saved) : {};
  }

  saveProgress() {
    localStorage.setItem('sudoku-progress', JSON.stringify(this.progress));
  }

  // Game state persistence
  saveGame() {
    const state = {
      difficulty: this.difficulty,
      puzzleIndex: this.puzzleIndex,
      board: this.board,
      pencilMarks: this.pencilMarks.map(row =>
        row.map(marks => [...marks])
      ),
      timer: this.timer,
      mistakes: this.mistakes,
      isComplete: this.isComplete
    };
    localStorage.setItem('sudoku-current-game', JSON.stringify(state));
  }

  loadLastGame() {
    const saved = localStorage.getItem('sudoku-current-game');

    if (saved) {
      try {
        const state = JSON.parse(saved);

        this.difficulty = state.difficulty || 'intermediate';
        this.puzzleIndex = state.puzzleIndex || 0;

        // Load the puzzle data
        const puzzleData = PUZZLES[this.difficulty][this.puzzleIndex];
        this.currentPuzzle = puzzleData.puzzle.map(row => [...row]);
        this.currentSolution = puzzleData.solution.map(row => [...row]);
        this.initialBoard = puzzleData.puzzle.map(row => [...row]);

        // Restore saved state
        this.board = state.board || puzzleData.puzzle.map(row => [...row]);
        this.pencilMarks = (state.pencilMarks || []).map(row =>
          (row || []).map(marks => new Set(marks || []))
        );

        // Ensure pencilMarks has correct structure
        if (this.pencilMarks.length !== 9) {
          this.pencilMarks = Array(9).fill(null).map(() =>
            Array(9).fill(null).map(() => new Set())
          );
        }

        this.timer = state.timer || 0;
        this.mistakes = state.mistakes || 0;
        this.isComplete = state.isComplete || false;

        this.updateDisplay();
        this.updateHeader();
        this.updateTimerDisplay();
        document.getElementById('mistakes').textContent = this.mistakes;

        if (!this.isComplete) {
          this.startTimer();
        }

        return;
      } catch (e) {
        console.error('Failed to load saved game:', e);
      }
    }

    // Load first puzzle if no saved game
    this.loadPuzzle('intermediate', 0);
  }

  // Theme
  loadTheme() {
    const theme = localStorage.getItem('sudoku-theme') || 'light';
    document.documentElement.dataset.theme = theme;
    this.updateThemeIcon(theme);
  }

  toggleTheme() {
    const current = document.documentElement.dataset.theme;
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem('sudoku-theme', newTheme);
    this.updateThemeIcon(newTheme);
  }

  updateThemeIcon(theme) {
    document.getElementById('theme-icon-light').style.display = theme === 'light' ? 'block' : 'none';
    document.getElementById('theme-icon-dark').style.display = theme === 'dark' ? 'block' : 'none';
  }

  // PWA Install
  checkInstallPrompt() {
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;

      // Show install banner if not dismissed
      if (!localStorage.getItem('sudoku-install-dismissed')) {
        document.getElementById('install-banner').classList.remove('hidden');
      }
    });

    document.getElementById('install-btn').addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          document.getElementById('install-banner').classList.add('hidden');
        }
        deferredPrompt = null;
      }
    });
  }

  installApp() {
    // Handled in checkInstallPrompt
  }

  dismissInstall() {
    document.getElementById('install-banner').classList.add('hidden');
    localStorage.setItem('sudoku-install-dismissed', 'true');
  }
}

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(registration => {
        console.log('SW registered:', registration.scope);
      })
      .catch(error => {
        console.log('SW registration failed:', error);
      });
  });
}

// Initialize game
const game = new SudokuGame();
