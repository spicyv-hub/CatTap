// ===== Cat Tap Game =====
// A Flappy Bird-style game with a cat theme and power-ups

// ===== Game Constants =====
const CONFIG = {
    gravity: 0.5,
    jumpStrength: -9,
    obstacleSpeed: 3.5,
    obstacleGap: 170,
    obstacleWidth: 60,
    obstacleSpawnRate: 100, // frames between spawns
    powerupSpawnChance: 0.15, // 15% chance per obstacle
    catSize: 35,
    powerupDuration: {
        shield: 0, // until hit
        slowmo: 5000, // 5 seconds
        double: 10000 // 10 seconds
    }
};

// ===== Game State =====
let state = {
    screen: 'start', // start, playing, paused, gameover
    score: 0,
    highScore: parseInt(localStorage.getItem('catTapHighScore')) || 0,
    powerupsCollected: 0,
    isNewRecord: false,
    
    // Cat
    cat: {
        x: 80,
        y: 200,
        velocity: 0,
        rotation: 0
    },
    
    // Obstacles
    obstacles: [],
    
    // Power-ups
    powerups: [],
    activePowerups: {
        shield: false,
        slowmo: false,
        double: false
    },
    powerupTimers: {},
    
    // Timing
    frameCount: 0,
    lastTime: 0,
    
    // Effects
    particles: [],
    screenShake: 0
};

// ===== Canvas Setup =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const container = document.getElementById('gameContainer');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ===== DOM Elements =====
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const pauseScreen = document.getElementById('pauseScreen');
const hud = document.getElementById('hud');
const scoreDisplay = document.getElementById('scoreDisplay');
const startHighScore = document.getElementById('startHighScore');
const finalScore = document.getElementById('finalScore');
const finalHighScore = document.getElementById('finalHighScore');
const newRecordMsg = document.getElementById('newRecordMsg');
const powerupsCount = document.getElementById('powerupsCount');
const powerupsActive = document.getElementById('powerupsActive');
const touchOverlay = document.getElementById('touchOverlay');

// ===== Initialize =====
function init() {
    startHighScore.textContent = state.highScore;
    
    // Event Listeners
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', startGame);
    document.getElementById('resumeBtn').addEventListener('click', resumeGame);
    document.getElementById('quitBtn').addEventListener('click', quitGame);
    document.getElementById('pauseBtn').addEventListener('click', pauseGame);
    document.getElementById('shareBtn').addEventListener('click', shareScore);
    
    // Keyboard controls
    document.addEventListener('keydown', handleKeyDown);
    
    // Touch/click controls
    touchOverlay.addEventListener('touchstart', handleJump);
    touchOverlay.addEventListener('mousedown', handleJump);
    
    // Start render loop
    requestAnimationFrame(gameLoop);
}

// ===== Game Control Functions =====
function startGame() {
    // Reset state
    state.screen = 'playing';
    state.score = 0;
    state.powerupsCollected = 0;
    state.isNewRecord = false;
    state.frameCount = 0;
    state.obstacles = [];
    state.powerups = [];
    state.particles = [];
    state.activePowerups = { shield: false, slowmo: false, double: false };
    state.powerupTimers = {};
    
    // Reset cat
    state.cat = {
        x: 80,
        y: canvas.height / 2,
        velocity: 0,
        rotation: 0
    };
    
    // Update UI
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    updateScoreDisplay();
    updatePowerupsDisplay();
    
    // Initial jump
    state.cat.velocity = CONFIG.jumpStrength;
    createParticles(state.cat.x, state.cat.y, 5, '#fff');
}

function pauseGame() {
    if (state.screen === 'playing') {
        state.screen = 'paused';
        pauseScreen.classList.remove('hidden');
        hud.classList.add('hidden');
    }
}

function resumeGame() {
    if (state.screen === 'paused') {
        state.screen = 'playing';
        pauseScreen.classList.add('hidden');
        hud.classList.remove('hidden');
    }
}

