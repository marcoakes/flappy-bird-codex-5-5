(function () {
  'use strict';

  document.body.setAttribute('data-state', 'menu');

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = 400;
  var H = 600;

  var GRAVITY = 0.5;
  var FLAP_VELOCITY = -8.2;
  var MAX_FALL = 10;
  var PIPE_SPEED = 2.35;
  var PIPE_GAP = 140;
  var PIPE_SPACING = 205;
  var PIPE_WIDTH = 58;
  var GROUND_H = 92;
  var BIRD_X = Math.floor(W / 3);
  var BIRD_R = 14;

  var STATE_MENU = 0;
  var STATE_PLAYING = 1;
  var STATE_DEAD = 2;
  var STATE_GAMEOVER = 3;

  var state;
  var bird;
  var pipes;
  var score;
  var highScore;
  var groundOffset;
  var bgOffset;
  var flashTimer;
  var shakeTimer;
  var pulseT;
  var pulseText;
  var lastTime;
  var frameCount;
  var difficulty;
  var streak;
  var fever;
  var horizonOffset;

  try {
    var raw = localStorage.getItem('flappy.codex55.best');
    highScore = raw ? parseInt(raw, 10) || 0 : 0;
  } catch (e) {
    highScore = 0;
  }

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function saveBest() {
    try { localStorage.setItem('flappy.codex55.best', String(highScore)); } catch (e) {}
  }

  function resetBird() {
    bird = {
      x: BIRD_X,
      y: H / 2 - 40,
      vy: 0,
      rot: 0,
      wing: 0,
      trail: []
    };
  }

  function updateDifficulty() {
    difficulty = clamp(score / 18, 0, 1);
  }

  function setPulse(text, ttl) {
    pulseText = text;
    pulseT = ttl;
  }

  function enterMenu() {
    state = STATE_MENU;
    resetBird();
    pipes = [];
    score = 0;
    groundOffset = 0;
    bgOffset = 0;
    flashTimer = 0;
    shakeTimer = 0;
    pulseT = 0;
    pulseText = '';
    difficulty = 0;
    streak = 0;
    fever = 0;
    horizonOffset = 0;
  }

  function startGame() {
    state = STATE_PLAYING;
    resetBird();
    pipes = [];
    score = 0;
    streak = 0;
    fever = 0;
    pulseT = 0;
    pulseText = '';
    updateDifficulty();
    addPipe(W + 60);
  }

  function addPipe(x) {
    var gap = PIPE_GAP - Math.floor(difficulty * 20);
    var minTop = 70;
    var maxTop = H - GROUND_H - gap - 70;
    var topH = minTop + Math.random() * (maxTop - minTop);
    pipes.push({
      x: x,
      topH: topH,
      gap: gap,
      passed: false,
      spawnedNext: false,
      nearMissed: false
    });
  }

  function flap() {
    if (state === STATE_MENU) {
      startGame();
      bird.vy = FLAP_VELOCITY;
      setPulse('FLIGHT LIVE', 1);
    } else if (state === STATE_PLAYING) {
      bird.vy = FLAP_VELOCITY - (fever > 0 ? 0.35 : 0);
    } else if (state === STATE_GAMEOVER) {
      enterMenu();
    }
  }

  function die() {
    if (state !== STATE_PLAYING) return;
    if (score > highScore) {
      highScore = score;
      saveBest();
    }
    state = STATE_DEAD;
    flashTimer = 8;
    shakeTimer = 16;
    streak = 0;
    fever = 0;
    setPulse('SIGNAL LOST', 1.4);
  }

  function scorePipe() {
    score++;
    streak++;
    updateDifficulty();
    if (score > highScore) {
      highScore = score;
      saveBest();
    }
    if (streak > 0 && streak % 5 === 0) {
      fever = 180;
      setPulse('FEVER WINDOW', 1.2);
    }
  }

  function nearMiss() {
    if (state !== STATE_PLAYING) return;
    streak++;
    if (streak > 0 && streak % 4 === 0) {
      setPulse('THREADING IT', 0.8);
    }
  }

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.keyCode === 32 || e.key === 'ArrowUp') {
      e.preventDefault();
      flap();
    }
  });

  canvas.addEventListener('mousedown', function (e) {
    e.preventDefault();
    flap();
  });

  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    flap();
  }, { passive: false });

  function update(dt) {
    frameCount += dt;
    horizonOffset += 0.15 * dt;
    document.body.setAttribute('data-state',
      state === STATE_MENU ? 'menu' :
      state === STATE_PLAYING ? 'playing' :
      state === STATE_DEAD ? 'dead' : 'gameover'
    );

    if (flashTimer > 0) flashTimer -= dt;
    if (shakeTimer > 0) shakeTimer -= dt;
    if (pulseT > 0) pulseT -= dt;
    if (fever > 0) fever -= dt;

    if (state === STATE_DEAD) {
      bird.vy = Math.min(bird.vy + GRAVITY * dt, MAX_FALL);
      bird.y += bird.vy * dt;
      bird.rot = Math.min(90, bird.rot + 6 * dt);
      if (bird.y > H - GROUND_H - BIRD_R) {
        bird.y = H - GROUND_H - BIRD_R;
        state = STATE_GAMEOVER;
      }
      return;
    }

    if (state === STATE_MENU) {
      bird.y = H / 2 - 40 + Math.sin(frameCount * 0.1) * 7;
      bird.rot = Math.sin(frameCount * 0.08) * 8;
      bird.wing += 0.22 * dt;
      groundOffset = (groundOffset - PIPE_SPEED * dt) % 24;
      bgOffset = (bgOffset - PIPE_SPEED * 0.25 * dt) % W;
      return;
    }

    if (state === STATE_GAMEOVER) return;

    bird.vy = Math.min(bird.vy + GRAVITY * dt * (fever > 0 ? 0.95 : 1), MAX_FALL);
    bird.y += bird.vy * dt;
    bird.wing += (fever > 0 ? 0.34 : 0.25) * dt;
    bird.trail.push({ x: bird.x - 12, y: bird.y + 4, t: 18 });
    if (bird.trail.length > 10) bird.trail.shift();

    for (var ti = bird.trail.length - 1; ti >= 0; ti--) {
      bird.trail[ti].t -= dt;
      if (bird.trail[ti].t <= 0) bird.trail.splice(ti, 1);
    }

    var targetRot = bird.vy < 0 ? -22 : Math.min(90, bird.vy * 6);
    bird.rot += (targetRot - bird.rot) * 0.15 * dt;

    if (bird.y < BIRD_R) {
      bird.y = BIRD_R;
      bird.vy = 0;
    }

    if (bird.y > H - GROUND_H - BIRD_R) {
      bird.y = H - GROUND_H - BIRD_R;
      die();
      return;
    }

    for (var i = pipes.length - 1; i >= 0; i--) {
      var p = pipes[i];
      var currentSpeed = PIPE_SPEED + difficulty * 0.7 + (fever > 0 ? 0.15 : 0);
      p.x -= currentSpeed * dt;

      if (!p.spawnedNext && p.x < W - PIPE_SPACING) {
        p.spawnedNext = true;
        addPipe(p.x + PIPE_SPACING + PIPE_WIDTH);
      }

      if (!p.passed && p.x + PIPE_WIDTH / 2 < bird.x) {
        p.passed = true;
        scorePipe();
      }

      if (p.x + PIPE_WIDTH < -20) {
        pipes.splice(i, 1);
        continue;
      }

      var bL = bird.x - BIRD_R + 2;
      var bR = bird.x + BIRD_R - 2;
      var bT = bird.y - BIRD_R + 2;
      var bB = bird.y + BIRD_R - 2;
      var gapCenter = p.topH + p.gap / 2;

      if (!p.nearMissed && Math.abs(bird.y - gapCenter) < 18 && Math.abs((p.x + PIPE_WIDTH / 2) - bird.x) < 10) {
        p.nearMissed = true;
        nearMiss();
      }

      if (bR > p.x && bL < p.x + PIPE_WIDTH) {
        if (bT < p.topH || bB > p.topH + p.gap) {
          die();
          return;
        }
      }
    }

    groundOffset = (groundOffset - (PIPE_SPEED + difficulty * 0.5) * dt) % 24;
    bgOffset = (bgOffset - PIPE_SPEED * 0.3 * dt) % W;
  }

  function drawBackground() {
    var top = fever > 0 ? '#233b63' : '#5a88d7';
    var bottom = fever > 0 ? '#13213d' : '#84d7f4';
    var sky = ctx.createLinearGradient(0, 0, 0, H - GROUND_H);
    sky.addColorStop(0, top);
    sky.addColorStop(1, bottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H - GROUND_H);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    for (var x = 0; x <= W; x += 28) {
      var yy = 90 + Math.sin((x * 0.035) + horizonOffset) * 10;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.lineTo(W, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = fever > 0 ? 'rgba(255,220,180,0.55)' : 'rgba(255,255,255,0.72)';
    var cloudY = 105;
    for (var i = 0; i < 4; i++) {
      var cx = ((i * 130) + bgOffset * 2) % (W + 80) - 40;
      drawCloud(cx, cloudY + (i % 2 === 0 ? 0 : 18));
    }

    ctx.fillStyle = fever > 0 ? '#664a90' : '#8fd26c';
    ctx.beginPath();
    ctx.moveTo(0, H - GROUND_H);
    for (var hx = 0; hx <= W; hx += 40) {
      var hill = 38 + Math.sin((hx + bgOffset * 0.5) * 0.02) * 15 + difficulty * 8;
      ctx.lineTo(hx, H - GROUND_H - hill);
    }
    ctx.lineTo(W, H - GROUND_H);
    ctx.closePath();
    ctx.fill();
  }

  function drawCloud(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.arc(x + 14, y - 6, 14, 0, Math.PI * 2);
    ctx.arc(x + 28, y, 16, 0, Math.PI * 2);
    ctx.arc(x + 14, y + 6, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPipes() {
    for (var i = 0; i < pipes.length; i++) {
      var p = pipes[i];
      drawPipe(p.x, p.topH, p.gap, true);
      drawPipe(p.x, p.topH + p.gap, p.gap, false);
    }
  }

  function drawPipe(x, edgeY, gap, isTop) {
    var capH = 22;
    var feverTint = fever > 0 ? '#9f6dff' : '#5bbf2b';
    var bodyColor = feverTint;
    var capColor = fever > 0 ? '#7b50d1' : '#3e9a1a';
    var lightColor = fever > 0 ? '#c6a5ff' : '#7dd94a';
    var darkColor = fever > 0 ? '#5733aa' : '#2e7514';

    if (isTop) {
      var bodyH = edgeY - capH;
      ctx.fillStyle = bodyColor;
      ctx.fillRect(x, 0, PIPE_WIDTH, bodyH);
      ctx.fillStyle = lightColor;
      ctx.fillRect(x + 4, 0, 5, bodyH);
      ctx.fillStyle = darkColor;
      ctx.fillRect(x + PIPE_WIDTH - 7, 0, 5, bodyH);
      ctx.fillStyle = capColor;
      ctx.fillRect(x - 4, edgeY - capH, PIPE_WIDTH + 8, capH);
      ctx.fillStyle = lightColor;
      ctx.fillRect(x - 1, edgeY - capH + 3, 6, capH - 8);
      ctx.fillStyle = darkColor;
      ctx.fillRect(x + PIPE_WIDTH - 4, edgeY - capH + 3, 4, capH - 8);
    } else {
      var bottomStart = edgeY;
      var bottomEnd = H - GROUND_H;
      var bodyH2 = bottomEnd - (bottomStart + capH);
      ctx.fillStyle = capColor;
      ctx.fillRect(x - 4, bottomStart, PIPE_WIDTH + 8, capH);
      ctx.fillStyle = lightColor;
      ctx.fillRect(x - 1, bottomStart + 5, 6, capH - 10);
      ctx.fillStyle = darkColor;
      ctx.fillRect(x + PIPE_WIDTH - 4, bottomStart + 5, 4, capH - 10);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(x, bottomStart + capH, PIPE_WIDTH, bodyH2);
      ctx.fillStyle = lightColor;
      ctx.fillRect(x + 4, bottomStart + capH, 5, bodyH2);
      ctx.fillStyle = darkColor;
      ctx.fillRect(x + PIPE_WIDTH - 7, bottomStart + capH, 5, bodyH2);
    }
  }

  function drawGround() {
    ctx.fillStyle = fever > 0 ? '#4f3557' : '#ded895';
    ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
    ctx.fillStyle = fever > 0 ? '#ef9d4e' : '#7ec850';
    ctx.fillRect(0, H - GROUND_H, W, 12);
    ctx.fillStyle = fever > 0 ? '#ce6c2e' : '#5ba82f';
    ctx.fillRect(0, H - GROUND_H + 10, W, 4);
    ctx.fillStyle = fever > 0 ? '#7b566b' : '#c9b680';
    var stripeW = 24;
    for (var x = -stripeW; x < W + stripeW; x += stripeW) {
      var sx = x + groundOffset;
      ctx.fillRect(sx, H - GROUND_H + 16, stripeW / 2, 4);
      ctx.fillRect(sx + 4, H - GROUND_H + 40, stripeW / 2, 4);
    }
  }

  function drawBird() {
    for (var i = 0; i < bird.trail.length; i++) {
      var t = bird.trail[i];
      ctx.globalAlpha = t.t / 18 * 0.25;
      ctx.fillStyle = fever > 0 ? '#ffb45b' : '#fff2b3';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rot * Math.PI / 180);

    ctx.fillStyle = fever > 0 ? '#ff9d54' : '#ffd84d';
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = fever > 0 ? '#fff0c8' : '#fff2b3';
    ctx.beginPath();
    ctx.arc(-2, 3, BIRD_R - 5, 0, Math.PI * 2);
    ctx.fill();

    var wingFrame = Math.floor(bird.wing % 3);
    ctx.fillStyle = fever > 0 ? '#ff6f61' : '#e8a92b';
    ctx.beginPath();
    if (wingFrame === 0) ctx.ellipse(-3, 0, 7, 5, 0, 0, Math.PI * 2);
    else if (wingFrame === 1) ctx.ellipse(-3, -2, 7, 4, 0, 0, Math.PI * 2);
    else ctx.ellipse(-3, 3, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(6, -4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(8, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff8a1f';
    ctx.beginPath();
    ctx.moveTo(10, -1);
    ctx.lineTo(20, 2);
    ctx.lineTo(10, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d96a0a';
    ctx.beginPath();
    ctx.moveTo(10, 2);
    ctx.lineTo(20, 2);
    ctx.lineTo(10, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawScoreBig() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 54px "SF Mono", monospace';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#09111f';
    ctx.fillStyle = '#f4fbff';
    ctx.strokeText(String(score), W / 2, 88);
    ctx.fillText(String(score), W / 2, 88);
    ctx.restore();
  }

  function drawHud() {
    if (state === STATE_MENU) return;
    ctx.save();
    ctx.fillStyle = 'rgba(7,18,31,0.62)';
    ctx.fillRect(16, 18, 118, 66);
    ctx.strokeStyle = 'rgba(129,236,255,0.18)';
    ctx.strokeRect(16.5, 18.5, 117, 65);
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px "SF Mono", monospace';
    ctx.fillStyle = '#81ecff';
    ctx.fillText('SCORE', 28, 36);
    ctx.font = 'bold 28px "SF Mono", monospace';
    ctx.fillStyle = '#f4fbff';
    ctx.fillText(String(score), 28, 66);
    if (fever > 0) {
      ctx.fillStyle = '#ffca72';
      ctx.font = 'bold 11px "SF Mono", monospace';
      ctx.fillText('FEVER ' + Math.ceil(fever / 60), 28, 82);
    }
    ctx.restore();

    if (pulseT > 0 && state === STATE_PLAYING) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.min(1, pulseT);
      ctx.fillStyle = '#ffca72';
      ctx.font = 'bold 16px "SF Mono", monospace';
      ctx.fillText(pulseText, W / 2, 140);
      ctx.restore();
    }
  }

  function drawMenu() {
    ctx.save();
    ctx.fillStyle = 'rgba(4,10,18,0.34)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(7,18,31,0.78)';
    ctx.fillRect(28, 70, W - 56, 396);
    ctx.strokeStyle = 'rgba(129,236,255,0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(29, 71, W - 58, 394);

    ctx.textAlign = 'left';
    ctx.font = 'bold 13px "SF Mono", monospace';
    ctx.fillStyle = '#81ecff';
    ctx.fillText('CODEX 5.5 // FLIGHT CORRIDOR', 48, 110);

    ctx.font = 'bold 54px "SF Mono", monospace';
    ctx.fillStyle = '#f0fbff';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#81ecff';
    ctx.fillText('FLAPPY', 48, 172);
    ctx.fillText('BIRD', 48, 228);

    ctx.shadowBlur = 0;
    ctx.font = 'bold 18px "SF Mono", monospace';
    ctx.fillStyle = '#9bdfff';
    ctx.fillText('MORE PRESSURE. BETTER RHYTHM. STRONGER FRONT END.', 48, 264);

    ctx.font = '16px "SF Mono", monospace';
    ctx.fillStyle = 'rgba(227,242,255,0.9)';
    ctx.fillText('Near-miss streaks, fever surges, and a cleaner visual lane.', 48, 312);
    ctx.fillText('Built to feel tighter and more deliberate from the first run.', 48, 338);

    ctx.fillStyle = 'rgba(18,40,58,0.86)';
    ctx.fillRect(48, 374, 304, 64);
    ctx.strokeStyle = 'rgba(129,236,255,0.16)';
    ctx.strokeRect(48.5, 374.5, 303, 63);
    ctx.fillStyle = '#81ecff';
    ctx.font = 'bold 12px "SF Mono", monospace';
    ctx.fillText('INPUT', 64, 396);
    ctx.fillStyle = '#f0fbff';
    ctx.font = 'bold 18px "SF Mono", monospace';
    ctx.fillText('TAP / CLICK / SPACE / UP', 64, 424);

    ctx.textAlign = 'center';
    ctx.font = 'bold 18px "SF Mono", monospace';
    ctx.fillStyle = '#ffca72';
    ctx.globalAlpha = 0.7 + Math.sin(frameCount * 0.15) * 0.3;
    ctx.fillText('START FLYING', W / 2, H - 112);
    ctx.globalAlpha = 1;

    if (highScore > 0) {
      ctx.font = 'bold 13px "SF Mono", monospace';
      ctx.fillStyle = '#ffca72';
      ctx.fillText('BEST ' + highScore, W / 2, H - 86);
    }
    ctx.restore();
  }

  function drawGameOver() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(7,18,31,0.78)';
    ctx.fillRect(58, 170, W - 116, 210);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.strokeRect(58.5, 170.5, W - 117, 209);

    ctx.font = 'bold 34px "SF Mono", monospace';
    ctx.fillStyle = '#ff7d7d';
    ctx.fillText('FLIGHT LOST', W / 2, 222);
    ctx.font = 'bold 20px "SF Mono", monospace';
    ctx.fillStyle = '#f0fbff';
    ctx.fillText('SCORE ' + score, W / 2, 270);
    ctx.fillStyle = '#ffca72';
    ctx.fillText('BEST  ' + highScore, W / 2, 302);
    if (score > 0 && score === highScore) {
      ctx.fillStyle = '#81ecff';
      ctx.font = 'bold 15px "SF Mono", monospace';
      ctx.fillText('NEW BEST RUN', W / 2, 332);
    }
    ctx.fillStyle = '#f0fbff';
    ctx.font = 'bold 15px "SF Mono", monospace';
    ctx.fillText('TAP TO RETURN TO MENU', W / 2, 356);
    ctx.restore();
  }

  function render() {
    drawBackground();

    ctx.save();
    if (shakeTimer > 0) ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
    drawPipes();
    drawGround();
    drawBird();
    if (state === STATE_PLAYING) drawScoreBig();
    ctx.restore();

    if (flashTimer > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (flashTimer / 8 * 0.35) + ')';
      ctx.fillRect(0, 0, W, H);
    }

    drawHud();
    if (state === STATE_MENU) drawMenu();
    if (state === STATE_GAMEOVER) drawGameOver();
  }

  function loop(ts) {
    if (!lastTime) lastTime = ts;
    var delta = (ts - lastTime) / (1000 / 60);
    if (delta > 3) delta = 3;
    lastTime = ts;
    update(delta);
    render();
    requestAnimationFrame(loop);
  }

  frameCount = 0;
  lastTime = 0;
  enterMenu();
  requestAnimationFrame(loop);
})();
