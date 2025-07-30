    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    const gameOverScreen = document.getElementById("gameOverScreen");
    const finalScoreElement = document.getElementById("finalScore");
    const restartBtn = document.getElementById("restartBtn");
    const restartBtnWin = document.getElementById("restartBtnWin");
    const scoreDisplay = document.getElementById("scoreDisplay");
    const livesContainer = document.getElementById("livesContainer");
    let gameWon = false;
    const gameWonScreen = document.getElementById("gameWonScreen");
    document.getElementById("gameWonScreen").style.display = "none";
    document.getElementById("gameOverScreen").style.display = "none";
    
    const tileSize = 32;
    let score = 0, lives = 3, gameOver = false, powerUpTimer = 0, frameCount = 0;
    
    const sounds = {
    start: new Audio("sounds/start.wav"),
    credit: new Audio("sounds/credit.wav"),
    powerup: new Audio("sounds/powerup.wav"),
    eatGhost: new Audio("sounds/eatGhost.wav"),
    gameover: new Audio("sounds/gameover.wav"),
    win: new Audio("sounds/win.wav")
    };

    
    const pacman = {
      x: 13, y: 23,
      dirX: 0, dirY: 0,
      nextDirX: 0, nextDirY: 0,
      mouthOpen: true, mouthTimer: 0, moveTimer: 0,
      moveDelay: 8 //Move a cada 8 FPS
    };
    
    // Simulação de sons
    function playSound(name) {
      const sound = sounds[name];
      if (!sound) return;
      const clone = sound.cloneNode();
      clone.play();
    }

    
    function canMove(x, y) {
      if (y < 0 || y >= map.length) return false;
      if (x < 0 || x >= map[0].length) return true; // túnel lateral
      return map[y][x] !== 1;
    }
    
    document.addEventListener("keydown", e => {
      const m = { 
        ArrowUp: [0, -1], 
        ArrowDown: [0, 1], 
        ArrowLeft: [-1, 0], 
        ArrowRight: [1, 0] 
      };
      if (m[e.key]) {
        pacman.nextDirX = m[e.key][0];
        pacman.nextDirY = m[e.key][1];
      }
    });
    
    class Ghost {
  constructor(x, y, color, type) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.color = color;
    this.type = type;
    this.dirX = 0;
    this.dirY = 0;
    this.frightened = false;
    this.leaveBaseTimer = 30;
    this.animationFrame = 0;
    this.moveTimer = 0;
    this.moveDelay = 9;
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.frightened = false;
    this.leaveBaseTimer = 30;
    this.dirX = 0;
    this.dirY = 0;
  }

  targetTile() {
    if (this.frightened) {
      return {
        x: Math.floor(Math.random() * map[0].length),
        y: Math.floor(Math.random() * map.length)
      };
    }

    const px = pacman.x;
    const py = pacman.y;

    if (this.type === "blinky") {
      return { x: px, y: py };
    }

    if (this.type === "pinky") {
      return { x: px + pacman.dirX * 4, y: py + pacman.dirY * 4 };
    }

    if (this.type === "inky") {
      const bl = ghosts.find(g => g.type === "blinky");
      const px2 = px + pacman.dirX * 2;
      const py2 = py + pacman.dirY * 2;
      return {
        x: px2 + (px2 - bl.x),
        y: py2 + (py2 - bl.y)
      };
    }

    if (this.type === "clyde") {
      // Agora também persegue agressivamente
      return { x: px, y: py };
    }

    return { x: px, y: py };
  }

  move() {
    if (this.leaveBaseTimer > 0) {
      this.leaveBaseTimer--;
      if (this.leaveBaseTimer === 0) this.y -= 1;
      return;
    }

    // Só começa a mover se o Pac-Man já se moveu
    if (pacman.dirX === 0 && pacman.dirY === 0) return;


    this.moveTimer++;
    if (this.moveTimer < this.moveDelay) return;
    this.moveTimer = 0;

    const opts = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ].filter(d => canMove(this.x + d[0], this.y + d[1]));

    const backwards = [-this.dirX, -this.dirY];
    const validOpts = opts.filter(d => !(d[0] === backwards[0] && d[1] === backwards[1]));

    const tgt = this.targetTile();
    let best = { dist: Infinity, move: [0, 0] };

    (validOpts.length ? validOpts : opts).forEach(m => {
      const nx = this.x + m[0];
      const ny = this.y + m[1];
      const d = Math.hypot(tgt.x - nx, tgt.y - ny);
      if (d < best.dist) best = { dist: d, move: m };
    });

    this.dirX = best.move[0];
    this.dirY = best.move[1];

    if (canMove(this.x + this.dirX, this.y + this.dirY)) {
      this.x += this.dirX;
      this.y += this.dirY;
    }

    if (this.x < 0) this.x = map[0].length - 1;
    else if (this.x >= map[0].length) this.x = 0;

    this.animationFrame = (this.animationFrame + 1) % 20;
  }

  draw() {
    const x = this.x * tileSize + tileSize / 2;
    const y = this.y * tileSize + tileSize / 2;
    const radius = tileSize / 2 - 2;

    const ghostColor = this.frightened
      ? powerUpTimer < 100 && powerUpTimer % 10 < 5
        ? "white"
        : "#2222FF"
      : this.color;

    ctx.fillStyle = ghostColor;
    ctx.beginPath();
    ctx.arc(x, y - 2, radius, Math.PI, 0, false);

    const waveHeight = 3;
    const frame = Math.floor(this.animationFrame / 10);

    if (frame === 0) {
      ctx.lineTo(x + radius, y + waveHeight);
      ctx.lineTo(x + radius * 0.6, y);
      ctx.lineTo(x + radius * 0.2, y + waveHeight);
      ctx.lineTo(x - radius * 0.2, y);
      ctx.lineTo(x - radius * 0.6, y + waveHeight);
      ctx.lineTo(x - radius, y);
    } else {
      ctx.lineTo(x + radius, y);
      ctx.lineTo(x + radius * 0.6, y + waveHeight);
      ctx.lineTo(x + radius * 0.2, y);
      ctx.lineTo(x - radius * 0.2, y + waveHeight);
      ctx.lineTo(x - radius * 0.6, y);
      ctx.lineTo(x - radius, y + waveHeight);
    }

    ctx.closePath();
    ctx.fill();

    const eyeRadius = radius * 0.4;
    const pupilRadius = radius * 0.15;
    const eyeOffsetX = radius * 0.3;
    const eyeOffsetY = -radius * 0.1;

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x - eyeOffsetX, y + eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x + eyeOffsetX, y + eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "black";

    let pupilX = 0,
      pupilY = 0;
    if (this.dirX === 1) pupilX = eyeRadius * 0.7;
    if (this.dirX === -1) pupilX = -eyeRadius * 0.7;
    if (this.dirY === 1) pupilY = eyeRadius * 0.7;
    if (this.dirY === -1) pupilY = -eyeRadius * 0.7;

    ctx.beginPath();
    ctx.arc(x - eyeOffsetX + pupilX, y + eyeOffsetY + pupilY, pupilRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x + eyeOffsetX + pupilX, y + eyeOffsetY + pupilY, pupilRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

    
    const ghosts = [
      new Ghost(12, 11, "red", "blinky"),
      new Ghost(13, 11, "#FFB8FF", "pinky"), // Rosa
      new Ghost(11, 14, "#00FFFF", "inky"),  // Ciano
      new Ghost(14, 14, "#FFB852", "clyde") // Laranja
    ];
    
    function update() {
    if (gameOver) return;

    frameCount++;

    // Movimento do Pac-Man
    pacman.moveTimer++;
    if (pacman.moveTimer >= pacman.moveDelay) {
      pacman.moveTimer = 0;

      if (canMove(pacman.x + pacman.nextDirX, pacman.y + pacman.nextDirY)) {
        pacman.dirX = pacman.nextDirX;
        pacman.dirY = pacman.nextDirY;
      }

      if (canMove(pacman.x + pacman.dirX, pacman.y + pacman.dirY)) {
        pacman.x += pacman.dirX;
        pacman.y += pacman.dirY;

      if (pacman.x < 0) pacman.x = map[0].length - 1;
      else if (pacman.x >= map[0].length) pacman.x = 0;
    }
  }

  pacman.mouthTimer++;
  if (pacman.mouthTimer % 6 === 0) pacman.mouthOpen = !pacman.mouthOpen;

  // Comer bolinhas e power-ups
  let cell = map[pacman.y][pacman.x];
  if (cell === 2) {
    score += 10;
    playSound("credit");
    map[pacman.y][pacman.x] = 0;
    updateUI();
  }

  if (cell === 3) {
    score += 50;
    playSound("powerup");
    powerUpTimer = 420;
    ghosts.forEach(g => g.frightened = true);
    map[pacman.y][pacman.x] = 0;
    updateUI();
  }

  // ✅ Verificar vitória (nenhuma bolinha/power-up restante)
  if (!gameWon && map.flat().filter(cell => cell === 2 || cell === 3).length === 0) {
  gameWon = true;
  gameWonScreen.style.display = "flex";
  cancelAnimationFrame(animationFrameId); // Para o jogo
  if (sounds.win) sounds.win.play();
}


  // Movimento e colisão dos fantasmas
  ghosts.forEach(g => {
    g.move();

    const dist = Math.hypot(g.x - pacman.x, g.y - pacman.y);

    if (dist < 0.7) {
      if (g.frightened && powerUpTimer > 0) {
        score += 200;
        playSound("eatGhost");
        g.reset();
        updateUI();
      } else if (!g.frightened) {
        lives--;
        playSound("gameover");
        updateUI();
        if (lives <= 0) {
          gameOver = true;
          finalScoreElement.textContent = score;
          gameOverScreen.style.display = "block";
          gameOverScreen.querySelector("h1").textContent = "GAME OVER";
        }
        pacman.x = 13;
        pacman.y = 23;
        pacman.dirX = pacman.dirY = 0;
        ghosts.forEach(gg => gg.reset());
      }
    }
  });

  if (powerUpTimer > 0) {
    powerUpTimer--;
    if (powerUpTimer <= 0) {
      ghosts.forEach(g => g.frightened = false);
    }
  }
}
    
    function updateUI() {
      // Atualizar placar
      scoreDisplay.textContent = score;
      
      // Atualizar vidas
      livesContainer.innerHTML = '';
      for (let i = 0; i < lives; i++) {
        const life = document.createElement('div');
        life.className = 'life';
        livesContainer.appendChild(life);
      }
    }
    
    function drawMap() {
      for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[0].length; x++) {
          const v = map[y][x];
          if (v === 1) {
            // Paredes com efeito 3D
            ctx.fillStyle = "#2222DD";
            ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
            
            ctx.fillStyle = "#3333FF";
            ctx.fillRect(x * tileSize, y * tileSize, tileSize, 4);
            ctx.fillRect(x * tileSize, y * tileSize, 4, tileSize);
            
            ctx.fillStyle = "#111166";
            ctx.fillRect(x * tileSize, y * tileSize + tileSize - 4, tileSize, 4);
            ctx.fillRect(x * tileSize + tileSize - 4, y * tileSize, 4, tileSize);
          } else if (v === 2) {
            // Pílulas pequenas
            ctx.fillStyle = "#FFFFAA";
            ctx.beginPath();
            ctx.arc(x * tileSize + tileSize/2, y * tileSize + tileSize/2, 4, 0, Math.PI*2);
            ctx.fill();
          } else if (v === 3) {
            // Power-ups
            ctx.fillStyle = "#FFFF00";
            ctx.beginPath();
            ctx.arc(x * tileSize + tileSize/2, y * tileSize + tileSize/2, 10, 0, Math.PI*2);
            ctx.fill();
            
            // Efeito de brilho
            if (frameCount % 20 < 10) {
              ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
              ctx.beginPath();
              ctx.arc(x * tileSize + tileSize/2, y * tileSize + tileSize/2, 14, 0, Math.PI*2);
              ctx.fill();
            }
          }
        }
      }
    }
    
    function drawPacman() {
      const x = pacman.x * tileSize + tileSize/2;
      const y = pacman.y * tileSize + tileSize/2;
      const radius = tileSize/2 - 2;
      
      ctx.fillStyle = "#FFFF00";
      ctx.beginPath();
      
      let startAngle, endAngle;
      
      if (!pacman.mouthOpen) {
        // Boca fechada
        startAngle = 0;
        endAngle = Math.PI * 2;
      } else {
        // Boca aberta (depende da direção)
        const angle = Math.atan2(pacman.dirY, pacman.dirX);
        startAngle = angle + 0.6;
        endAngle = angle + Math.PI * 2 - 0.6;
      }
      
      ctx.arc(x, y, radius, startAngle, endAngle);
      
      if (pacman.mouthOpen) {
        ctx.lineTo(x, y);
      }
      
      ctx.fill();
      
      // Olho do Pacman
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(x + radius * 0.3, y - radius * 0.3, radius * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    
    function draw() {
      // Fundo
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Desenhar mapa
      drawMap();
      
      // Desenhar fantasmas
      ghosts.forEach(ghost => ghost.draw());
      
      // Desenhar Pacman
      drawPacman();
    }
    
    function gameLoop() {
      if (!gameOver && !gameWon) {
        update();
        draw();
        setTimeout(gameLoop, 16.7);
      }
    }
    
    restartBtn.addEventListener("click", () => {
      gameWon = false;
      gameOver = false;
      score = 0;
      lives = 3;
      powerUpTimer = 0;

      gameOverScreen.style.display = "none";
      gameWonScreen.style.display = "none";

      pacman.x = 13;
      pacman.y = 23;
      pacman.dirX = 0;
      pacman.dirY = 0;

      playSound("start");
      resetMap();
      ghosts.forEach(ghost => ghost.reset());
      updateUI();
      gameLoop();
  });

  restartBtnWin.addEventListener("click", () => {
      gameWon = false;
      gameOver = false;
      score = 0;
      lives = 3;
      powerUpTimer = 0;

      gameOverScreen.style.display = "none";
      gameWonScreen.style.display = "none";

      pacman.x = 13;
      pacman.y = 23;
      pacman.dirX = 0;
      pacman.dirY = 0;

      playSound("win");
      resetMap();
      ghosts.forEach(ghost => ghost.reset());
      updateUI();
      gameLoop();
  });

    
    function resetMap() {
      // Recarregar o mapa original
      for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[0].length; x++) {
          if (originalMap[y] && originalMap[y][x] !== undefined) {
            map[y][x] = originalMap[y][x];
          }
        }
      }
    }
    
    // Mapa original (para reset)
    const originalMap = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,3,1],
      [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
      [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1],
      [1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1],
      [0,0,0,1,2,1,1,2,1,1,0,0,0,0,0,0,0,1,1,2,1,1,2,1,0,0,0],
      [1,1,1,1,2,1,1,2,1,1,0,1,1,1,1,1,0,1,1,2,1,1,2,1,1,1,1],
      [0,0,0,0,2,2,2,2,0,0,0,1,1,1,1,1,0,0,0,2,2,2,2,0,0,0,0],
      [1,1,1,1,2,1,1,2,1,1,0,1,1,1,1,1,0,1,1,2,1,1,2,1,1,1,1],
      [0,0,0,1,2,1,1,2,1,1,0,0,0,0,0,0,0,1,1,2,1,1,2,1,0,0,0],
      [1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1],
      [1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1],
      [1,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,1],
      [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
      [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1],
      [1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
      [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
      [1,2,2,2,2,2,2,1,1,2,2,2,2,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
      [1,2,1,1,1,1,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
      [1,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
    
    // Mapa atual (pode ser modificado durante o jogo)
    const map = JSON.parse(JSON.stringify(originalMap));
    
    // Iniciar o jogo
    updateUI();
    gameLoop();

    const startButton = document.getElementById("startButton");

    startButton.addEventListener("click", () => {
      playSound("start");            // toca o som de início
      startButton.style.display = "none";  // esconde o botão
      resetGame();                   // reseta o estado do jogo (se tiver)
      gameLoop();                    // inicia o loop principal do jogo
    });