function quitGame() {
    state.screen = 'start';
    pauseScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    hud.classList.add('hidden');
    startHighScore.textContent = state.highScore;
}

function gameOver() {
    state.screen = 'gameover';
    
    // Check for new record
    state.isNewRecord = state.score > state.highScore;
    if (state.isNewRecord) {
        state.highScore = state.score;
        localStorage.setItem('catTapHighScore', state.highScore);
    }
    
    // Update UI
    finalScore.textContent = state.score;
    finalHighScore.textContent = state.highScore;
    powerupsCount.textContent = state.powerupsCollected;
    
    if (state.isNewRecord) {
        newRecordMsg.classList.remove('hidden');
    } else {
        newRecordMsg.classList.add('hidden');
    }
    
    hud.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
}

// ===== Input Handling =====
function handleKeyDown(e) {
    if (e.code === 'Space') {
        e.preventDefault();
        if (state.screen === 'playing') {
            handleJump();
        }
    } else if (e.code === 'KeyP') {
        if (state.screen === 'playing') {
            pauseGame();
        } else if (state.screen === 'paused') {
            resumeGame();
        }
    }
}

function handleJump(e) {
    if (e && e.type === 'mousedown' && e.target.closest('button')) {
        return; // Don't jump if clicking a button
    }
    
    if (state.screen === 'playing') {
        state.cat.velocity = CONFIG.jumpStrength;
        createParticles(state.cat.x, state.cat.y + 10, 3, '#fff');
    }
}

// ===== Game Loop =====
function gameLoop(timestamp) {
    const deltaTime = timestamp - state.lastTime;
    state.lastTime = timestamp;
    
    if (state.screen === 'playing') {
        update();
    }
    
    render();
    requestAnimationFrame(gameLoop);
}

// ===== Update Logic =====
function update() {
    state.frameCount++;
    
    // Apply slow-mo effect
    let speedMultiplier = state.activePowerups.slowmo ? 0.5 : 1;
    
    // Update cat physics
    state.cat.velocity += CONFIG.gravity * speedMultiplier;
    state.cat.y += state.cat.velocity * speedMultiplier;
    
    // Update cat rotation based on velocity
    state.cat.rotation = Math.min(Math.max(state.cat.velocity * 3, -30), 90);
    
    // Check floor/ceiling collision
    if (state.cat.y + CONFIG.catSize > canvas.height || state.cat.y < 0) {
        if (state.activePowerups.shield) {
            activateShield();
            state.cat.y = Math.max(CONFIG.catSize, Math.min(state.cat.y, canvas.height - CONFIG.catSize));
        } else {
            state.screenShake = 10;
            gameOver();
            return;
        }
    }
    
    // Spawn obstacles
    if (state.frameCount % Math.floor(CONFIG.obstacleSpawnRate / speedMultiplier) === 0) {
        spawnObstacle();
    }
    
    // Update obstacles
    updateObstacles(speedMultiplier);
    
    // Update power-ups
    updatePowerups(speedMultiplier);
    
    // Update particles
    updateParticles();
    
    // Update screen shake
    if (state.screenShake > 0) {
        state.screenShake *= 0.9;
        if (state.screenShake < 0.5) state.screenShake = 0;
    }
}

function spawnObstacle() {
    const minHeight = 80;
    const maxHeight = canvas.height - CONFIG.obstacleGap - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    
    state.obstacles.push({
        x: canvas.width,
        topHeight: topHeight,
        bottomY: topHeight + CONFIG.obstacleGap,
        passed: false,
        width: CONFIG.obstacleWidth
    });
    
    // Maybe spawn power-up in the gap
    if (Math.random() < CONFIG.powerupSpawnChance) {
        const powerupTypes = ['shield', 'slowmo', 'double'];
        const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
        const powerupY = topHeight + CONFIG.obstacleGap / 2;
        
        state.powerups.push({
            x: canvas.width + CONFIG.obstacleWidth / 2,
            y: powerupY,
            type: type,
            collected: false,
            radius: 15
        });
    }
}

