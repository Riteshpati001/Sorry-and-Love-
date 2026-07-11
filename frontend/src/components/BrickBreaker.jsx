import React, { useEffect, useRef, useState } from 'react';
import GlassCard from './GlassCard';

const BrickBreaker = ({ onNext }) => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('READY');
  const [letters, setLetters] = useState([]);
  const [score, setScore] = useState(0);

  const paddleWidth = 75;
  const paddleHeight = 10;
  const ballRadius = 6;
  const rowCount = 3;
  const colCount = 6;
  const brickWidth = 55;
  const brickHeight = 15;
  const brickPadding = 6;
  const brickOffsetTop = 30;
  const brickOffsetLeft = 20;

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let x = canvas.width / 2;
    let y = canvas.height - 30;
    let dx = 2;
    let dy = -2;
    let paddleX = (canvas.width - paddleWidth) / 2;
    let rightPressed = false;
    let leftPressed = false;

    const bricks = [];
    for (let c = 0; c < colCount; c++) {
      bricks[c] = [];
      for (let r = 0; r < rowCount; r++) {
        bricks[c][r] = { x: 0, y: 0, status: 1 };
      }
    }

    const keyDownHandler = (e) => {
      if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = true;
      else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = true;
    };

    const keyUpHandler = (e) => {
      if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = false;
      else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = false;
    };

    document.addEventListener('keydown', keyDownHandler, false);
    document.addEventListener('keyup', keyUpHandler, false);

    const collisionDetection = () => {
      let activeBricks = 0;
      for (let c = 0; c < colCount; c++) {
        for (let r = 0; r < rowCount; r++) {
          const b = bricks[c][r];
          if (b.status === 1) {
            activeBricks++;
            if (
              x > b.x &&
              x < b.x + brickWidth &&
              y > b.y &&
              y < b.y + brickHeight
            ) {
              dy = -dy;
              b.status = 0;
              setScore((prev) => prev + 10);
              activeBricks--;
            }
          }
        }
      }

      if (activeBricks === 0) {
        setGameState('WON');
        setupFallingLetters();
      }
    };

    const drawBall = () => {
      ctx.beginPath();
      ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#f43f5e';
      ctx.fill();
      ctx.closePath();
    };

    const drawPaddle = () => {
      ctx.beginPath();
      ctx.rect(paddleX, canvas.height - paddleHeight - 5, paddleWidth, paddleHeight);
      ctx.fillStyle = '#ec4899';
      ctx.fill();
      ctx.closePath();
    };

    const drawBricks = () => {
      for (let c = 0; c < colCount; c++) {
        for (let r = 0; r < rowCount; r++) {
          if (bricks[c][r].status === 1) {
            const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
            const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
            bricks[c][r].x = brickX;
            bricks[c][r].y = brickY;
            ctx.beginPath();
            ctx.rect(brickX, brickY, brickWidth, brickHeight);
            ctx.fillStyle = '#fbcfe8';
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fill();
            ctx.closePath();
          }
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBricks();
      drawBall();
      drawPaddle();
      collisionDetection();

      if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
        dx = -dx;
      }
      if (y + dy < ballRadius) {
        dy = -dy;
      } else if (y + dy > canvas.height - ballRadius - 5) {
        if (x > paddleX && x < paddleX + paddleWidth) {
          dy = -dy;
        } else {
          setGameState('LOST');
          return;
        }
      }

      if (rightPressed && paddleX < canvas.width - paddleWidth) {
        paddleX += 4;
      } else if (leftPressed && paddleX > 0) {
        paddleX -= 4;
      }

      x += dx;
      y += dy;
      requestAnimationFrame(draw);
    };

    draw();

    return () => {
      document.removeEventListener('keydown', keyDownHandler);
      document.removeEventListener('keyup', keyUpHandler);
    };
  }, [gameState]);

  const setupFallingLetters = () => {
    const lettersToCatch = 'ILOVEYOU'.split('').map((char, index) => ({
      id: index,
      char,
      x: 30 + index * 40,
      y: 0,
      speed: 1.5 + Math.random() * 2,
      caught: false
    }));
    setLetters(lettersToCatch);
  };

  const handleCatch = (id) => {
    setLetters((prev) =>
      prev.map((l) => (l.id === id ? { ...l, caught: true } : l))
    );
  };

  useEffect(() => {
    if (gameState !== 'WON' || letters.length === 0) return;

    const interval = setInterval(() => {
      setLetters((prev) => {
        const updated = prev.map((l) => {
          if (l.y >= 350) return l;
          return { ...l, y: l.y + l.speed };
        });
        return updated;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [gameState, letters]);

  return (
    <div className="max-w-xl w-full mx-auto px-4 z-10">
      <GlassCard className="text-center">
        <h2 className="text-2xl font-bold text-rose-700 mb-2">Love Brick Breaker</h2>
        <p className="text-xs text-slate-500 mb-6">Break all brick blocks to unveil my hidden message</p>

        {gameState === 'READY' && (
          <div className="py-12">
            <p className="text-sm text-slate-600 mb-6">Use left and right arrow keys to balance and bounce the ball.</p>
            <button
              onClick={() => { setGameState('PLAYING'); setScore(0); }}
              className="px-8 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-full font-bold shadow-md transition-all"
            >
              Start Game
            </button>
          </div>
        )}

        {gameState === 'PLAYING' && (
          <div className="flex flex-col items-center">
            <div className="mb-2 text-sm font-semibold text-rose-600">Score: {score}</div>
            <canvas
              ref={canvasRef}
              width="380"
              height="300"
              className="border border-rose-200 rounded-xl bg-white/40 shadow-inner"
            />
          </div>
        )}

        {gameState === 'WON' && (
          <div className="py-8 relative min-h-[400px]">
            <h3 className="text-2xl font-bold text-emerald-600 mb-4">🏆 Congratulations!</h3>
            <p className="text-sm text-slate-600 mb-6">Catch the falling letters to decrypt my secret romantic text!</p>

            <div className="relative w-full h-[300px] border border-dashed border-rose-200 rounded-xl bg-rose-50/20 overflow-hidden">
              {letters.map((l) => (
                <button
                  key={l.id}
                  onClick={() => handleCatch(l.id)}
                  disabled={l.caught}
                  className={`absolute transform -translate-x-1/2 p-2 rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg transition-all ${
                    l.caught
                      ? 'bg-emerald-500 text-white border-none'
                      : 'bg-rose-100 border border-rose-400 text-rose-600 cursor-pointer'
                  }`}
                  style={{ left: `${l.x}px`, top: `${l.y}px` }}
                >
                  {l.char}
                </button>
              ))}
            </div>

            {letters.every((l) => l.caught) && (
              <div className="mt-8">
                <div className="text-3xl font-extrabold text-rose-600 mb-4 script-font tracking-widest">
                  I LOVE YOU
                </div>
                <button
                  onClick={onNext}
                  className="px-8 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-full font-bold shadow-md transition-all animate-bounce"
                >
                  Unbox Surprise Gifts
                </button>
              </div>
            )}
          </div>
        )}

        {gameState === 'LOST' && (
          <div className="py-12">
            <p className="text-xl font-bold text-rose-600 mb-2">Sorry, Try Again 💔</p>
            <p className="text-sm text-slate-500 mb-6">The ball went out of your path.</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setGameState('READY')}
                className="px-6 py-2.5 bg-rose-400 hover:bg-rose-500 text-white rounded-full font-semibold shadow-sm transition-all"
              >
                Replay Game
              </button>
              <button
                onClick={onNext}
                className="px-6 py-2.5 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-full font-semibold transition-all"
              >
                Skip Game
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default BrickBreaker;
