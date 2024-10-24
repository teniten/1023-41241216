const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let ballRadius = 10;
let x = canvas.width / 2;
let y = canvas.height - 30;
let baseDx = 2;  // 基礎水平速度
let baseDy = -2;  // 基礎垂直速度
let dx = baseDx;
let dy = baseDy;
let speedFactor = 1;  // 速度係數，根據難度調整
let paddleHeight = 10;
let paddleWidth = 75;
let paddleX = (canvas.width - paddleWidth) / 2;
let rightPressed = false;
let leftPressed = false;
let brickRowCount = 3;  // 預設為3行
let brickColumnCount = 5;
let brickWidth = 75;
let brickHeight = 20;
let brickPadding = 10;
let brickOffsetTop = 30;
let totalBricksWidth = brickColumnCount * (brickWidth + brickPadding) - brickPadding;
let brickOffsetLeft = (canvas.width - totalBricksWidth) / 2;
let lives = 3;
let score = 0;
let isPaused = true;  // 控制遊戲開始或暫停
let waitingForNextLevel = false;  // 控制是否等待下一關
let level = 1;  // 當前關卡
const maxLevel = 3;  // 最大關卡數
const bricks = [];
let difficultyFactor = 1;  // 用於根據難度動態調整磚塊數量的係數
let paddleJumpDistance = 30;  // 跳躍距離
let isJumping = false;  // 控制擋板是否在跳躍中
let jumpCooldown = 2000;  // 2秒冷卻時間
let paddleY = canvas.height - paddleHeight;  // 擋板的Y坐標
const originalPaddleY = paddleY;  // 記錄擋板的初始高度
let comboCount = 0;  // 連擊計數
const comboScoreBonus = 5;  // 每次連擊的額外分數
let previousScore = 0;  // 用於記錄上次增加生命值的分數
const hiddenBrickProbability = 0.3;  // 隱藏磚塊的概率
let explosions = []; // 存儲當前的爆破效果
let isBallStarted = false;  // 新增變量來控制球的啟動狀態
let isBallMoving = false;  // 控制球是否正在移動
let ballMoving = false; // 用於標記球是否開始移動


class Explosion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 20; // 爆破的初始大小
        this.alpha = 1; // 透明度
        this.duration = 20; // 持續幀數
    }

    update() {
        this.size += 5; // 增加大小
        this.alpha -= 0.05; // 減少透明度
        this.duration--;
    }

    isFinished() {
        return this.duration <= 0; // 檢查是否結束
    }
}

for (let c = 0; c < brickColumnCount; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickRowCount; r++) {
        let isHidden = Math.random() < hiddenBrickProbability; // 隨機決定是否隱藏
        bricks[c][r] = { x: 0, y: 0, status: 1, hitPoints: 1, isHidden: isHidden };
    }
}

// 音效與背景音樂
const bgMusic = document.getElementById('bgMusic');
bgMusic.volume = 0.2;
const hitSound = document.getElementById('hitSound');
hitSound.volume = 0.3;
// 設置關卡難度影響
function setDifficulty(difficulty) {
    switch (difficulty) {
        case "easy":
            speedFactor = 1;  // 簡單速度係數為1
            brickRowCount = 3;  // 簡單模式有3行磚塊
            difficultyFactor = 1;  // 簡單難度磚塊數量不變
            break;
        case "medium":
            speedFactor = 1.2;  // 中等速度快0.2倍
            brickRowCount = 4;  // 中等模式有4行磚塊
            difficultyFactor = 1.5;  // 中等難度磚塊數量為簡單的1.5倍
            break;
        case "hard":
            speedFactor = 1.4;  // 困難速度比中等快0.2倍，比簡單快0.4倍
            brickRowCount = 5;  // 困難模式有5行磚塊
            difficultyFactor = 2;  // 困難難度磚塊數量為中等的1.5倍，總數是簡單的2倍
            break;
    }

    // 根據新的速度係數調整球的速度
    dx = baseDx * speedFactor;
    dy = baseDy * speedFactor;
}

