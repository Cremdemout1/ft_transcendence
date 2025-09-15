type Paddle2D = {
  x: number;
  y: number;
  height: number;
  depth: number;
  speed: number;
  max_speed: number;
  overshoot: number;
  distance_from_face: number;
  active: number;
  up: number;
  down: number;
  left: number;
  right: number;
  vx: number;
  vy: number;
};

type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export class GameMath {
  private ball = {
    x: 0,
    y: 0,
    z: 0,
    velocity: { x: 0.2, y: 0.4, z: -0.1 },
    radius: 3.25,
    reset: 1, //flag for when the ball has just been reset (to tell client to reset the trail)
  };
  private tmp_ball = {
    x: 0,
    y: 0,
    z: 0,
    velocity: { x: 0, y: 0, z: 0 },
    radius: 3,
  };
  //   private paddle = {
  //     x: 0,
  //     y: 0,
  //     height: 20,
  //     depth: 2,
  //     speed: 1,
  //     distance_from_face: 0,
  //   };

  private paddles: Paddle2D[] = Array.from({ length: 5 }, () => ({
    x: 0,
    y: 0,
    height: 20,
    depth: 2,
    speed: 0.15,
    max_speed: 3,
    overshoot: 0.8,
    distance_from_face: 0,
    active: 0,
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    vx: 0,
    vy: 0,
  }));

  private hitPoint = {
    x: 0,
    y: 0,
    z: 0,
    dist: 0,
  };

  private scores = {
    player1: 0,
    player2: 0,
    player3: 0,
    player4: 0,
    player5: 0,
    player6: 0,
  };
  private gameArea = { width: 100, height: 100, depth: 100 };

  private collision: number = 0;

  public update(
    up: number,
    down: number,
    left: number,
    right: number,
    reset: number
  ) {
    this.paddles[0].active = 1; //this should be in the constructor where we decide how many paddles based on how many players

    this.paddles[0].up = up; //all inputs will be attributed to their respective player here. the server needs to know which input came from which player (base on server client id?)
    this.paddles[0].down = down;
    this.paddles[0].left = left;
    this.paddles[0].right = right;
    if (reset) this.resetBall();
    else {
      this.collision = 0;
      this.ball.x += this.ball.velocity.x;
      this.ball.y += this.ball.velocity.y;
      this.ball.z += this.ball.velocity.z;
      this.ball.reset = 0;
      this.paddleManager(); //here we check all the paddles(that we need to)
      this.wallCollisions(); //also checks score
      //console.log(this.ball.velocity)
      //this.checkScoring();
    }
    if (this.collision || this.ball.reset) this.raycast();
  }

  private raycast() {
    // console.log(this.ball.velocity);
    let v_x = this.ball.velocity.x;
    let v_y = this.ball.velocity.y;
    let v_z = this.ball.velocity.z;

    let p_x = this.ball.x;
    let p_y = this.ball.y;
    let p_z = this.ball.z;
    while (
      p_x < 50 &&
      p_x > -50 &&
      p_y < 50 &&
      p_y > -50 &&
      p_z < 50 &&
      p_z > -50
    ) {
      p_x += v_x;
      p_y += v_y;
      p_z += v_z;
    }
    this.hitPoint.x = p_x;
    this.hitPoint.y = p_y;
    this.hitPoint.z = p_z;
    console.log("---------------------------------");
    console.log("x: " + p_x);
    console.log("y: " + p_y);
    console.log("z: " + p_z);
    console.log("---------------------------------");
  }

  private wallCollisions() {
    if (Math.abs(this.ball.x) >= this.gameArea.width / 2 - this.ball.radius) {
      this.ball.velocity.x *= -1;
      // Clamp
      this.ball.x =
        Math.sign(this.ball.x) *
        (this.gameArea.width / 2 - this.ball.radius - 0.01);
      //if each of these players exist
      if (this.ball.x < 0) this.scores.player1++;
      else this.scores.player2++;
      this.resetBall();
      this.collision = 1;
    }

    if (Math.abs(this.ball.y) >= this.gameArea.height / 2 - this.ball.radius) {
      this.ball.velocity.y *= -1;
      this.ball.y =
        Math.sign(this.ball.y) *
        (this.gameArea.height / 2 - this.ball.radius - 0.01);
      this.collision = 1;
    }

    if (Math.abs(this.ball.z) >= this.gameArea.depth / 2) {
      this.ball.velocity.z *= -1;
      this.ball.z =
        Math.sign(this.ball.z) *
        (this.gameArea.depth / 2 - this.ball.radius - 0.01);
      this.collision = 1;
    }
    //console.log("wall collisions done!");
  }

  movePaddle(paddle: Paddle2D) {
    let ax = 0;
    let ay = 0;

    if (paddle.left) ax -= paddle.speed;
    if (paddle.right) ax += paddle.speed;
    if (paddle.up) ay += paddle.speed;
    if (paddle.down) ay -= paddle.speed;

    paddle.vx += ax;
    paddle.vy += ay;

    if (!paddle.left && !paddle.right) {
      paddle.vx *= paddle.overshoot;
    }
    if (!paddle.up && !paddle.down) {
      paddle.vy *= paddle.overshoot;
    }
    paddle.vx = Math.max(
      -paddle.max_speed,
      Math.min(paddle.vx, paddle.max_speed)
    );
    paddle.vy = Math.max(
      -paddle.max_speed,
      Math.min(paddle.vy, paddle.max_speed)
    );

    paddle.x += paddle.vx;
    paddle.y += paddle.vy;

    if (Math.abs(paddle.x) > this.gameArea.width / 2 - paddle.height / 2) {
      if (paddle.x > 0) paddle.x = this.gameArea.width / 2 - paddle.height / 2;
      else paddle.x = -(this.gameArea.width / 2 - paddle.height / 2);
      paddle.vx = 0;
    }

    if (Math.abs(paddle.y) > this.gameArea.height / 2 - paddle.height / 2) {
      if (paddle.y > 0) paddle.y = this.gameArea.height / 2 - paddle.height / 2;
      else paddle.y = -(this.gameArea.height / 2 - paddle.height / 2);
      paddle.vy = 0;
    }
  }

  private dot_product(x: number, y: number, z: number) {
    //GET VECTOR MAGNITUDE
    // SQUARE ROOT of dot product of the SAME VECTOR (get magnitude)
    return Math.sqrt(x * x + y * y + z * z);
  }

  private normalize(_x: number, _y: number, _z: number, vel: number) {
    //NORMALIZE VECTOR
    const res: Vec3 = { x: _x / vel, y: _y / vel, z: _z / vel };
    return res;
  }

  private calculateDirection(paddle: Paddle2D) {
    // console.log(
    //   "velocity before: " +
    //     this.tmp_ball.velocity.x +
    //     " " +
    //     this.tmp_ball.velocity.y +
    //     " " +
    //     this.tmp_ball.velocity.z
    // );
    const offset = (this.tmp_ball.y - paddle.y) / (paddle.height / 2);
    const maxAngle = (75 * Math.PI) / 180;
    const deflection = offset * maxAngle;

    console.log("ball y: " + this.tmp_ball.y);
    console.log("paddle y: " + paddle.y);
    console.log("diff: " + (this.tmp_ball.y - paddle.y));
    console.log(paddle.height / 2);
    console.log("offset: " + offset);
    console.log("final angle: " + (180 / Math.PI) * deflection);

    // const base: Vec3 = { x: 0, y: 0, z: -1 };

    // const cos = Math.cos(deflection);
    // const sin = Math.sin(deflection);

    // this.tmp_ball.velocity.x = base.x;
    // this.tmp_ball.velocity.z = base.z * cos - base.y * sin;
    // this.tmp_ball.velocity.y = base.z * sin + base.y * cos;

    const offsetX = (this.tmp_ball.x - paddle.x) / (paddle.height / 2);
    const deflectionX = offsetX * maxAngle;

    const vel = this.dot_product(
      this.tmp_ball.velocity.x,
      this.tmp_ball.velocity.y,
      this.tmp_ball.velocity.z
    );

    this.tmp_ball.velocity.x = Math.sin(offsetX);
    this.tmp_ball.velocity.y = Math.sin(offset);
    this.tmp_ball.velocity.z = -Math.cos(offsetX) * Math.cos(offset); //z needs to be negative
    console.log("RESULTING VELOCITY RAW: ");
    console.log(this.tmp_ball.velocity);
    const vel_changed = this.dot_product(
      this.tmp_ball.velocity.x,
      this.tmp_ball.velocity.y,
      this.tmp_ball.velocity.z
    );

    const res = this.normalize(
      this.tmp_ball.velocity.x,
      this.tmp_ball.velocity.y,
      this.tmp_ball.velocity.z,
      vel_changed
    );
    this.tmp_ball.velocity.x = res.x * vel;
    this.tmp_ball.velocity.y = res.y * vel;
    this.tmp_ball.velocity.z = res.z * vel;

    // const cosX = Math.cos(deflectionX);
    // const sinX = Math.sin(deflectionX);

    // const old_vel_z = this.tmp_ball.velocity.z;

    // this.tmp_ball.velocity.z = this.tmp_ball.velocity.x * cosX - this.ball.velocity.z * sinX;
    // this.tmp_ball.velocity.x = old_vel_z * sinX + this.ball.velocity.z * cosX;

    console.log(this.tmp_ball.x);
    console.log(paddle.x);
    console.log(paddle.height / 2);
    console.log(offsetX);
    console.log("final x angle: " + (180 / Math.PI) * deflectionX);

    console.log(this.tmp_ball.velocity);
  }

  private paddleCollisions(paddle: Paddle2D) {
    //the "default" paddle is on the xy plane, perpendicular to the z axis. Looking from the outside, positive y is up, positive x is right and NEGATIVE z is front (incoming ball has a positive Z velocity)
    // console.log(this.ball.velocity);
	// console.log("tmp x velo: "+ this.tmp_ball.velocity.x);
	// console.log("tmp y velo: "+ this.tmp_ball.velocity.y);
	// console.log("tmp z velo: "+ this.tmp_ball.velocity.z);

	const height = paddle.height + 0.15; //margin
    if (
      this.tmp_ball.z >=
        this.gameArea.width / 2 -
          paddle.depth -
          paddle.distance_from_face -
          this.ball.radius &&
      this.tmp_ball.y > paddle.y - height / 2 &&
      this.tmp_ball.y < paddle.y + height / 2 &&
      this.tmp_ball.x < paddle.x + height / 2 &&
      this.tmp_ball.x > paddle.x - height / 2 &&
      this.tmp_ball.velocity.z > 0
    ) {
      console.log("tmp x= " + this.tmp_ball.x);
      console.log("tmp y= " + this.tmp_ball.y);
      console.log("tmp z= " + this.tmp_ball.z);
      console.log("paddle x= " + paddle.x);
      console.log("paddle y= " + paddle.y);
      console.log(
        "rightmost bound (x needs to be less than):" + (paddle.x + height / 2)
      );
      console.log(
        "leftmost bound (x needs to be greater than):" + (paddle.x - height / 2)
      );
      //this.tmp_ball.velocity.z *= -1;
      this.calculateDirection(paddle);
      console.log("collision with paddle1");
      // Clamp
      this.tmp_ball.z =
        Math.sign(this.tmp_ball.z) *
        (this.gameArea.width / 2 -
          paddle.depth -
          paddle.distance_from_face -
          this.ball.radius -
          0.01);

      return 1;
    }
    //else if (check side collisions still)
    return 0;
  }

  private paddleManager() {
    //if paddle=paddle1 flip axes and values like this, etc etc, i can make a proper flipping function later that just copies and then rotates the vector by multiplying the matrixes
    this.paddles.forEach((paddle: Paddle2D) => {
      if (paddle.active) {
        this.movePaddle(paddle); //the input needs to be assigned to a player id (on the game server?) which will then decide which paddle is moved, do movePaddle for each player
        //check sign of 1 axis (is the ball even in that side of the arena?)
        //flip ball velocity (USE A MODULAR FUNCTION)
        //do paddle collision function
        this.tmp_ball.velocity.x = this.ball.velocity.z;
        this.tmp_ball.velocity.y = this.ball.velocity.y;
        this.tmp_ball.velocity.z = this.ball.velocity.x;
        this.tmp_ball.x = this.ball.z;
        this.tmp_ball.y = this.ball.y;
        this.tmp_ball.z = this.ball.x;
        if (this.paddleCollisions(paddle)) {
          //paddle1
          this.ball.velocity.x = this.tmp_ball.velocity.z;
          this.ball.velocity.y = this.tmp_ball.velocity.y;
          this.ball.velocity.z = this.tmp_ball.velocity.x;
          this.ball.x = this.tmp_ball.z;
          this.ball.y = this.tmp_ball.y;
          this.ball.z = this.tmp_ball.x;
          this.collision = 1;
          console.log(this.ball.velocity);
        }
      }
    });
  }

  private resetBall() {
    this.ball = {
      x: 0,
      y: 0,
      z: 0,
      velocity: {
        x: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.5),
        y: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.5),
        z: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.5),
      },
      radius: this.ball.radius,
      reset: 1,
    };
    //console.log("Ball reset! Scores:", this.scores);
  }

  public getState() {
    console.log("collision: " + this.collision + " and reset: " + this.ball.reset);
    return {
      ball: { ...this.ball },
      scores: { ...this.scores },
      paddles: { ...this.paddles },
	  hitPoint: { ...this.hitPoint },
	  hit: this.collision  || this.ball.reset
      //for each player, send an item of the other_paddles array
    };
  }
}
