import { useEffect, useRef, useCallback, useState } from 'react';
import { useSnakeGame, Direction, Difficulty } from './hooks/useSnakeGame';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const {
    snake,
    food,
    gameState,
    score,
    difficulty,
    highScores,
    gridSize,
    startGame,
    togglePause,
    resetGame,
    changeDirection,
    setDifficulty,
  } = useSnakeGame();

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const gameBoardRef = useRef<HTMLDivElement>(null);
  const [showNewHighScore, setShowNewHighScore] = useState(false);

  // Check for new high score
  useEffect(() => {
    if (gameState === 'gameover' && score > 0 && score >= highScores[difficulty]) {
      setShowNewHighScore(true);
      const timer = setTimeout(() => setShowNewHighScore(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState, score, difficulty, highScores]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
        w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
        W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT',
      };

      if (keyMap[e.key]) {
        e.preventDefault();
        if (gameState === 'playing') {
          changeDirection(keyMap[e.key]);
        }
      }

      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        if (gameState === 'idle' || gameState === 'gameover') {
          startGame();
        } else {
          togglePause();
        }
      }

      if (e.key === 'r' || e.key === 'R') {
        if (gameState === 'gameover') {
          startGame();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, changeDirection, startGame, togglePause]);

  // Touch controls
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const minSwipe = 30;

    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      changeDirection(dy > 0 ? 'DOWN' : 'UP');
    }
    touchStartRef.current = null;
  }, [changeDirection]);

  const handleDPad = useCallback((dir: Direction) => {
    if (gameState === 'playing') {
      changeDirection(dir);
    }
  }, [gameState, changeDirection]);

  const percentPerCell = 100 / gridSize;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex flex-col items-center justify-center p-4 select-none overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-lg mb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-3">
          🐍 Snake Game
        </h1>

        {/* Score Panel */}
        <div className="flex justify-between items-center bg-slate-800/80 backdrop-blur-sm rounded-xl px-4 py-3 border border-slate-700/50">
          <div className="text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Score</div>
            <motion.div
              key={score}
              initial={{ scale: 1.3, color: '#4ade80' }}
              animate={{ scale: 1, color: '#f8fafc' }}
              className="text-2xl font-bold text-white"
            >
              {score}
            </motion.div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Best ({difficulty})</div>
            <div className="text-2xl font-bold text-amber-400">{highScores[difficulty]}</div>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div
        ref={gameBoardRef}
        className="relative bg-slate-800/60 rounded-xl border-2 border-slate-600/50 shadow-2xl shadow-green-900/20 overflow-hidden aspect-square w-full max-w-[min(70vw,70vh,500px)]"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Grid background pattern */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #94a3b8 1px, transparent 1px),
              linear-gradient(to bottom, #94a3b8 1px, transparent 1px)
            `,
            backgroundSize: `${percentPerCell}% ${percentPerCell}%`,
          }}
        />

        {/* Snake */}
        {snake.map((segment, index) => (
          <motion.div
            key={`${segment.x}-${segment.y}-${index}`}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className={`absolute rounded-[3px] ${
              index === 0
                ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/40 z-10'
                : 'bg-gradient-to-br from-green-500 to-emerald-600'
            }`}
            style={{
              left: `${segment.x * percentPerCell}%`,
              top: `${segment.y * percentPerCell}%`,
              width: `${percentPerCell}%`,
              height: `${percentPerCell}%`,
              opacity: index === 0 ? 1 : Math.max(0.5, 1 - index * 0.02),
              transition: 'left 0.06s linear, top 0.06s linear',
              padding: '1px',
            }}
          >
            <div className="w-full h-full rounded-[2px] bg-inherit" />
            {index === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="drop-shadow-md" style={{ fontSize: `clamp(8px, ${percentPerCell * 0.6}vmin, 16px)` }}>👀</span>
              </div>
            )}
          </motion.div>
        ))}

        {/* Food */}
        <motion.div
          key={`${food.x}-${food.y}`}
          initial={{ scale: 0, rotate: 0 }}
          animate={{ scale: [0, 1.2, 1], rotate: 360 }}
          transition={{ duration: 0.4 }}
          className="absolute flex items-center justify-center z-20"
          style={{
            left: `${food.x * percentPerCell}%`,
            top: `${food.y * percentPerCell}%`,
            width: `${percentPerCell}%`,
            height: `${percentPerCell}%`,
          }}
        >
          <div className="w-[75%] h-[75%] rounded-full bg-gradient-to-br from-red-400 to-rose-600 shadow-lg shadow-red-500/50 animate-pulse" />
        </motion.div>

        {/* Overlay States */}
        <AnimatePresence>
          {gameState === 'idle' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-30"
            >
              <motion.div
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="text-center"
              >
                <div className="text-5xl mb-4">🐍</div>
                <h2 className="text-xl font-bold text-white mb-2">Ready to Play?</h2>
                <p className="text-slate-300 text-sm mb-4">Use arrow keys, WASD, or swipe</p>
                <button
                  onClick={startGame}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-400 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/30 active:scale-95"
                >
                  Start Game
                </button>
              </motion.div>
            </motion.div>
          )}

          {gameState === 'paused' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-30"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-center"
              >
                <div className="text-4xl mb-3">⏸️</div>
                <h2 className="text-xl font-bold text-white mb-4">Paused</h2>
                <button
                  onClick={togglePause}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-400 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/30 active:scale-95"
                >
                  Resume
                </button>
              </motion.div>
            </motion.div>
          )}

          {gameState === 'gameover' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-30"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="text-center"
              >
                <div className="text-4xl mb-3">💀</div>
                <h2 className="text-xl font-bold text-white mb-1">Game Over!</h2>
                <p className="text-3xl font-bold text-green-400 mb-1">{score} pts</p>
                {showNewHighScore && (
                  <motion.p
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-amber-400 font-bold text-sm mb-2"
                  >
                    🏆 New High Score!
                  </motion.p>
                )}
                <button
                  onClick={startGame}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-400 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/30 active:scale-95 mt-2"
                >
                  Play Again
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls Section */}
      <div className="w-full max-w-lg mt-4 space-y-3">
        {/* Difficulty & Action Buttons */}
        <div className="flex justify-between items-center gap-2">
          {/* Difficulty Selector */}
          <div className="flex bg-slate-800/80 rounded-lg border border-slate-700/50 overflow-hidden">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
              <button
                key={diff}
                onClick={() => {
                  setDifficulty(diff);
                  if (gameState === 'idle') return;
                  resetGame();
                }}
                className={`px-3 py-2 text-xs font-medium uppercase tracking-wider transition-all ${
                  difficulty === diff
                    ? diff === 'easy'
                      ? 'bg-green-600 text-white'
                      : diff === 'medium'
                      ? 'bg-amber-600 text-white'
                      : 'bg-red-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {gameState === 'playing' && (
              <button
                onClick={togglePause}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all text-sm font-medium active:scale-95 border border-slate-600"
              >
                ⏸ Pause
              </button>
            )}
            {gameState === 'paused' && (
              <button
                onClick={togglePause}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all text-sm font-medium active:scale-95"
              >
                ▶ Resume
              </button>
            )}
            {(gameState === 'playing' || gameState === 'paused') && (
              <button
                onClick={resetGame}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all text-sm font-medium active:scale-95 border border-slate-600"
              >
                🔄 Restart
              </button>
            )}
          </div>
        </div>

        {/* Mobile D-Pad Controls */}
        <div className="flex justify-center md:hidden">
          <div className="grid grid-cols-3 gap-1 w-36">
            <div />
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDPad('UP'); }}
              className="aspect-square bg-slate-700/80 rounded-lg flex items-center justify-center text-white text-xl active:bg-slate-600 border border-slate-600/50"
            >
              ↑
            </button>
            <div />
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDPad('LEFT'); }}
              className="aspect-square bg-slate-700/80 rounded-lg flex items-center justify-center text-white text-xl active:bg-slate-600 border border-slate-600/50"
            >
              ←
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDPad('DOWN'); }}
              className="aspect-square bg-slate-700/80 rounded-lg flex items-center justify-center text-white text-xl active:bg-slate-600 border border-slate-600/50"
            >
              ↓
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDPad('RIGHT'); }}
              className="aspect-square bg-slate-700/80 rounded-lg flex items-center justify-center text-white text-xl active:bg-slate-600 border border-slate-600/50"
            >
              →
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center text-slate-500 text-xs space-y-1">
          <p className="hidden md:block">Arrow Keys / WASD to move • Space to pause • R to restart</p>
          <p className="md:hidden">Swipe or use D-Pad to control • Tap buttons to pause/restart</p>
        </div>
      </div>
    </div>
  );
}

export default App;
