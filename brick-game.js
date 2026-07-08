// Brick breaker mini-game (for For you.html)
(function () {
  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function createLetterBrick(x, y, w, h, letter) {
    return { x, y, w, h, alive: true, letter };
  }

  window.initBrickLoveGame = function initBrickLoveGame({
    containerId,
    onWin,
    onLose,
  }) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Prevent double init
    if (container.dataset.inited === "1") return;
    container.dataset.inited = "1";

    container.innerHTML = `
      <div class="game-top">
        <div class="game-title">Catch the Hearts!</div>
        <div class="game-hud">Score: <span id="bbScore">0</span></div>
      </div>
      <div class="game-wrap">
        <canvas id="bbCanvas"></canvas>
        <div class="game-overlay" id="bbOverlay">
          <div class="game-panel">
            <div class="game-big">READY?</div>
            <button class="game-btn" id="bbStart">Start</button>
            <div class="game-hint">Move: Mouse/Touch • Win: Break all bricks</div>
          </div>
        </div>
        <div class="game-result" id="bbResult" aria-live="polite"></div>
      </div>
    `;

    const canvas = container.querySelector("#bbCanvas");
    const ctx = canvas.getContext("2d");
    const startBtn = container.querySelector("#bbStart");
    const overlay = container.querySelector("#bbOverlay");
    const result = container.querySelector("#bbResult");
    const scoreEl = container.querySelector("#bbScore");
    const isLowPowerView = window.matchMedia && (
      window.matchMedia("(max-width: 700px)").matches ||
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );

    // Responsive canvas sizing
    function resize() {
      const rect = container.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(Math.min(420, Math.max(300, rect.width * 0.65)));
      canvas.width = w * devicePixelRatio;
      canvas.height = h * devicePixelRatio;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }

    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, isLowPowerView ? 1 : 1.5);
    window.addEventListener("resize", resize);
    resize();

    let raf = null;
    let running = false;

    let W = 0,
      H = 0;
    function syncWH() {
      W = canvas.getBoundingClientRect().width;
      H = canvas.getBoundingClientRect().height;
    }

    const state = {
      score: 0,
      lives: 3,
      level: 1,
      bricks: [],
      paddle: null,
      ball: null,
      speed: 1,
      shakeT: 0,
      lastTime: 0,
      lastRender: 0,
    };

    function buildBricks() {
      const cols = 6;
      const rows = 3;

      // Letters: i l,o,v,e, y,o,u (arranged as bricks)
      const letters = ["i", "l", "o", "v", "e", ",", "y", "o", "u"];
      // We'll map across 6 cols x 3 rows = 18 bricks, repeat letters sequence.
      const total = cols * rows;
      const seq = [];
      for (let i = 0; i < total; i++) seq.push(letters[i % letters.length]);

      const marginTop = 18;
      const gap = 6;
      const brickW = (W - (cols - 1) * gap) / cols;
      const brickH = 38;

      state.bricks = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const x = c * (brickW + gap);
          const y = marginTop + r * (brickH + gap);
          state.bricks.push(createLetterBrick(x, y, brickW, brickH, seq[idx]));
        }
      }
    }

    function resetGame() {
      syncWH();
      state.score = 0;
      state.lives = 3;
      state.level = 1;
      scoreEl.textContent = "0";
      state.speed = 1.0;
      state.shakeT = 0;
      state.lastRender = 0;

      const paddleW = Math.min(110, W * 0.22);
      const paddleH = 14;
      const paddleX = (W - paddleW) / 2;

      state.paddle = {
        x: paddleX,
        y: H - 34,
        w: paddleW,
        h: paddleH,
      };

      state.ball = {
        x: W / 2,
        y: H - 60,
        r: 9,
        vx: 2.5,
        vy: -3.5,
      };

      buildBricks();

      result.textContent = "";
      overlay.style.display = "flex";
      overlay.querySelector(".game-panel .game-big").textContent = "READY?";
      running = false;

      if (raf) cancelAnimationFrame(raf);
    }

    function start() {
      syncWH();
      running = true;
      overlay.style.display = "none";
      state.lastTime = performance.now();
      raf = requestAnimationFrame(loop);
    }

    function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
      return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function movePaddleTo(px) {
      if (!state.paddle) return;
      const paddle = state.paddle;
      paddle.x = clamp(px - paddle.w / 2, 0, W - paddle.w);
    }

    // Controls
    function getPointerX(evt) {
      const rect = canvas.getBoundingClientRect();
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      return clientX - rect.left;
    }

    canvas.addEventListener("mousemove", (e) => {
      if (!running) return;
      movePaddleTo(getPointerX(e));
    });

    canvas.addEventListener(
      "touchstart",
      (e) => {
        if (!running) return;
        e.preventDefault();
        movePaddleTo(getPointerX(e));
      },
      { passive: false },
    );

    canvas.addEventListener(
      "touchmove",
      (e) => {
        if (!running) return;
        e.preventDefault();
        movePaddleTo(getPointerX(e));
      },
      { passive: false },
    );

    // Start button
    startBtn.addEventListener("click", () => start());

    function drawBackground(t) {
      // Soft animated gradient
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, "rgba(255,180,200,0.25)");
      grd.addColorStop(0.5, "rgba(255,255,255,0.04)");
      grd.addColorStop(1, "rgba(80,255,180,0.18)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      // subtle stars
      if (!isLowPowerView) {
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "white";
        for (let i = 0; i < 18; i++) {
          const sx = (i * 97 + t * 0.02) % W;
          const sy = (i * 53 + t * 0.04) % H;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }

    function drawPaddle() {
      const p = state.paddle;
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      roundRect(ctx, p.x, p.y, p.w, p.h, 8);
      ctx.fill();

      const grad = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
      grad.addColorStop(0, "rgba(255,77,141,0.95)");
      grad.addColorStop(0.5, "rgba(255,255,255,0.95)");
      grad.addColorStop(1, "rgba(36,217,111,0.9)");
      ctx.fillStyle = grad;
      roundRect(ctx, p.x + 1.2, p.y + 1.2, p.w - 2.4, p.h - 2.4, 8);
      ctx.fill();
    }

    function drawBall() {
      const b = state.ball;
      const grad = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, b.r);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.4, "rgba(255,77,141,0.9)");
      grad.addColorStop(1, "rgba(36,217,111,0.65)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawBricks(t) {
      for (const br of state.bricks) {
        if (!br.alive) continue;
        // Brick glow
        const glow = isLowPowerView ? 0.25 : 0.25 + 0.2 * Math.sin(t * 0.01 + br.x * 0.05);
        ctx.fillStyle = `rgba(255,255,255,${0.08 + glow * 0.2})`;
        roundRect(ctx, br.x - 1, br.y - 1, br.w + 2, br.h + 2, 10);
        ctx.fill();

        const g = ctx.createLinearGradient(br.x, br.y, br.x + br.w, br.y);
        g.addColorStop(0, "rgba(255,77,141,0.85)");
        g.addColorStop(0.5, "rgba(255,255,255,0.35)");
        g.addColorStop(1, "rgba(36,217,111,0.65)");
        ctx.fillStyle = g;
        roundRect(ctx, br.x, br.y, br.w, br.h, 10);
        ctx.fill();

        // Letter
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.font = `700 ${Math.floor(br.h * 0.55)}px Poppins, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(br.letter, br.x + br.w / 2, br.y + br.h / 2);
      }
    }

    function roundRect(ctx, x, y, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    }

    function update(dt) {
      const b = state.ball;
      const p = state.paddle;

      // Move ball
      b.x += b.vx * state.speed * dt;
      b.y += b.vy * state.speed * dt;

      // Wall collisions
      if (b.x - b.r <= 0) {
        b.x = b.r;
        b.vx *= -1;
      }
      if (b.x + b.r >= W) {
        b.x = W - b.r;
        b.vx *= -1;
      }
      if (b.y - b.r <= 0) {
        b.y = b.r;
        b.vy *= -1;
      }

      // Paddle collision
      const hit = rectsOverlap(
        b.x - b.r,
        b.y - b.r,
        b.r * 2,
        b.r * 2,
        p.x,
        p.y,
        p.w,
        p.h,
      );
      if (hit && b.vy > 0) {
        b.y = p.y - b.r - 0.5;
        // bounce angle based on where it hits the paddle
        const t = (b.x - (p.x + p.w / 2)) / (p.w / 2);
        b.vx = 2.8 * t;
        b.vy = -Math.abs(b.vy);
        state.shakeT = 8;
      }

      // Brick collisions
      for (const br of state.bricks) {
        if (!br.alive) continue;
        if (
          !rectsOverlap(
            b.x - b.r,
            b.y - b.r,
            b.r * 2,
            b.r * 2,
            br.x,
            br.y,
            br.w,
            br.h,
          )
        )
          continue;

        br.alive = false;
        state.score += 10;
        scoreEl.textContent = String(state.score);

        // Decide bounce direction
        const prevX = b.x - b.vx * state.speed * dt;
        const prevY = b.y - b.vy * state.speed * dt;
        const wasLeft = prevX + b.r <= br.x;
        const wasRight = prevX - b.r >= br.x + br.w;
        const wasTop = prevY + b.r <= br.y;
        const wasBottom = prevY - b.r >= br.y + br.h;

        if (wasLeft || wasRight) b.vx *= -1;
        else b.vy *= -1;

        // Check win
        const aliveCount = state.bricks.reduce(
          (acc, x) => acc + (x.alive ? 1 : 0),
          0,
        );
        if (aliveCount === 0) {
          running = false;
          onWin && onWin();
          overlay.style.display = "flex";
          overlay.querySelector(".game-panel .game-big").textContent =
            "YOU WIN!";
          result.innerHTML = `<div class="win-tilt">I&nbsp;LOVE&nbsp;YOU</div>`;
          // big fullscreen cover animation (overlay on top of UI)
          const full = document.getElementById("winLoveOverlay");
          // Trigger “catch falling I LOVE YOU” reward mini-game
          if (typeof startCatchGame === "function") startCatchGame();

          const msg = document.getElementById("winLoveMsg");
          if (full && msg) {
            full.style.display = "block";
            msg.style.transform =
              "translateX(-50%) rotate(-8deg) translateY(-120%)";
            msg.animate(
              [
                {
                  transform: "translateX(-50%) rotate(-8deg) translateY(-120%)",
                  opacity: 0,
                },
                {
                  transform: "translateX(-50%) rotate(-8deg) translateY(0%)",
                  opacity: 1,
                },
              ],
              {
                duration: 1100,
                easing: "cubic-bezier(.2,.9,.2,1)",
                fill: "forwards",
              },
            );
          }
          return;
        }

        break;
      }

      // Lose condition
      if (b.y - b.r > H) {
        state.lives -= 1;
        if (state.lives <= 0) {
          running = false;
          onLose && onLose();

          overlay.style.display = "flex";
          const big = overlay.querySelector(".game-panel .game-big");
          big.textContent = "SORRY 😢";

          // show lose message + restart button
          result.innerHTML = `<div class="lose-tilt">Sorry… Try Again!</div>`;

          const panel = overlay.querySelector(".game-panel");
          const oldRestart = panel.querySelector("#bbRestart");
          if (oldRestart) oldRestart.remove();

          const restartBtn = document.createElement("button");
          restartBtn.id = "bbRestart";
          restartBtn.className = "game-btn";
          restartBtn.textContent = "Restart";

          restartBtn.addEventListener("click", () => {
            resetGame();
            start();
          });

          panel.appendChild(restartBtn);
          return;
        }

        // reset ball + paddle
        b.x = W / 2;
        b.y = H - 60;
        b.vx = 2.5;
        b.vy = -3.5;
        p.x = (W - p.w) / 2;
        state.shakeT = 18;
      }

      // Increase speed slightly over time/score
      state.speed = 1.0 + state.score / 600;
    }

    function render(t) {
      syncWH();
      const b = state.ball;

      ctx.clearRect(0, 0, W, H);
      drawBackground(t);

      // shake effect
      if (state.shakeT > 0) {
        const s = state.shakeT;
        ctx.save();
        ctx.translate(
          (Math.random() - 0.5) * (s * 0.12),
          (Math.random() - 0.5) * (s * 0.12),
        );
        state.shakeT--;
      }

      drawBricks(t);
      drawPaddle();
      drawBall();

      if (state.shakeT > 0) ctx.restore();

      // Ball glow trail
      if (!isLowPowerView) {
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = "rgba(255,255,255,1)";
        ctx.beginPath();
        ctx.arc(b.x - b.vx * 0.08, b.y - b.vy * 0.08, b.r * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    function loop(now) {
      if (!running) return;
      const dtMs = now - state.lastTime;
      state.lastTime = now;
      const dt = clamp(dtMs / 16.67, 0.5, 2.2);

      update(dt);
      if (!isLowPowerView || now - state.lastRender >= 33) {
        state.lastRender = now;
        render(now);
      }

      raf = requestAnimationFrame(loop);
    }

    // Inject styles for the game
    container.insertAdjacentHTML(
      "afterbegin",
      `<style>
      .game-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}
      .game-title{font-weight:800;letter-spacing:0.3px;color:#fffafc;text-shadow:0 0 10px rgba(0,0,0,0.35)}
      .game-hud{color:#fff8fb;font-weight:700}
      .game-wrap{position:relative}
      #bbCanvas{display:block;width:100%;height:auto;border-radius:18px;background:rgba(255,255,255,0.05);box-shadow:0 0 22px rgba(255,255,255,0.15);touch-action:none}
      .game-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(20,0,15,0.35);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-radius:18px;}
      .game-panel{text-align:center;padding:14px 16px;}
      .game-big{font-size:26px;font-weight:900;margin-bottom:10px;}
      .game-hint{font-size:12px;opacity:.9;margin-top:8px}
      .game-btn{cursor:pointer;border:none;border-radius:999px;padding:10px 18px;font-weight:800;color:#fff;background:linear-gradient(135deg,#ff4d8d,#ff86b3);box-shadow:0 0 18px rgba(255,77,141,.75)}
      .game-result{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;pointer-events:none}
      .win-tilt{font-size:42px;font-weight:1000;color:#fff;letter-spacing:2px;text-shadow:0 0 18px rgba(255,255,255,.35);transform:rotate(-8deg) translateY(-6px);animation:bigPop 1.05s ease both;}
      .lose-tilt{font-size:30px;font-weight:900;color:#fff;letter-spacing:1px;text-shadow:0 0 18px rgba(255,77,141,.35);transform:rotate(6deg);animation:shakeMsg .9s ease both;}
      @keyframes bigPop{0%{transform:rotate(-8deg) scale(.85);opacity:0}60%{transform:rotate(-8deg) scale(1.08);opacity:1}100%{transform:rotate(-8deg) scale(1);opacity:1}}
      @keyframes shakeMsg{0%{transform:rotate(6deg) translateX(0);opacity:0}30%{transform:rotate(6deg) translateX(-8px);opacity:1}60%{transform:rotate(6deg) translateX(7px)}100%{transform:rotate(6deg) translateX(0)}}
      @media (max-width:700px),(pointer:coarse){
        #bbCanvas{box-shadow:0 0 14px rgba(255,255,255,0.12)}
        .game-overlay{backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
        .win-tilt,.lose-tilt{animation:none}
      }
    </style>`,
    );

    resetGame();

    // Expose simple restart
    container.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.id === "bbStart") {
        start();
      }
    });
  };
})();
