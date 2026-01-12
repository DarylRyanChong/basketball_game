// Basketball Shooting Game - Web Version (Full Features)
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 1280;
canvas.height = 720;

// ============================================
// GAME CONSTANTS
// ============================================
const GROUND_Y = 100;
const GROUND_HEIGHT = 20;
const CEILING_Y = canvas.height;
const CEILING_HEIGHT = 20;
const WALL_WIDTH = 20;
const LEFT_WALL_X = 0;
const RIGHT_WALL_X = 1200;

// ============================================
// PHYSICS PARAMETERS
// ============================================
let gravity = 0.5;
let bounciness = 0.5;
let friction = 0.1;
let timeScale = 1.0;

// ============================================
// BALL
// ============================================
const BALL_RADIUS = 20;
const START_X = 100;
const START_Y = GROUND_Y + BALL_RADIUS;
let ballX = START_X;
let ballY = START_Y;
let velocityX = 0;
let velocityY = 0;

// ============================================
// UI CLASSES
// ============================================
class Slider {
    constructor(x, y, w, h, min, max, value, label) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.min = min;
        this.max = max;
        this.value = value;
        this.label = label;
        this.dragging = false;
    }

    draw() {
        // Track
        ctx.fillStyle = '#c8c8c8';
        ctx.fillRect(this.x, this.y, this.w, this.h);

        // Handle
        const rel = (this.value - this.min) / (this.max - this.min);
        const handleX = this.x + rel * this.w;
        ctx.fillStyle = '#646464';
        ctx.beginPath();
        ctx.arc(handleX, this.y + this.h / 2, this.h, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.font = '14px Arial';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'left';
        ctx.fillText(`${this.label}: ${this.value.toFixed(2)}`, this.x, this.y - 5);
    }

    handleMouse(mx, my, pressed) {
        if (pressed && my >= this.y - 5 && my <= this.y + this.h + 5 &&
            mx >= this.x && mx <= this.x + this.w) {
            this.dragging = true;
        }
        if (this.dragging) {
            const rel = Math.max(0, Math.min(1, (mx - this.x) / this.w));
            this.value = this.min + rel * (this.max - this.min);
        }
    }

    stopDrag() {
        this.dragging = false;
    }
}

class InputField {
    constructor(x, y, w, h, label, defaultVal) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.label = label;
        this.value = defaultVal;
        this.text = String(defaultVal);
        this.active = false;
    }

    draw() {
        // Background
        ctx.fillStyle = this.active ? '#dcf0ff' : '#f0f0f0';
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeStyle = '#646464';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.w, this.h);

        // Text
        ctx.font = '14px Arial';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'left';
        ctx.fillText(this.text, this.x + 5, this.y + this.h / 2 + 5);

        // Label
        ctx.fillText(this.label, this.x, this.y - 5);
    }

    handleClick(mx, my) {
        this.active = mx >= this.x && mx <= this.x + this.w &&
            my >= this.y && my <= this.y + this.h;
    }

    handleKey(key) {
        if (!this.active) return false;
        if (key === 'Backspace') {
            this.text = this.text.slice(0, -1);
        } else if (key === 'Enter') {
            this.active = false;
            this.value = parseFloat(this.text) || 0;
            return true;
        } else if ('0123456789.-'.includes(key)) {
            this.text += key;
        }
        return false;
    }
}

class GlassDisplay {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    draw(bx, by, vx, vy) {
        // Glass background
        ctx.fillStyle = 'rgba(200, 220, 255, 0.7)';
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.w, this.h, 12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 140, 180, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Title
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#283c64';
        ctx.textAlign = 'left';
        ctx.fillText('Ball Status', this.x + 10, this.y + 22);

        // Values
        ctx.font = '14px Arial';
        ctx.fillStyle = '#1e3250';
        const speed = Math.sqrt(vx * vx + vy * vy);
        ctx.fillText(`Position: (${bx.toFixed(1)}, ${by.toFixed(1)})`, this.x + 10, this.y + 45);
        ctx.fillText(`Velocity: (${vx.toFixed(1)}, ${vy.toFixed(1)})`, this.x + 10, this.y + 67);
        ctx.fillText(`Speed: ${speed.toFixed(1)}`, this.x + 10, this.y + 89);
    }
}

