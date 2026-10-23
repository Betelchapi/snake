import { useState, useCallback, useEffect, useRef } from 'react';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type Position = { x: number; y: number };
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameState = 'idle' | 'playing' | 'paused' | 'gameover';

const GRID_SIZE = 20;

const SPEED_MAP: Record<Difficulty, number> = {
  easy: 150,
  medium: 100,
  hard: 60,
};

function getRandomPosition(snake: Position[]): Position {
  let pos: Position;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some(seg => seg.x === pos.x && seg.y === pos.y));
  return pos;
}

function getInitialSnake(): Position[] {
  const mid = Math.floor(GRID_SIZE / 2);
  return [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
}

export function useSnakeGame() {
  const [snake, setSnake] = useState<Position[]>(getInitialSnake());
  const [food, setFood] = useState<Position>(() => getRandomPosition(getInitialSnake()));
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [highScores, setHighScores] = useState<Record<Difficulty, number>>(() => {
    try {
      const saved = localStorage.getItem('snake-high-scores');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { easy: 0, medium: 0, hard: 0 };
  });

  const FOOD_COLORS = [
    'from-red-400 to-rose-600',
    'from-amber-400 to-orange-600',
    'from-yellow-300 to-amber-500',
    'from-lime-400 to-green-600',
    'from-cyan-400 to-blue-600',
    'from-violet-400 to-purple-600',
    'from-pink-400 to-fuchsia-600',
    'from-teal-400 to-emerald-600',
  ];
  const [foodColor, setFoodColor] = useState<string>(FOOD_COLORS[0]);
  const foodColorRef = useRef<string>(FOOD_COLORS[0]);
  const foodColorIndexRef = useRef<number>(0);
  useEffect(() => { foodColorRef.current = foodColor; }, [foodColor]);

  const directionRef = useRef<Direction>(direction);
  const gameStateRef = useRef<GameState>(gameState);
  const snakeRef = useRef<Position[]>(snake);
  const foodRef = useRef<Position>(food);
  const scoreRef = useRef(score);

  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  const directionQueueRef = useRef<Direction[]>([]);

  const saveHighScore = useCallback((currentScore: number, diff: Difficulty) => {
    setHighScores(prev => {
      const newScores = { ...prev };
      if (currentScore > prev[diff]) {
        newScores[diff] = currentScore;
        try {
          localStorage.setItem('snake-high-scores', JSON.stringify(newScores));
        } catch {}
      }
      return newScores;
    });
  }, []);

  const resetGame = useCallback(() => {
    const initialSnake = getInitialSnake();
    setSnake(initialSnake);
    setFood(getRandomPosition(initialSnake));
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    directionQueueRef.current = [];
    setScore(0);
    setGameState('idle');
    foodColorIndexRef.current = 0;
    setFoodColor(FOOD_COLORS[0]);
  }, []);

  const startGame = useCallback(() => {
    if (gameState === 'gameover' || gameState === 'idle') {
      resetGame();
      setTimeout(() => setGameState('playing'), 0);
    } else if (gameState === 'paused') {
      setGameState('playing');
    }
  }, [gameState, resetGame]);

  const pauseGame = useCallback(() => {
    if (gameState === 'playing') {
      setGameState('paused');
    }
  }, [gameState]);

  const togglePause = useCallback(() => {
    if (gameState === 'playing') {
      setGameState('paused');
    } else if (gameState === 'paused') {
      setGameState('playing');
    }
  }, [gameState]);

  const changeDirection = useCallback((newDir: Direction) => {
    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT'
    };

    const lastQueued = directionQueueRef.current.length > 0
      ? directionQueueRef.current[directionQueueRef.current.length - 1]
      : directionRef.current;

    if (newDir !== opposites[lastQueued] && newDir !== lastQueued) {
      directionQueueRef.current.push(newDir);
    }
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      // Process direction queue
      if (directionQueueRef.current.length > 0) {
        const nextDir = directionQueueRef.current.shift()!;
        setDirection(nextDir);
        directionRef.current = nextDir;
      }

      setSnake(prevSnake => {
        const head = { ...prevSnake[0] };
        const dir = directionRef.current;

        switch (dir) {
          case 'UP': head.y -= 1; break;
          case 'DOWN': head.y += 1; break;
          case 'LEFT': head.x -= 1; break;
          case 'RIGHT': head.x += 1; break;
        }

        // Wall collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setGameState('gameover');
          saveHighScore(scoreRef.current, difficulty);
          return prevSnake;
        }

        // Self collision
        if (prevSnake.some(seg => seg.x === head.x && seg.y === head.y)) {
          setGameState('gameover');
          saveHighScore(scoreRef.current, difficulty);
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        // Food collision
        if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
          setScore(s => s + (difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3));
          setFood(getRandomPosition(newSnake));
          // Change food color for next food
          foodColorIndexRef.current = (foodColorIndexRef.current + 1) % FOOD_COLORS.length;
          setFoodColor(FOOD_COLORS[foodColorIndexRef.current]);
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, SPEED_MAP[difficulty]);

    return () => clearInterval(interval);
  }, [gameState, difficulty, saveHighScore]);

  return {
    snake,
    food,
    foodColor,
    direction,
    gameState,
    score,
    difficulty,
    highScores,
    gridSize: GRID_SIZE,
    startGame,
    pauseGame,
    togglePause,
    resetGame,
    changeDirection,
    setDifficulty,
  };
}
