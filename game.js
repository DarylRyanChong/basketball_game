// Basketball Shooting Game - Web Version
// Canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
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
        if (vy >= 0) return false; // Must be moving down

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

        // Backboard
        ctx.fillStyle = '#c8c8c8';
        ctx.fillRect(backboardX, rimY - this.backboardHeight / 2,
            this.backboardWidth, this.backboardHeight);
        ctx.strokeStyle = '#646464';
        ctx.lineWidth = 2;
        ctx.strokeRect(backboardX, rimY - this.backboardHeight / 2,
            this.backboardWidth, this.backboardHeight);

        // Rim
        const rimLeft = this.x - this.rimWidth / 2;
        ctx.strokeStyle = '#ff6400';
        ctx.lineWidth = this.rimThickness;
        ctx.beginPath();
        ctx.moveTo(rimLeft, rimY);
        ctx.lineTo(this.x + this.rimWidth / 2, rimY);
        ctx.stroke();

        // Net
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

const hoop = new Hoop(800, 400);

// ============================================
// GAME STATE
// ============================================
let gameState = 'aiming'; // aiming, shooting, celebrating
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

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    if (e.code === 'Space') {
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
    // Face
    ctx.fillStyle = '#ffffc8';
    ctx.beginPath();
    ctx.arc(cx, cy, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Red nose
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(cx, cy + 10, 20, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (crazy!)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - 30, cy - 20, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 30, cy - 20, 18, 0, Math.PI * 2);
    ctx.fill();

    // Pupils (different positions for crazy look)
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx - 25, cy - 25, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 35, cy - 15, 8, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#c80000';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy + 40, 50, 0, Math.PI);
    ctx.stroke();

    // Rainbow hair
    const colors = ['#ff0000', '#ffa500', '#ffff00', '#00ff00', '#0000ff'];
    for (let i = 0; i < 5; i++) {
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.arc(cx - 60 + i * 30, cy - 80, 25, 0, Math.PI * 2);
        ctx.fill();
    }

    // Text
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#ff0064';
    ctx.textAlign = 'center';
    ctx.fillText('HAHA CHEATER!', cx, cy + 140);
}

// ============================================
// GAME LOOP
// ============================================
function update() {
    // Continuous input for aiming
    if (gameState === 'aiming') {
        if (keys['ArrowLeft']) {
            shotAngle = Math.min(90, shotAngle + 1);
        }
        if (keys['ArrowRight']) {
            shotAngle = Math.max(10, shotAngle - 1);
        }
        if (charging) {
            chargePower = Math.min(MAX_POWER, chargePower + 0.5);
        }
    }

    // Physics update
    velocityY -= gravity * timeScale;
    ballX += velocityX * timeScale;
    ballY += velocityY * timeScale;

    // Ground collision
    if (ballY - BALL_RADIUS <= GROUND_Y) {
        ballY = GROUND_Y + BALL_RADIUS;
        velocityY = -velocityY * bounciness;
        const frictionForce = friction * gravity;
        if (velocityX > 0) velocityX = Math.max(0, velocityX - frictionForce);
        else if (velocityX < 0) velocityX = Math.min(0, velocityX + frictionForce);
    }

    // Left wall collision
    if (ballX - BALL_RADIUS <= LEFT_WALL_X + WALL_WIDTH) {
        ballX = LEFT_WALL_X + WALL_WIDTH + BALL_RADIUS;
        velocityX = -velocityX * bounciness;
    }

    // Right wall collision
    if (ballX + BALL_RADIUS >= RIGHT_WALL_X) {
        ballX = RIGHT_WALL_X - BALL_RADIUS;
        velocityX = -velocityX * bounciness;
    }

    // Ceiling collision
    if (ballY + BALL_RADIUS >= CEILING_Y - CEILING_HEIGHT) {
        ballY = CEILING_Y - CEILING_HEIGHT - BALL_RADIUS;
        velocityY = -velocityY * bounciness;
    }

    // Scoring
    if (gameState === 'shooting') {
        // Normal score (ball moving down)
        if (hoop.checkScore(ballX, ballY, velocityY, BALL_RADIUS)) {
            score++;
            gameState = 'celebrating';
            celebrationTimer = CELEBRATION_DURATION;
            scoredFromBelow = false;
        }
        // Cheater score (ball moving up)
        else if (!hoop.scored) {
            const rimLeft = hoop.x - hoop.rimWidth / 2;
            const rimRight = hoop.x + hoop.rimWidth / 2;
            if (ballX > rimLeft && ballX < rimRight &&
                Math.abs(ballY - hoop.y) < BALL_RADIUS + 5) {
                if (velocityY > 0) { // Moving UP = cheating!
                    score++;
                    hoop.scored = true;
                    gameState = 'celebrating';
                    celebrationTimer = CELEBRATION_DURATION;
                    scoredFromBelow = true;
                }
            }
        }
    }

    // Celebration
    if (gameState === 'celebrating') {
        celebrationTimer--;
        if (celebrationTimer <= 0) {
            if (!scoredFromBelow) {
                hoop.moveToRandom(300, 1100, 250, 550);
            }
            resetBall();
        }
    }
}

function draw() {
    // Clear screen
    ctx.fillStyle = '#f0f8ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ground (court floor)
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

    // Aim arrow (only when aiming)
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

        // Arrowhead
        ctx.fillStyle = '#00c800';
        ctx.beginPath();
        ctx.arc(arrowEndX, canvas.height - arrowEndY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Power bar
        const barX = 30, barY = canvas.height - 70;
        const barWidth = 150, barHeight = 20;
        ctx.strokeStyle = '#646464';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        const fillWidth = (chargePower / MAX_POWER) * barWidth;
        let color = '#00ff00';
        if (chargePower >= MAX_POWER * 0.8) color = '#ff0000';
        else if (chargePower >= MAX_POWER * 0.5) color = '#ffa500';
        ctx.fillStyle = color;
        ctx.fillRect(barX, barY, fillWidth, barHeight);

        // Power text
        ctx.font = '16px Arial';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'left';
        ctx.fillText(`Power: ${Math.floor(chargePower)}`, barX, barY - 10);
        ctx.fillText(`Angle: ${shotAngle}°`, barX, barY - 30);
    }

    // Ball
    const ballScreenY = canvas.height - ballY;
    ctx.fillStyle = '#ff7f00';
    ctx.beginPath();
    ctx.arc(ballX, ballScreenY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c85000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Score
    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = '#000064';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 1100, 170);

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

// Start the game
gameLoop();