// ============================================
// HOOP
// ============================================
class Hoop {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.rimWidth = 60;
        this.backboardWidth = 10;
        this.backboardHeight = 80;
        this.rimThickness = 5;
        this.scored = false;
    }

    moveToRandom(minX, maxX, minY, maxY) {
        this.x = minX + Math.random() * (maxX - minX);
        this.y = minY + Math.random() * (maxY - minY);
        this.scored = false;
    }

    checkScore(bx, by, vy, radius) {
        if (this.scored) return false;
        if (vy >= 0) return false;
        const rimLeft = this.x - this.rimWidth / 2;
        const rimRight = this.x + this.rimWidth / 2;
        if (bx > rimLeft && bx < rimRight) {
            if (Math.abs(by - this.y) < radius + 5) {
                this.scored = true;
                return true;
            }
        }
        return false;
    }

    draw() {
        const rimY = canvas.height - this.y;
        const backboardX = this.x + this.rimWidth / 2;

        ctx.fillStyle = '#c8c8c8';
        ctx.fillRect(backboardX, rimY - this.backboardHeight / 2, this.backboardWidth, this.backboardHeight);
        ctx.strokeStyle = '#646464';
        ctx.lineWidth = 2;
        ctx.strokeRect(backboardX, rimY - this.backboardHeight / 2, this.backboardWidth, this.backboardHeight);

        const rimLeft = this.x - this.rimWidth / 2;
        ctx.strokeStyle = '#ff6400';
        ctx.lineWidth = this.rimThickness;
        ctx.beginPath();
        ctx.moveTo(rimLeft, rimY);
        ctx.lineTo(this.x + this.rimWidth / 2, rimY);
        ctx.stroke();

        ctx.strokeStyle = '#c8c8c8';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const netX = rimLeft + i * (this.rimWidth / 4);
            ctx.beginPath();
            ctx.moveTo(netX, rimY);
            ctx.lineTo(netX, rimY + 30);
            ctx.stroke();
        }
    }
}

// ============================================
// CREATE UI ELEMENTS
// ============================================
const gravitySlider = new Slider(250, 40, 200, 10, 0, 1, gravity, 'Gravity');
const bouncinessSlider = new Slider(250, 80, 200, 10, 0, 1, bounciness, 'Bounciness');
const frictionSlider = new Slider(250, 120, 200, 10, 0, 1, friction, 'Friction');
const timeScaleSlider = new Slider(700, 40, 150, 10, 0, 3, timeScale, 'Time Scale');
const velXInput = new InputField(500, 30, 80, 25, 'Set Vel X', 0);
const velYInput = new InputField(600, 30, 80, 25, 'Set Vel Y', 0);
const glassDisplay = new GlassDisplay(1050, 50, 200, 110);
const hoop = new Hoop(800, 400);

// ============================================
// GAME STATE
// ============================================
let gameState = 'aiming';
let shotAngle = 60;
let chargePower = 0;
const MAX_POWER = 25;
let charging = false;
let score = 0;
let celebrationTimer = 0;
const CELEBRATION_DURATION = 90;
let scoredFromBelow = false;

// ============================================
// INPUT HANDLING
// ============================================
const keys = {};
let mouseX = 0, mouseY = 0, mousePressed = false;

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    mousePressed = true;

    velXInput.handleClick(mouseX, mouseY);
    velYInput.handleClick(mouseX, mouseY);

    gravitySlider.handleMouse(mouseX, mouseY, true);
    bouncinessSlider.handleMouse(mouseX, mouseY, true);
    frictionSlider.handleMouse(mouseX, mouseY, true);
    timeScaleSlider.handleMouse(mouseX, mouseY, true);
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    if (mousePressed) {
        gravitySlider.handleMouse(mouseX, mouseY, true);
        bouncinessSlider.handleMouse(mouseX, mouseY, true);
        frictionSlider.handleMouse(mouseX, mouseY, true);
        timeScaleSlider.handleMouse(mouseX, mouseY, true);
    }
});

