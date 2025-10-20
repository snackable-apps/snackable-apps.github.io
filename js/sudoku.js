document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const board = document.getElementById("sudoku-board");
  const newGameBtn = document.getElementById("new-game");
  const tipBtn = document.getElementById("tip");
  const checkBtn = document.getElementById("check");
  const undoBtn = document.getElementById("undo");
  const timerEl = document.getElementById("timer");
  const movesEl = document.getElementById("moves");
  const statusEl = document.getElementById("game-status");

  // Game State
  let gameState = {
    solution: [],
    puzzle: [],
    currentPuzzleIndex: 0,
    startTime: null,
    moves: 0,
    isSolved: false,
    history: [],
    currentCell: null,
    timerInterval: null
  };

  // Pre-built Sudoku puzzles (puzzle, solution)
  const SUDOKU_PUZZLES = [
    {
      puzzle: "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
      solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
    },
    {
      puzzle: "200080300060070084030500209000105408000000000402706000301007040720040060004010003",
      solution: "247981356561273984938546219873195428195824637426736591381657942729348165654912873"
    },
    {
      puzzle: "000260701680070090190004500820100040004602900050003028009300074040050036703018000",
      solution: "435269781682571493197834562826195347374682915951743628519326874248957136763418259"
    },
    {
      puzzle: "300000000005009000200504000020000700160000058704000000000200400000001000000000007",
      solution: "391687245485219736276534891823461579169372458754895123537928461942751368618143927"
    },
    {
      puzzle: "000900002000305000706000000020000000000007130000080000000000407000000000001000000",
      solution: "451967382829345761736812945324596678695287134178134529263579487987421356514683297"
    },
    {
      puzzle: "000000907000420180000705026100904000050000040000507009920108000034059000507000000",
      solution: "512673947963428185847715326176934852258196734394587619929841673634259471587362498"
    },
    {
      puzzle: "030050040008010500460000012070502080000603000040109030250000098001020600080060020",
      solution: "731659842928314576465872312173542689859763421246189735257431968394128657681596243"
    },
    {
      puzzle: "001900003020000000000507000000000000000000000000100020000000040800000000030006700",
      solution: "451962783927831645386547219763495821195278436842136957519724368874653192238619574"
    },
    {
      puzzle: "000000000400000002001008000000000070060030000000100800000600900900000000000000000",
      solution: "528971634476135892391248576814592367967436215253617948135864729692753481784329651"
    },
    {
      puzzle: "000000080000003000005000000000000020700000000000001000000200000010000000060000000",
      solution: "619472385472583961385916472846759123731648259295321647958237614127694538364185796"
    }
  ];

  // Utility Functions
  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function setStatus(message, type = 'info') {
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
  }

  function updateTimer() {
    if (gameState.startTime && !gameState.isSolved) {
      const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
      timerEl.textContent = `Time: ${formatTime(elapsed)}`;
    }
  }

  function updateMoves() {
    movesEl.textContent = `Moves: ${gameState.moves}`;
  }

  // Sudoku Generation
  function loadPuzzle() {
    const puzzleData = SUDOKU_PUZZLES[gameState.currentPuzzleIndex];
    
    // Convert puzzle string to 2D array
    const puzzle = [];
    for (let i = 0; i < 9; i++) {
      puzzle[i] = [];
      for (let j = 0; j < 9; j++) {
        puzzle[i][j] = parseInt(puzzleData.puzzle[i * 9 + j]);
      }
    }
    
    // Convert solution string to 2D array
    const solution = [];
    for (let i = 0; i < 9; i++) {
      solution[i] = [];
      for (let j = 0; j < 9; j++) {
        solution[i][j] = parseInt(puzzleData.solution[i * 9 + j]);
      }
    }
    
    return { puzzle, solution };
  }

  // Board Rendering
  function renderBoard() {
    board.innerHTML = "";
    board.setAttribute('aria-label', `Sudoku puzzle ${gameState.currentPuzzleIndex + 1} of ${SUDOKU_PUZZLES.length}`);
    
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', `Row ${i + 1}, Column ${j + 1}`);
        cell.setAttribute('data-row', i);
        cell.setAttribute('data-col', j);
        cell.setAttribute('tabindex', '0');
        
        if (gameState.puzzle[i][j] !== 0) {
          cell.textContent = gameState.puzzle[i][j];
          cell.classList.add('fixed');
          cell.setAttribute('aria-label', `Row ${i + 1}, Column ${j + 1}, Fixed number ${gameState.puzzle[i][j]}`);
        }
        
        // Add 3x3 block borders
        if (j % 3 === 2 && j < 8) {
          cell.style.borderRight = '2px solid var(--text-color)';
        }
        if (i % 3 === 2 && i < 8) {
          cell.style.borderBottom = '2px solid var(--text-color)';
        }
        
        cell.addEventListener('click', () => selectCell(cell, i, j));
        cell.addEventListener('keydown', (e) => handleCellKeydown(e, cell, i, j));
        
        board.appendChild(cell);
      }
    }
  }

  function selectCell(cell, row, col) {
    // Remove previous selection
    document.querySelectorAll('.cell.selected').forEach(c => c.classList.remove('selected'));
    
    // Select current cell
    cell.classList.add('selected');
    gameState.currentCell = { row, col, element: cell };
    cell.focus();
  }

  function handleCellKeydown(e, cell, row, col) {
    const key = e.key;
    
    // Number input (only for non-fixed cells)
    if (/^[1-9]$/.test(key)) {
      if (!cell.classList.contains('fixed')) {
        e.preventDefault();
        makeMove(cell, row, col, parseInt(key));
      }
    }
    // Clear cell (only for non-fixed cells)
    else if (key === 'Backspace' || key === 'Delete' || key === '0') {
      if (!cell.classList.contains('fixed')) {
        e.preventDefault();
        makeMove(cell, row, col, 0);
      }
    }
    // Navigation (works for all cells, including fixed ones)
    else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      e.preventDefault();
      navigateBoard(key, row, col);
    }
    // Tab navigation (works for all cells, including fixed ones)
    else if (key === 'Tab') {
      e.preventDefault();
      navigateBoard(e.shiftKey ? 'ArrowLeft' : 'ArrowRight', row, col);
    }
  }

  function navigateBoard(direction, currentRow, currentCol) {
    let newRow = currentRow;
    let newCol = currentCol;
    
    switch (direction) {
      case 'ArrowUp':
        newRow = Math.max(0, currentRow - 1);
        break;
      case 'ArrowDown':
        newRow = Math.min(8, currentRow + 1);
        break;
      case 'ArrowLeft':
        newCol = Math.max(0, currentCol - 1);
        break;
      case 'ArrowRight':
        newCol = Math.min(8, currentCol + 1);
        break;
    }
    
    const newCell = board.children[newRow * 9 + newCol];
    selectCell(newCell, newRow, newCol);
  }

  function makeMove(cell, row, col, value) {
    // Save to history
    gameState.history.push({
      row, col, 
      oldValue: gameState.puzzle[row][col],
      newValue: value,
      timestamp: Date.now()
    });
    
    // Update puzzle
    gameState.puzzle[row][col] = value;
    
    // Update display
    if (value === 0) {
      cell.textContent = '';
      cell.classList.remove('hinted', 'error', 'correct');
    } else {
      cell.textContent = value;
      cell.classList.remove('hinted', 'error', 'correct');
    }
    
    // Update moves
    gameState.moves++;
    updateMoves();
    
    // Check if solved
    if (isPuzzleComplete() && isPuzzleCorrect()) {
      solvePuzzle();
    }
  }

  function checkForErrors() {
    // Clear previous error states
    document.querySelectorAll('.cell.error').forEach(cell => {
      cell.classList.remove('error');
    });
    
    let hasErrors = false;
    
    // Check rows
    for (let i = 0; i < 9; i++) {
      const row = [];
      for (let j = 0; j < 9; j++) {
        if (gameState.puzzle[i][j] !== 0) row.push(gameState.puzzle[i][j]);
      }
      const duplicates = findDuplicates(row);
      if (duplicates.length > 0) {
        hasErrors = true;
        duplicates.forEach(num => {
          for (let j = 0; j < 9; j++) {
            if (gameState.puzzle[i][j] === num) {
              const cell = board.children[i * 9 + j];
              if (!cell.classList.contains('fixed')) {
                cell.classList.add('error');
              }
            }
          }
        });
      }
    }
    
    // Check columns
    for (let j = 0; j < 9; j++) {
      const col = [];
      for (let i = 0; i < 9; i++) {
        if (gameState.puzzle[i][j] !== 0) col.push(gameState.puzzle[i][j]);
      }
      const duplicates = findDuplicates(col);
      if (duplicates.length > 0) {
        hasErrors = true;
        duplicates.forEach(num => {
          for (let i = 0; i < 9; i++) {
            if (gameState.puzzle[i][j] === num) {
              const cell = board.children[i * 9 + j];
              if (!cell.classList.contains('fixed')) {
                cell.classList.add('error');
              }
            }
          }
        });
      }
    }
    
    // Check 3x3 blocks
    for (let blockRow = 0; blockRow < 3; blockRow++) {
      for (let blockCol = 0; blockCol < 3; blockCol++) {
        const block = [];
        for (let i = blockRow * 3; i < blockRow * 3 + 3; i++) {
          for (let j = blockCol * 3; j < blockCol * 3 + 3; j++) {
            if (gameState.puzzle[i][j] !== 0) block.push(gameState.puzzle[i][j]);
          }
        }
        const duplicates = findDuplicates(block);
        if (duplicates.length > 0) {
          hasErrors = true;
          duplicates.forEach(num => {
            for (let i = blockRow * 3; i < blockRow * 3 + 3; i++) {
              for (let j = blockCol * 3; j < blockCol * 3 + 3; j++) {
                if (gameState.puzzle[i][j] === num) {
                  const cell = board.children[i * 9 + j];
                  if (!cell.classList.contains('fixed')) {
                    cell.classList.add('error');
                  }
                }
              }
            }
          });
        }
      }
    }
  }

  function findDuplicates(arr) {
    const seen = new Set();
    const duplicates = new Set();
    arr.forEach(item => {
      if (seen.has(item)) {
        duplicates.add(item);
      } else {
        seen.add(item);
      }
    });
    return Array.from(duplicates);
  }

  function isPuzzleComplete() {
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (gameState.puzzle[i][j] === 0) return false;
      }
    }
    return true;
  }

  function isPuzzleCorrect() {
    // Check rows
    for (let i = 0; i < 9; i++) {
      const row = gameState.puzzle[i];
      if (new Set(row).size !== 9) return false;
    }
    
    // Check columns
    for (let j = 0; j < 9; j++) {
      const col = [];
      for (let i = 0; i < 9; i++) {
        col.push(gameState.puzzle[i][j]);
      }
      if (new Set(col).size !== 9) return false;
    }
    
    // Check 3x3 blocks
    for (let blockRow = 0; blockRow < 3; blockRow++) {
      for (let blockCol = 0; blockCol < 3; blockCol++) {
        const block = [];
        for (let i = blockRow * 3; i < blockRow * 3 + 3; i++) {
          for (let j = blockCol * 3; j < blockCol * 3 + 3; j++) {
            block.push(gameState.puzzle[i][j]);
          }
        }
        if (new Set(block).size !== 9) return false;
      }
    }
    
    return true;
  }

  function solvePuzzle() {
    gameState.isSolved = true;
    clearInterval(gameState.timerInterval);
    
    const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    setStatus(`🎉 Congratulations! You solved it in ${formatTime(elapsed)} with ${gameState.moves} moves!`, 'success');
    
    // Start party animation
    startPartyAnimation();
    
    // Track completion
    if (typeof gtag === 'function') {
      gtag('event', 'puzzle_completed', {
        puzzle_id: gameState.currentPuzzleIndex + 1,
        time_seconds: elapsed,
        moves: gameState.moves
      });
    }
  }

  function startPartyAnimation() {
    const partyContainer = document.createElement('div');
    partyContainer.className = 'party-container';
    document.body.appendChild(partyContainer);
    
    // Create confetti
    for (let i = 0; i < 100; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.animationDelay = Math.random() * 3 + 's';
      confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
      partyContainer.appendChild(confetti);
    }
    
    // Remove after animation
    setTimeout(() => {
      document.body.removeChild(partyContainer);
    }, 5000);
  }

  // Game Controls
  function newGame() {
    // Cycle through puzzles
    gameState.currentPuzzleIndex = (gameState.currentPuzzleIndex + 1) % SUDOKU_PUZZLES.length;
    
    // Load puzzle and solution
    const { puzzle, solution } = loadPuzzle();
    gameState.puzzle = puzzle;
    gameState.solution = solution;
    
    gameState.startTime = Date.now();
    gameState.moves = 0;
    gameState.isSolved = false;
    gameState.history = [];
    gameState.currentCell = null;
    
    // Clear timer
    if (gameState.timerInterval) {
      clearInterval(gameState.timerInterval);
    }
    
    // Start timer
    gameState.timerInterval = setInterval(updateTimer, 1000);
    
    renderBoard();
    updateMoves();
    setStatus(`New puzzle ${gameState.currentPuzzleIndex + 1} started! Good luck!`, 'info');
    
    // Track new game
    if (typeof gtag === 'function') {
      gtag('event', 'new_game', {
        puzzle_id: gameState.currentPuzzleIndex + 1
      });
    }
  }

  function getTip() {
    if (gameState.isSolved) {
      setStatus('Puzzle already solved!', 'info');
      return;
    }
    
    const emptyCells = [];
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (gameState.puzzle[i][j] === 0) {
          emptyCells.push({ row: i, col: j });
        }
      }
    }
    
    if (emptyCells.length === 0) {
      setStatus('No empty cells to hint!', 'info');
      return;
    }
    
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const cell = board.children[randomCell.row * 9 + randomCell.col];
    const correctValue = gameState.solution[randomCell.row][randomCell.col];
    
    // Directly update puzzle and display without using makeMove
    gameState.puzzle[randomCell.row][randomCell.col] = correctValue;
    cell.textContent = correctValue;
    cell.classList.add('hinted');
    
    // Update moves
    gameState.moves++;
    updateMoves();
    
    setStatus('Hint given!', 'info');
    
    // Track hint usage
    if (typeof gtag === 'function') {
      gtag('event', 'hint_used', {
        puzzle_id: gameState.currentPuzzleIndex + 1
      });
    }
  }

  function checkSolution() {
    if (gameState.isSolved) {
      setStatus('Puzzle already solved!', 'info');
      return;
    }
    
    // Clear previous feedback (only on user-filled cells)
    document.querySelectorAll('.cell:not(.fixed)').forEach(cell => {
      cell.classList.remove('correct', 'error');
    });
    
    let hasErrors = false;
    let correctCount = 0;
    let totalUserFilled = 0;
    
    // Check only user-filled cells (not prefilled ones)
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (gameState.puzzle[i][j] !== 0) {
          const cell = board.children[i * 9 + j];
          
          // Only check user-filled cells (not prefilled ones)
          if (!cell.classList.contains('fixed')) {
            totalUserFilled++;
            
            if (gameState.puzzle[i][j] === gameState.solution[i][j]) {
              cell.classList.add('correct');
              correctCount++;
            } else {
              cell.classList.add('error');
              hasErrors = true;
            }
          }
        }
      }
    }
    
    // Show feedback based on results
    if (totalUserFilled === 0) {
      setStatus('No user-filled numbers to check yet!', 'info');
    } else if (hasErrors) {
      setStatus(`Found ${correctCount} correct numbers out of ${totalUserFilled} user-filled. Keep trying!`, 'error');
    } else if (isPuzzleComplete() && isPuzzleCorrect()) {
      // Puzzle is complete and correct
      solvePuzzle();
    } else {
      setStatus(`All ${correctCount} user-filled numbers are correct! Keep going!`, 'success');
    }
  }

  function undoMove() {
    if (gameState.history.length === 0) {
      setStatus('Nothing to undo!', 'info');
      return;
    }
    
    const lastMove = gameState.history.pop();
    const cell = board.children[lastMove.row * 9 + lastMove.col];
    
    gameState.puzzle[lastMove.row][lastMove.col] = lastMove.oldValue;
    
    if (lastMove.oldValue === 0) {
      cell.textContent = '';
    } else {
      cell.textContent = lastMove.oldValue;
    }
    
    cell.classList.remove('hinted', 'error', 'correct');
    
    gameState.moves--;
    updateMoves();
    checkForErrors();
    
    setStatus('Move undone!', 'info');
  }

  // Event Listeners
  newGameBtn.addEventListener('click', newGame);
  tipBtn.addEventListener('click', getTip);
  checkBtn.addEventListener('click', checkSolution);
  undoBtn.addEventListener('click', undoMove);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'n':
          e.preventDefault();
          newGame();
          break;
        case 'z':
          e.preventDefault();
          undoMove();
          break;
        case 'h':
          e.preventDefault();
          getTip();
          break;
        case 'Enter':
          e.preventDefault();
          checkSolution();
          break;
      }
    }
  });

  // Initialize game
  newGame();
});