// 根據關卡來初始化磚塊
function initializeBricks() {
    bricks.length = 0;  // 清空之前的磚塊
    if (level === 1) {
        // 關卡一：正常矩形
        for (let c = 0; c < brickColumnCount; c++) {
            bricks[c] = [];
            for (let r = 0; r < brickRowCount; r++) {
                bricks[c][r] = { x: 0, y: 0, status: 1, hitPoints: 1 };
            }
        }
    } else if (level === 2) {
        // 關卡二：心型排列，根據難度調整磚塊數量
        const heartPattern = [
            [0, 1, 1, 0],
            [1, 1, 1, 1],
            [1, 1, 1, 1],
            [0, 1, 1, 0],
            [0, 0, 1, 0],
        ];
        brickColumnCount = Math.round(heartPattern.length * difficultyFactor);
        brickRowCount = Math.round(heartPattern[0].length * difficultyFactor);  // 根據難度增加列數
        for (let c = 0; c < brickColumnCount; c++) {
            bricks[c] = [];
            for (let r = 0; r < brickRowCount; r++) {
                const status = (heartPattern[c % heartPattern.length][r % heartPattern[0].length] || 0);
                bricks[c][r] = { x: 0, y: 0, status, hitPoints: 2 };
            }
        }
    } else if (level === 3) {
        // 關卡三：三角形排列，根據難度調整磚塊數量
        const trianglePattern = [
            [0, 0, 1, 0, 0],
            [0, 1, 1, 1, 0],
            [1, 1, 1, 1, 1],
        ];
        brickColumnCount = Math.round(trianglePattern.length * difficultyFactor);
        brickRowCount = Math.round(trianglePattern[0].length * difficultyFactor);  // 根據難度增加列數
        for (let c = 0; c < brickColumnCount; c++) {
            bricks[c] = [];
            for (let r = 0; r < brickRowCount; r++) {
                const status = (trianglePattern[c % trianglePattern.length][r % trianglePattern[0].length] || 0);
                bricks[c][r] = { x: 0, y: 0, status, hitPoints: 3 };
            }
        }
    }

    // 隨機選擇一個磚塊作為隱藏磚塊
    let randomColumn = Math.floor(Math.random() * brickColumnCount);
    let randomRow = Math.floor(Math.random() * brickRowCount);
    bricks[randomColumn][randomRow].isHidden = true;

    // 根據新的磚塊數量計算磚塊偏移
    totalBricksWidth = brickColumnCount * (brickWidth + brickPadding) - brickPadding;
    brickOffsetLeft = (canvas.width - totalBricksWidth) / 2;
}

// 完成關卡後進入下一關
function nextLevel() {
    if (level < maxLevel) {
        setTimeout(() => {
            alert(`完成關卡 ${level}，準備進入下一關！`);
            level++;
            initializeBricks();
            resetBallAndPaddle();
            waitingForNextLevel = false;
        }, 500);  // 延遲500毫秒進入下一關
    } else {
        setTimeout(() => {
            alert("恭喜你，完成所有關卡！");
            document.location.reload();
        }, 500);  // 延遲500毫秒遊戲結束
    }
}

// 播放音效
function playHitSound() {
    hitSound.currentTime = 0;  // 每次打到磚塊都重新開始播放音效
    hitSound.play();
}

// 遊戲開始時播放背景音樂
function startGame() {
    bgMusic.play();
}

// 停止背景音樂
function gameOver() {
    bgMusic.pause();
    bgMusic.currentTime = 0;  // 重置音樂播放位置
    alert("遊戲結束");
    document.location.reload();
}

function startBall() {
       // 確保只有在遊戲未開始時才執行
    if (isPaused && !waitingForNextLevel) {
        isPaused = false; // 解除暫停
        isBallMoving = true; // 設置為開始移動狀態
        startGame();  // 開始音樂
        // 不立即開始移動球
    }
}



function keyDownHandler(e) {
    if (e.key === "Right" || e.key === "ArrowRight") {
        rightPressed = true;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed = true;
    } else if (e.key === "Control" || e.key === "ControlLeft") {
        paddleJump();
    }
}

