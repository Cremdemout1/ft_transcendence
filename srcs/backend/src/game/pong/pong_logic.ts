
// ...existing code...

type Paddle = {
  x: number;
  y: number;
  height: number;
  depth: number;
  speed: number;
  distance_from_face: number;
};

export class GameMath {
  /**
   * Returns the position of the paddle for the given playerId
   */
  public getPaddlePosition(playerId: string) {
    const paddle = this.paddles[playerId];
    if (!paddle) return { x: 0, y: 0 };
    return { x: paddle.x, y: paddle.y };
  }

  /**
   * Returns the ball state (position, velocity, lastTouchedBy)
   */
  public getBallState() {
    return {
      position: { x: this.ball.x, y: this.ball.y, z: this.ball.z },
      velocity: { ...this.ball.velocity },
      lastTouchedBy: this.lastTouchedPaddleId,
    };
  }

  /**
   * Returns the scores for each player
   */
  public getScores() {
    return { ...this.scores };
  }

  private ball = {
    x: 0,
    y: 0,
    z: 0,
    velocity: { x: 0.02, y: 0.04, z: -0.01 },
    radius: 0.01,
  };
  private paddles: Record<string, Paddle> = {};
  private scores: Record<string, number> = {};
  private gameArea = { width: 1.8, height: 1.8, depth: 1.8 };
  private lastTouchedPaddleId: string | null = null;

  public addPlayer(playerId: string) {
    this.paddles[playerId] = {
      x: 0,
      y: 0,
      height: 0.2,
      depth: 0.02,
      speed: 0.01,
      distance_from_face: 0.02,
    };
    this.scores[playerId] = 0;
  }

  public removePlayer(playerId: string) {
    delete this.paddles[playerId];
    delete this.scores[playerId];
  }

  // Accepts a map of playerId -> input
  public update(playerInputs: Record<string, { up: number; down: number; left: number; right: number }>, reset: number) {
    if (reset) this.resetBall();
    else {
      this.ball.x += this.ball.velocity.x;
      this.ball.y += this.ball.velocity.y;
      this.ball.z += this.ball.velocity.z;
      // Move each paddle according to its input
      for (const playerId in playerInputs) {
        const input = playerInputs[playerId];
        this.movePaddle(playerId, input.up, input.down, input.left, input.right);
      }
      this.paddleCollisions();
      this.wallCollisions();
    }
  }

  private wallCollisions() {
    if (Math.abs(this.ball.x) >= this.gameArea.width / 2) {
      this.ball.velocity.x *= -1;
      
      this.ball.x = Math.sign(this.ball.x) * (this.gameArea.width / 2 - 0.01);
      // increment score for the last paddle that touched the ball (simple version)
      if (this.lastTouchedPaddleId && this.scores[this.lastTouchedPaddleId] !== undefined) {
        this.scores[this.lastTouchedPaddleId]++;
      }
      this.resetBall();
    }

    if (Math.abs(this.ball.y) >= this.gameArea.height / 2) {
      this.ball.velocity.y *= -1;
      this.ball.y = Math.sign(this.ball.y) * (this.gameArea.height / 2 - 0.01);
    }

    if (Math.abs(this.ball.z) >= this.gameArea.depth / 2) {
      this.ball.velocity.z *= -1;
      this.ball.z = Math.sign(this.ball.z) * (this.gameArea.depth / 2 - 0.01);
    }
    //console.log("wall collisions done!");
  }
  
  movePaddle(playerId: string, up: number, down: number, left: number, right: number) {
    const paddle = this.paddles[playerId];
    if (!paddle) return;
    let moveAmount = paddle.speed;
    let horizontal = 0;
    let vertical = 0;
    if (up) vertical++;
    if (down) vertical--;
    if (left) horizontal--;
    if (right) horizontal++;
    moveAmount = horizontal < 0 ? -moveAmount : moveAmount;
    if (horizontal != 0) paddle.x += moveAmount;
    moveAmount = paddle.speed;
    moveAmount = vertical < 0 ? -moveAmount : moveAmount;
    if (vertical != 0) paddle.y += moveAmount;
    if (Math.abs(paddle.x) > this.gameArea.width / 2 - paddle.height) {
      paddle.x = Math.sign(paddle.x) * (this.gameArea.width / 2 - paddle.height);
    }
    if (Math.abs(paddle.y) > this.gameArea.width / 2 - paddle.height) {
      paddle.y = Math.sign(paddle.y) * (this.gameArea.width / 2 - paddle.height);
    }
  }

  private calculateDirection(paddle: Paddle) {

  const offset = (this.ball.y - paddle.y) / (paddle.height / 2);
  console.log(offset);
  const clamped = Math.max(-1, Math.min(1, offset));
  console.log(clamped);
  const maxAngle = (75 * Math.PI) / 180;
  const deflection = clamped * maxAngle;
  console.log(deflection);

  type Vec3 = {
    x: number,
    y: number,
    z: number
  }
  const base: Vec3 = { x: -1, y: 0, z: 0 };

    const cos = Math.cos(deflection);
    const sin = Math.sin(deflection);

    this.ball.velocity.x = (base.x * cos - base.y * sin) * 0.01;
    this.ball.velocity.y = -(base.x * sin + base.y * cos) * 0.01;
    this.ball.velocity.z = base.z;
  console.log(this.ball.velocity);

}

  private paddleCollisions() {
    // Check collision for each paddle
    for (const playerId in this.paddles) {
      const paddle = this.paddles[playerId];
      const height = paddle.height + 0.15; //margin
      if (
        this.ball.x >=
          this.gameArea.width / 2 -
            paddle.depth -
            paddle.distance_from_face -
            this.ball.radius &&
        this.ball.y > paddle.y - height / 2 &&
        this.ball.y < paddle.y + height / 2 &&
        this.ball.z > -(paddle.x + height / 2) &&
        this.ball.z < -(paddle.x - height / 2)
      ) {
        this.calculateDirection(paddle);
        // Track last paddle to touch the ball for scoring
        this.lastTouchedPaddleId = playerId;
        // Clamp
        this.ball.x =
          Math.sign(this.ball.x) *
          (this.gameArea.width / 2 -
            paddle.depth -
            paddle.distance_from_face -
            this.ball.radius -
            0.001);
      }
    }
  }
  
  private resetBall() {
    this.ball = {
      x: 0,
      y: 0,
      z: 0,
      velocity: {
        x: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.005),
        y: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.005),
        z: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.005),
      },
      radius: this.ball.radius,
    };
    //console.log("Ball reset! Scores:", this.scores);
  }

  public getState() {
    // Always return ball, paddles (map), and scores (map)
    return {
      ball: { ...this.ball },
      paddles: { ...this.paddles },
      scores: { ...this.scores },
    };
  }
}