function updateObstacles(speedMultiplier) {
    for (let i = state.obstacles.length - 1; i >= 0; i--) {
        const obs = state.obstacles[i];
        obs.x -= CONFIG.obstacleSpeed * speedMultiplier;
        
        // Check if passed
        if (!obs.passed && obs.x + obs.width < state.cat.x) {
            obs.passed = true;
            const points = state.activePowerups.double ? 2 : 1;
            state.score += points;
            updateScoreDisplay();
        }
        
        // Collision detection
        if (checkObstacleCollision(obs)) {
            if (state.activePowerups.shield) {
                activateShield();
                state.obstacles.splice(i, 1);
                continue;
            } else {
                state.screenShake = 10;
                gameOver();
                return;
            }
        }
        
        // Remove off-screen obstacles
        if (obs.x + obs.width < 0) {
            state.obstacles.splice(i, 1);
        }
    }
}

function checkObstacleCollision(obs) {
    const catLeft = state.cat.x - CONFIG.catSize / 2 + 5;
    const catRight = state.cat.x + CONFIG.catSize / 2 - 5;
    const catTop = state.cat.y - CONFIG.catSize / 2 + 5;
    const catBottom = state.cat.y + CONFIG.catSize / 2 - 5;
    
    // Check top obstacle
    if (catRight > obs.x && catLeft < obs.x + obs.width && catTop < obs.topHeight) {
        return true;
    }
    
    // Check bottom obstacle
    if (catRight > obs.x && catLeft < obs.x + obs.width && catBottom > obs.bottomY) {
        return true;
    }
    
    return false;
}

function updatePowerups(speedMultiplier) {
    for (let i = state.powerups.length - 1; i >= 0; i--) {
        const powerup = state.powerups[i];
        powerup.x -= CONFIG.obstacleSpeed * speedMultiplier;
        
        // Check collection
        const dx = powerup.x - state.cat.x;
        const dy = powerup.y - state.cat.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < CONFIG.catSize / 2 + powerup.radius) {
            collectPowerup(powerup.type);
            state.powerups.splice(i, 1);
            continue;
        }
        
        // Remove off-screen
        if (powerup.x < -20) {
            state.powerups.splice(i, 1);
        }
    }
}

function collectPowerup(type) {
    state.powerupsCollected++;
    state.activePowerups[type] = true;
    
    // Create collection effect
    createParticles(state.cat.x, state.cat.y, 8, getPowerupColor(type));
    
    // Set timer if applicable
    if (CONFIG.powerupDuration[type] > 0) {
        if (state.powerupTimers[type]) {
            clearTimeout(state.powerupTimers[type]);
        }
        
        state.powerupTimers[type] = setTimeout(() => {
            state.activePowerups[type] = false;
            updatePowerupsDisplay();
        }, CONFIG.powerupDuration[type]);
    }
    
    updatePowerupsDisplay();
}

function activateShield() {
    state.activePowerups.shield = false;
    updatePowerupsDisplay();
    createParticles(state.cat.x, state.cat.y, 15, '#4facfe');
}

function getPowerupColor(type) {
    const colors = {
        shield: '#4facfe',
        slowmo: '#f5576c',
        double: '#43e97b'
    };
    return colors[type] || '#fff';
}

function updateParticles() {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // gravity
        p.life -= 0.02;
        
        if (p.life <= 0) {
            state.particles.splice(i, 1);
        }
    }
}

function createParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        state.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1,
            color: color,
            size: Math.random() * 4 + 2
        });
    }
}

// ===== Render Functions =====
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply screen shake
    ctx.save();
    if (state.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * state.screenShake;
        const shakeY = (Math.random() - 0.5) * state.screenShake;
        ctx.translate(shakeX, shakeY);
    }
    
    // Draw background clouds
    drawClouds();
    
    // Draw power-ups
    state.powerups.forEach(drawPowerup);
    
    // Draw obstacles
    state.obstacles.forEach(drawObstacle);
    
    // Draw cat
    drawCat();
    
    // Draw particles
    state.particles.forEach(drawParticle);
    
    ctx.restore();
}