function keyUpHandler(e) {
    if (e.key == "Right" || e.key == "ArrowRight") {
        rightPressed = false;
    } else if (e.key == "Left" || e.key == "ArrowLeft") {
        leftPressed = false;
    }
}

function paddleJump() {
    if (!isJumping) {  // 如果不在冷卻中
        paddleY -= 30;  // 向上跳躍5像素
        isJumping = true;  // 開始冷卻
        setTimeout(() => {
            paddleY = originalPaddleY;  // 跳躍後返回原始高度
            isJumping = false;  // 2秒後恢復可跳躍
        }, jumpCooldown);
        setTimeout(() => {
            paddleY += paddleJumpDistance;  // 回到初始高度
            canJump = true;  // 重新允許跳躍
        }, 200);  // 調整為200毫秒
    }
}


function mouseMoveHandler(e) {
    const relativeX = e.clientX - canvas.offsetLeft;
    if (relativeX > 0 && relativeX < canvas.width) {
        paddleX = relativeX - paddleWidth / 2; // 更新擋板位置
    }
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#0095DD";
    ctx.fill();
    ctx.closePath();
}

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, paddleY, paddleWidth, paddleHeight);  // 使用 paddleY 畫擋板
    ctx.fillStyle = "#0095DD";
    ctx.fill();
    ctx.closePath();
}
function getBrickColor(hitPoints) {
    switch (hitPoints) {
        case 3: return "#ff0000";
        case 2: return "#ffa500";
        case 1: return "#0095DD";
        default: return "#0095DD";
    }
}

function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status == 1) {
                const brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                b.x = brickX;
                b.y = brickY;

                // 畫出可見的磚塊
                if (!b.isHidden) {
                    ctx.fillStyle = getBrickColor(b.hitPoints);
                    ctx.fillRect(brickX, brickY, brickWidth, brickHeight);
                    ctx.font = "16px Arial";
                    ctx.fillStyle = "#000";
                    ctx.fillText(b.hitPoints, brickX + brickWidth / 2 - 5, brickY + brickHeight / 2 + 5);
                } else {
                    // 隱藏磚塊顏色（例如透明）
                    ctx.fillStyle = "rgba(255, 255, 255, 0)"; // 或使用 ctx.clearRect(brickX, brickY, brickWidth, brickHeight);
                    ctx.fillRect(brickX, brickY, brickWidth, brickHeight);
                }
            }
        }
    }
}


function collisionDetection() {
    let allBricksCleared = true;  // 偵測是否清空所有磚塊
    let hitThisTurn = false;  // 偵測當前回合是否有擊中

    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status == 1) {
                allBricksCleared = false;
                if (x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
                    dy = -dy;
                    playHitSound();  // 播放擊打音效

                    // 增加連擊計數
                    comboCount++;
                    score += 10;  // 基礎分數

                    // 根據連擊計數增加額外分數
                    score += comboCount * comboScoreBonus;

                    if (b.hitPoints > 1) {
                        b.hitPoints--;
                    } else {
                        b.status = 0; // 磚塊被擊破
                        score += b.hitPoints; // 增加分數
                        if (b.isHidden) {
                            score += 5; // 如果是隱藏磚塊，加5分
                        }
                        // 創建爆破效果
                        explosions.push(new Explosion(b.x + brickWidth / 2, b.y + brickHeight / 2));
                    }
                    
                    hitThisTurn = true;  // 紀錄這一回合有擊中
                }
            }
        }
    }

    if (hitThisTurn) {
        setTimeout(() => {
            comboCount = 0;  // 擊中後重置連擊計數
        },1000);  // 500毫秒內未擊中則重置
    }

    if (allBricksCleared && !waitingForNextLevel) {
        waitingForNextLevel = true;
        nextLevel();  // 所有磚塊清空，延遲進入下一關
    }
}



function drawScore() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#0095DD";
    ctx.fillText("分數: " + score, 8, 20);
}

function drawLives() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#0095DD";
    ctx.fillText("生命值: " + lives, canvas.width - 100, 20);
}