canvas.addEventListener('mouseup', () => {
    mousePressed = false;
    gravitySlider.stopDrag();
    bouncinessSlider.stopDrag();
    frictionSlider.stopDrag();
    timeScaleSlider.stopDrag();
});

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    // Handle input fields
    if (velXInput.handleKey(e.key)) {
        velocityX = velXInput.value;
    }
    if (velYInput.handleKey(e.key)) {
        velocityY = velYInput.value;
    }

    if (e.code === 'Space' && !velXInput.active && !velYInput.active) {
        e.preventDefault();
        if (gameState === 'aiming') {
            charging = true;
        } else if (gameState === 'shooting') {
            resetBall();
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;

    if (e.code === 'Space' && charging) {
        charging = false;
        const rad = shotAngle * Math.PI / 180;
        velocityX = chargePower * Math.cos(rad);
        velocityY = chargePower * Math.sin(rad);
        chargePower = 0;
        gameState = 'shooting';
    }
});

// ============================================
// GAME FUNCTIONS
// ============================================
function resetBall() {
    ballX = START_X;
    ballY = START_Y;
    velocityX = 0;
    velocityY = 0;
    gameState = 'aiming';
    charging = false;
    chargePower = 0;
    hoop.scored = false;
}

function drawClownFace(cx, cy) {
    // Face (larger to contain mouth)
    ctx.fillStyle = '#ffffc8';
    ctx.beginPath();
    ctx.arc(cx, cy, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Red nose
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - 30, cy - 30, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 30, cy - 30, 18, 0, Math.PI * 2);
    ctx.fill();

    // Pupils (crazy look)
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx - 25, cy - 35, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 35, cy - 25, 8, 0, Math.PI * 2);
    ctx.fill();

    // Smile (moved up, smaller to fit inside face)
    ctx.strokeStyle = '#c80000';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy + 25, 35, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Rainbow hair
    const colors = ['#ff0000', '#ffa500', '#ffff00', '#00ff00', '#0000ff'];
    for (let i = 0; i < 5; i++) {
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.arc(cx - 60 + i * 30, cy - 90, 25, 0, Math.PI * 2);
        ctx.fill();
    }

    // Text
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#ff0064';
    ctx.textAlign = 'center';
    ctx.fillText('HAHA CHEATER!', cx, cy + 150);
}

// ============================================
// GAME LOOP
// ============================================
function update() {
    // Update physics from sliders
    gravity = gravitySlider.value;
    bounciness = bouncinessSlider.value;
    friction = frictionSlider.value;
    timeScale = timeScaleSlider.value;

    // Continuous input for aiming
    if (gameState === 'aiming' && !velXInput.active && !velYInput.active) {
        if (keys['ArrowLeft']) shotAngle = Math.min(90, shotAngle + 1);
        if (keys['ArrowRight']) shotAngle = Math.max(10, shotAngle - 1);
        if (charging) chargePower = Math.min(MAX_POWER, chargePower + 0.5);
    }

    // Physics
    velocityY -= gravity * timeScale;
    ballX += velocityX * timeScale;
    ballY += velocityY * timeScale;

    // Collisions
    if (ballY - BALL_RADIUS <= GROUND_Y) {
        ballY = GROUND_Y + BALL_RADIUS;
        velocityY = -velocityY * bounciness;
        const ff = friction * gravity;
        if (velocityX > 0) velocityX = Math.max(0, velocityX - ff);
        else if (velocityX < 0) velocityX = Math.min(0, velocityX + ff);
    }
    if (ballX - BALL_RADIUS <= LEFT_WALL_X + WALL_WIDTH) {
        ballX = LEFT_WALL_X + WALL_WIDTH + BALL_RADIUS;
        velocityX = -velocityX * bounciness;
    }
    if (ballX + BALL_RADIUS >= RIGHT_WALL_X) {
        ballX = RIGHT_WALL_X - BALL_RADIUS;
        velocityX = -velocityX * bounciness;
    }
    if (ballY + BALL_RADIUS >= CEILING_Y - CEILING_HEIGHT) {
        ballY = CEILING_Y - CEILING_HEIGHT - BALL_RADIUS;
        velocityY = -velocityY * bounciness;
    }

    // Scoring
    if (gameState === 'shooting') {
        if (hoop.checkScore(ballX, ballY, velocityY, BALL_RADIUS)) {
            score++;
            gameState = 'celebrating';
            celebrationTimer = CELEBRATION_DURATION;
            scoredFromBelow = false;
        } else if (!hoop.scored) {
            const rimLeft = hoop.x - hoop.rimWidth / 2;
            const rimRight = hoop.x + hoop.rimWidth / 2;
            if (ballX > rimLeft && ballX < rimRight && Math.abs(ballY - hoop.y) < BALL_RADIUS + 5) {
                if (velocityY > 0) {
                    score++;
                    hoop.scored = true;
                    gameState = 'celebrating';
                    celebrationTimer = CELEBRATION_DURATION;
                    scoredFromBelow = true;
                }
            }
        }
    }

    if (gameState === 'celebrating') {
        celebrationTimer--;
        if (celebrationTimer <= 0) {
            if (!scoredFromBelow) hoop.moveToRandom(300, 1100, 250, 550);
            resetBall();
        }
    }
}