function drawClouds() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    const cloudPositions = [
        { x: 50, y: 80, size: 40 },
        { x: 200, y: 120, size: 50 },
        { x: 350, y: 60, size: 35 }
    ];
    
    cloudPositions.forEach(cloud => {
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.size * 0.5, cloud.y - cloud.size * 0.2, cloud.size * 0.7, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.size, cloud.y, cloud.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawCat() {
    ctx.save();
    ctx.translate(state.cat.x, state.cat.y);
    ctx.rotate(state.cat.rotation * Math.PI / 180);

    // Draw white ragdoll cat face
    const size = CONFIG.catSize;
    
    // Ears (dark brown/gray for ragdoll)
    ctx.fillStyle = '#8B7355';
    ctx.beginPath();
    // Left ear
    ctx.moveTo(-size/2 - 3, -size/3);
    ctx.lineTo(-size/2 - 10, -size/1.8);
    ctx.lineTo(-size/3, -size/2.5);
    ctx.fill();
    // Right ear
    ctx.beginPath();
    ctx.moveTo(size/2 + 3, -size/3);
    ctx.lineTo(size/2 + 10, -size/1.8);
    ctx.lineTo(size/3, -size/2.5);
    ctx.fill();
    
    // Face (white/cream for ragdoll)
    ctx.fillStyle = '#FFF8F0';
    ctx.beginPath();
    ctx.ellipse(0, 0, size/1.8, size/1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Cheek fluff (ragdoll characteristic)
    ctx.fillStyle = '#FFF5E8';
    ctx.beginPath();
    ctx.arc(-size/2.2, size/6, size/4, 0, Math.PI * 2);
    ctx.arc(size/2.2, size/6, size/4, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes (bright blue for ragdoll)
    // Left eye white
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(-size/4, -size/8, size/5, size/4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Right eye white
    ctx.beginPath();
    ctx.ellipse(size/4, -size/8, size/5, size/4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Left eye iris (blue)
    ctx.fillStyle = '#4A90E2';
    ctx.beginPath();
    ctx.ellipse(-size/4, -size/8, size/7, size/6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Right eye iris (blue)
    ctx.beginPath();
    ctx.ellipse(size/4, -size/8, size/7, size/6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils (black)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(-size/4, -size/8, size/14, size/10, 0, 0, Math.PI * 2);
    ctx.ellipse(size/4, -size/8, size/14, size/10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye shine (white highlights)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-size/4 - size/10, -size/8 - size/10, size/20, 0, Math.PI * 2);
    ctx.arc(size/4 - size/10, -size/8 - size/10, size/20, 0, Math.PI * 2);
    ctx.fill();
    
    // Nose (pink)
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.ellipse(0, size/12, size/12, size/10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Mouth (cute cat smile)
    ctx.strokeStyle = '#FFB6C1';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, size/12 + size/10);
    ctx.quadraticCurveTo(-size/10, size/5, -size/8, size/4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, size/12 + size/10);
    ctx.quadraticCurveTo(size/10, size/5, size/8, size/4);
    ctx.stroke();
    
    // Whiskers (white/light gray)
    ctx.strokeStyle = '#E8E0D5';
    ctx.lineWidth = 1.5;
    // Left whiskers
    ctx.beginPath();
    ctx.moveTo(-size/2, size/8);
    ctx.lineTo(-size/1.3, size/10);
    ctx.moveTo(-size/2, size/5);
    ctx.lineTo(-size/1.3, size/4);
    ctx.moveTo(-size/2, size/3);
    ctx.lineTo(-size/1.3, size/2.5);
    ctx.stroke();
    // Right whiskers
    ctx.beginPath();
    ctx.moveTo(size/2, size/8);
    ctx.lineTo(size/1.3, size/10);
    ctx.moveTo(size/2, size/5);
    ctx.lineTo(size/1.3, size/4);
    ctx.moveTo(size/2, size/3);
    ctx.lineTo(size/1.3, size/2.5);
    ctx.stroke();

    // Shield effect
    if (state.activePowerups.shield) {
        ctx.strokeStyle = '#4facfe';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, CONFIG.catSize / 1.5, 0, Math.PI * 2);
        ctx.stroke();

        // Glow effect
        ctx.fillStyle = 'rgba(79, 172, 254, 0.2)';
        ctx.fill();
    }

    ctx.restore();
}

function drawObstacle(obs) {
    // Gradient for obstacles
    const gradient = ctx.createLinearGradient(obs.x, 0, obs.x + obs.width, 0);
    gradient.addColorStop(0, '#e74c3c');
    gradient.addColorStop(0.5, '#c0392b');
    gradient.addColorStop(1, '#e74c3c');
    
    ctx.fillStyle = gradient;
    
    // Top obstacle
    ctx.fillRect(obs.x, 0, obs.width, obs.topHeight);
    
    // Bottom obstacle
    ctx.fillRect(obs.x, obs.bottomY, obs.width, canvas.height - obs.bottomY);
    
    // Add some detail
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(obs.x + 5, 0, 10, obs.topHeight - 10);
    ctx.fillRect(obs.x + 5, obs.bottomY + 10, 10, canvas.height - obs.bottomY - 10);
}

function drawPowerup(powerup) {
    const colors = {
        shield: '#4facfe',
        slowmo: '#f5576c',
        double: '#43e97b'
    };
    
    const icons = {
        shield: '🛡️',
        slowmo: '⏱️',
        double: '⭐'
    };
    
    // Glow effect
    const glow = ctx.createRadialGradient(
        powerup.x, powerup.y, 0,
        powerup.x, powerup.y, powerup.radius * 1.5
    );
    glow.addColorStop(0, colors[powerup.type] + '80');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(powerup.x, powerup.y, powerup.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Orb
    ctx.fillStyle = colors[powerup.type];
    ctx.beginPath();
    ctx.arc(powerup.x, powerup.y, powerup.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Icon
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icons[powerup.type], powerup.x, powerup.y);
}

function drawParticle(p) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

// ===== UI Functions =====
function updateScoreDisplay() {
    scoreDisplay.textContent = state.score;
}

function updatePowerupsDisplay() {
    powerupsActive.innerHTML = '';
    
    Object.keys(state.activePowerups).forEach(type => {
        if (state.activePowerups[type]) {
            const icons = {
                shield: '🛡️',
                slowmo: '⏱️',
                double: '⭐'
            };
            
            const colors = {
                shield: '#4facfe',
                slowmo: '#f5576c',
                double: '#43e97b'
            };
            
            const div = document.createElement('div');
            div.className = 'powerup-active-icon';
            div.style.background = colors[type];
            div.innerHTML = icons[type];
            
            // Add timer for timed power-ups
            if (CONFIG.powerupDuration[type] > 0) {
                const timer = document.createElement('span');
                timer.className = 'timer';
                div.appendChild(timer);
                
                // Update timer countdown
                const interval = setInterval(() => {
                    if (!state.activePowerups[type]) {
                        clearInterval(interval);
                        return;
                    }
                    // Visual indicator only (actual timing handled by setTimeout)
                }, 100);
            }
            
            powerupsActive.appendChild(div);
        }
    });
}

function shareScore() {
    const text = `🐱 I scored ${state.score} points in Cat Tap! Can you beat my high score of ${state.highScore}?`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Cat Tap',
            text: text,
            url: window.location.href
        }).catch(() => {
            copyToClipboard(text);
        });
    } else {
        copyToClipboard(text);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('shareBtn');
        const originalText = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

// ===== Start Game =====
init();