function drawComboScore() {
    if (comboCount > 0) {
        ctx.font = "16px Arial";
        ctx.fillStyle = "#ff0000";  // 設置顏色為紅色
        ctx.fillText("連擊: " + comboCount, canvas.width / 2 - 30, 40);
    }
}


// 顯示當前關卡
function drawLevel() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#0095DD";
    ctx.fillText("關卡: " + level, canvas.width / 2 - 30, 20);
}

function resetBallAndPaddle() {
    x = canvas.width / 2; // 設置球在中間
    y = canvas.height - 30; // 設置球在擋板上方
    dx = baseDx * speedFactor; // 設置初始速度
    dy = baseDy * speedFactor; 
    paddleX = (canvas.width - paddleWidth) / 2; // 設置擋板在中間
    isPaused = true;  // 重置球和擋板後，等待玩家操作
    isBallMoving = false; // 確保球不會立即移動
}


function draw() {
    // 清除畫布但留下一部分透明背景以產生尾跡效果
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height); // 保留尾跡效果

    drawBricks();
    drawBall();
    drawPaddle();
    drawScore();
    drawLives();
    drawLevel();  // 顯示當前關卡
    drawComboScore();  // 顯示連擊分數
    collisionDetection();

    // 處理爆破效果
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        explosion.update(); // 更新爆破狀態

        // 繪製爆破效果
        ctx.fillStyle = `rgba(255, 0, 0, ${explosion.alpha})`; // 紅色，根據透明度變化
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        // 如果爆破動畫完成，從數組中移除
        if (explosion.isFinished()) {
            explosions.splice(i, 1);
        }
    }

    // 更新球的位置和碰撞檢測
    if (!isPaused && isBallMoving) {  // 只有當球在運動時才更新位置
        if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
            dx = -dx;
        }
        if (y + dy < ballRadius) {
            dy = -dy;
        } else if (y + dy > canvas.height - ballRadius) {
            if (x > paddleX && x < paddleX + paddleWidth) {
                dy = -dy;
            } else {
                lives--;
                if (!lives) {
                    gameOver();
                } else {
                    resetBallAndPaddle();
                }
            }
        }

        if (rightPressed && paddleX < canvas.width - paddleWidth) {
            paddleX += 7;
        } else if (leftPressed && paddleX > 0) {
            paddleX -= 7;
        }

        x += dx;
        y += dy;
    }

    requestAnimationFrame(draw);
}



document.getElementById("startBtn").addEventListener("click", () => {
    const difficulty = document.getElementById("difficulty").value;
    setDifficulty(difficulty);
    initializeBricks();
    resetBallAndPaddle();
    draw();
});

document.getElementById("restartBtn").addEventListener("click", () => {
    document.location.reload();
});

// 綁定鍵盤事件處理
document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);
document.addEventListener("mousemove", mouseMoveHandler, false);
document.addEventListener("click", startBall, false);
document.addEventListener("contextmenu", function(e) {
    e.preventDefault();  // 防止預設的右鍵菜單顯示
    paddleJump();  // 呼叫跳躍函數
}, false);


function resetBallAndPaddle() {
    x = canvas.width / 2; // 設置球在中間
    y = canvas.height - 30; // 設置球在擋板上方
    dx = baseDx * speedFactor; // 設置初始速度
    dy = baseDy * speedFactor; 
    paddleX = (canvas.width - paddleWidth) / 2; // 設置擋板在中間
    isPaused = true;  // 重置球和擋板後，等待玩家操作
    isBallMoving = false; // 確保球不會立即移動
}

document.getElementById("restartBtn").addEventListener("click", () => {
    document.location.reload();
});
document.addEventListener("keyup", keyUpHandler, false);
document.addEventListener("mousemove", mouseMoveHandler, false);
document.addEventListener("click", startBall, false);
document.addEventListener("contextmenu", function(e) {
    e.preventDefault();  // 防止預設的右鍵菜單顯示
    paddleJump();  // 呼叫跳躍函數
}, false);
document.addEventListener("keydown", function(e) {
    if (e.key === ' ' || e.key === 'Spacebar') {
        startBall();
    }
});