function draw() {
    // Background
    ctx.fillStyle = '#f0f8ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ground
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, canvas.height - GROUND_Y, canvas.width, GROUND_Y);

    // Ceiling
    ctx.fillStyle = '#323232';
    ctx.fillRect(0, 0, canvas.width, CEILING_HEIGHT);

    // Walls
    ctx.fillStyle = '#000';
    ctx.fillRect(LEFT_WALL_X, 0, WALL_WIDTH, canvas.height - GROUND_Y);
    ctx.fillRect(RIGHT_WALL_X, 0, WALL_WIDTH, canvas.height - GROUND_Y);

    // Hoop
    hoop.draw();

    // Aim arrow
    if (gameState === 'aiming') {
        const rad = shotAngle * Math.PI / 180;
        const arrowLength = 60 + chargePower * 3;
        const arrowEndX = ballX + arrowLength * Math.cos(rad);
        const arrowEndY = ballY + arrowLength * Math.sin(rad);

        ctx.strokeStyle = '#009600';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(ballX, canvas.height - ballY);
        ctx.lineTo(arrowEndX, canvas.height - arrowEndY);
        ctx.stroke();

        ctx.fillStyle = '#00c800';
        ctx.beginPath();
        ctx.arc(arrowEndX, canvas.height - arrowEndY, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    // Power bar
    if (gameState === 'aiming') {
        const barX = 30, barY = canvas.height - 70;
        ctx.strokeStyle = '#646464';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, 150, 20);

        const fillWidth = (chargePower / MAX_POWER) * 150;
        let color = '#00ff00';
        if (chargePower >= MAX_POWER * 0.8) color = '#ff0000';
        else if (chargePower >= MAX_POWER * 0.5) color = '#ffa500';
        ctx.fillStyle = color;
        ctx.fillRect(barX, barY, fillWidth, 20);

        ctx.font = '16px Arial';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'left';
        ctx.fillText(`Power: ${Math.floor(chargePower)}`, barX, barY - 10);
        ctx.fillText(`Angle: ${shotAngle}°`, barX, barY - 30);
    }

    // Ball
    ctx.fillStyle = '#ff7f00';
    ctx.beginPath();
    ctx.arc(ballX, canvas.height - ballY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c85000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // UI Elements
    gravitySlider.draw();
    bouncinessSlider.draw();
    frictionSlider.draw();
    timeScaleSlider.draw();
    velXInput.draw();
    velYInput.draw();
    glassDisplay.draw(ballX, ballY, velocityX, velocityY);

    // Score
    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = '#000064';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 1100, 190);

    // Controls hint
    ctx.font = '16px Arial';
    ctx.fillStyle = '#505050';
    ctx.textAlign = 'center';
    ctx.fillText('← → Aim  |  SPACE Shoot/Reset', 640, canvas.height - 20);

    // Celebration
    if (gameState === 'celebrating') {
        if (Math.floor(celebrationTimer / 5) % 2 === 0) {
            if (scoredFromBelow) {
                drawClownFace(640, 360);
            } else {
                ctx.font = 'bold 72px Arial';
                ctx.fillStyle = '#ffd700';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.textAlign = 'center';
                ctx.strokeText('WELL DONE!', 640, 360);
                ctx.fillText('WELL DONE!', 640, 360);
            }
        }
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
