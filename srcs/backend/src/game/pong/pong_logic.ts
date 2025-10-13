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

type Mat3 = {
  col1: Vec3;
  col2: Vec3;
  col3: Vec3;
};

export class GameMath {
  private ball: {
    pos: Vec3;
    velocity: Vec3;
    radius: number;
    reset: number;
  } = {
    pos: { x: 0, y: 0, z: 0 },
    velocity: { x: 0.2, y: 0.4, z: -0.1 },
    radius: 3.25,
    reset: 1, //flag for when the ball has just been reset (to tell client to reset the trail)
  };
  private tmp_ball: {
    pos: Vec3;
    velocity: Vec3;
    radius: number;
  } = {
    pos: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    radius: 3.25,
  };
  //   private paddle = {
  //     x: 0,
  //     y: 0,
  //     height: 20,
  //     depth: 2,
  //     speed: 1,
  //     distance_from_face: 0,
  //   };

  public paddles: Paddle2D[] = Array.from({ length: 6 }, () => ({
    x: 0,
    y: 0,
    height: 20,
    depth: 2,
    speed: 0.15,
    max_speed: 3,
    overshoot: 0.8,
    distance_from_face: 0,
    active: 0, //should be zero, this is just for testing
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    vx: 0,
    vy: 0,
  }));

  private hitPoint: {
    pos: Vec3;
    dist: number;
  } = {
    pos: { x: 0, y: 0, z: 0 },
    dist: 0,
  };

  private scores = {
    //will also be replaced, indecisive about lumping it with the other variables in the paddle object or keeping it in a player class from the server
    player1: 0,
    player2: 0,
    player3: 0,
    player4: 0,
    player5: 0,
    player6: 0,
  };
  private gameArea = { width: 100, height: 100, depth: 100 };

  private collision: number = 0;

  private add_vec3(a: Vec3, b: Vec3): Vec3 {
    return {
      x: a.x + b.x,
      y: a.y + b.y,
      z: a.z + b.z,
    };
  }

  private subtract_vec3(a: Vec3, b: Vec3): Vec3 {
    return {
      x: a.x - b.x,
      y: a.y - b.y,
      z: a.z - b.z,
    };
  }

  private scale_vec3(scalar: number, v: Vec3) {
    return {
      x: scalar * v.x,
      y: scalar * v.y,
      z: scalar * v.z,
    };
  }

  private rotate_space(v: Vec3, m: Mat3) {
    return this.add_vec3(
      this.add_vec3(this.scale_vec3(v.x, m.col1), this.scale_vec3(v.y, m.col2)),
      this.scale_vec3(v.z, m.col3)
    );
  }

  public update() {
  // remove the input parameters since inputs are now assigned directly to paddles
      this.collision = 0;
      this.ball.pos = this.add_vec3(this.ball.pos, this.ball.velocity);
      this.ball.reset = 0;
      this.paddleManager(); //here we check all the paddles(that we need to)
      this.wallCollisions(); //also checks score
      //console.log(this.ball.velocity)
      //this.checkScoring();
    if (this.collision || this.ball.reset) this.raycast();
  }

  private raycast() {
    let v_: Vec3 = { ...this.ball.velocity };
    let p_: Vec3 = { ...this.ball.pos };

    while (
      p_.x < 50 &&
      p_.x > -50 &&
      p_.y < 50 &&
      p_.y > -50 &&
      p_.z < 50 &&
      p_.z > -50
    ) {
      p_.x += v_.x;
      p_.y += v_.y;
      p_.z += v_.z;
    }
    this.hitPoint.pos = { ...p_ };
    this.hitPoint.dist = this.dot_product(
      this.subtract_vec3(p_, this.ball.pos)
    );
  }

  private wallCollisions() {
    // ADD SCORING IN ALL THE WALLS AFTER COLLISIONS ARE WORKING
    if (
      Math.abs(this.ball.pos.x) >=
      this.gameArea.width / 2 - this.ball.radius
    ) {
      this.ball.velocity.x *= -1;
      // Clamp
      this.ball.pos.x =
        Math.sign(this.ball.pos.x) *
        (this.gameArea.width / 2 - this.ball.radius - 0.01);
      //if each of these players exist
      if (this.ball.pos.x < 0) this.scores.player1++;
      else this.scores.player2++;
      console.log("WALL COLLISION ON X AXIS");
      this.resetBall();
      this.collision = 1;
    }

    if (
      Math.abs(this.ball.pos.y) >=
      this.gameArea.height / 2 - this.ball.radius
    ) {
      this.ball.velocity.y *= -1;
      this.ball.pos.y =
        Math.sign(this.ball.pos.y) *
        (this.gameArea.height / 2 - this.ball.radius - 0.01);
		//IF THESE PLAYERS EXIST
      if (this.ball.pos.y < 0) this.scores.player5++;
      else this.scores.player6++;
	  this.resetBall();
      this.collision = 1;
      console.log("WALL COLLISION ON Y AXIS");
    }

    if (Math.abs(this.ball.pos.z) >= this.gameArea.depth / 2) {
      this.ball.velocity.z *= -1;
      this.ball.pos.z =
        Math.sign(this.ball.pos.z) *
        (this.gameArea.depth / 2 - this.ball.radius - 0.01);
		//IF THESE PLAYERS EXIST
      if (this.ball.pos.z < 0) this.scores.player3++;
      else this.scores.player4++;
	  this.resetBall();
      this.collision = 1;
      console.log("WALL COLLISION ON Z AXIS");
    }
    //console.log("wall collisions done!");
  }

  movePaddle(paddle: Paddle2D) {
    let ax = 0;
    let ay = 0;

    const margin = 1;

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

    if (
      Math.abs(paddle.x) >
      this.gameArea.width / 2 - paddle.height / 2 - margin
    ) {
      if (paddle.x > 0)
        paddle.x = this.gameArea.width / 2 - paddle.height / 2 - margin;
      else paddle.x = -(this.gameArea.width / 2 - paddle.height / 2 - margin);
      paddle.vx = 0;
    }

    if (
      Math.abs(paddle.y) >
      this.gameArea.height / 2 - paddle.height / 2 - margin
    ) {
      if (paddle.y > 0)
        paddle.y = this.gameArea.height / 2 - paddle.height / 2 - margin;
      else paddle.y = -(this.gameArea.height / 2 - paddle.height / 2 - margin);
      paddle.vy = 0;
    }
  }

  private dot_product(v: Vec3) {
    //GET VECTOR MAGNITUDE/DISTANCE
    // this func returns the SQUARE ROOT of dot product of the SAME VECTOR (get magnitude), not the actual dot product
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  private normalize(v: Vec3, vel: number) {
    //NORMALIZE VECTOR
    const res: Vec3 = { x: v.x / vel, y: v.y / vel, z: v.z / vel };
    return res;
  }

  private calculateDirection(paddle: Paddle2D) {
    const offset = (this.tmp_ball.pos.y - paddle.y) / (paddle.height / 2);
    const maxAngle = (75 * Math.PI) / 180;
    const deflection = offset * maxAngle;

    console.log("VELOCITY BEFORE (START): ");
    console.log(this.tmp_ball.velocity);
    console.log("ball y: " + this.tmp_ball.pos.y);
    console.log("paddle y: " + paddle.y);
    console.log("diff y: " + (this.tmp_ball.pos.y - paddle.y));
    console.log(paddle.height / 2);
    console.log("offset: " + offset);
    console.log("deflection: " + deflection);
    console.log("final angle: " + (180 / Math.PI) * deflection);

    const offsetX = (this.tmp_ball.pos.x - paddle.x) / (paddle.height / 2);
    const deflectionX = offsetX * maxAngle;

    console.log("ball x: " + this.tmp_ball.pos.x);
    console.log("paddle x: " + paddle.x);
    console.log("diff: " + (this.tmp_ball.pos.x - paddle.x));
    console.log(paddle.height / 2);
    console.log("offset x: " + offsetX);
    console.log("deflection x: " + deflectionX);
    console.log("final angle: " + (180 / Math.PI) * deflectionX);

    const vel = this.dot_product(this.tmp_ball.velocity);

    this.tmp_ball.velocity.x = Math.sin(deflectionX);
    this.tmp_ball.velocity.y = Math.sin(deflection);
    this.tmp_ball.velocity.z = -Math.cos(deflectionX) * Math.cos(deflection); //z needs to be negative

    const vel_changed = this.dot_product(this.tmp_ball.velocity);

    console.log("tmp_vel: ");
    console.log(this.tmp_ball.velocity);

    const res = this.normalize(this.tmp_ball.velocity, vel_changed);
    console.log("vel: " + vel);
    console.log("_changed: " + vel_changed);
    console.log("res: ");
    console.log(res);
    this.tmp_ball.velocity = this.scale_vec3(vel, res);

    console.log("FINAL DIRECTION/VELOCITY: ");
    console.log(this.tmp_ball.velocity);
  }

  private paddleCollisions(paddle: Paddle2D) {
    const height = paddle.height + 0; //margin, maybe i'll use one later
    // console.log("tmp_ball z pos: " + this.tmp_ball.pos.z);
    // console.log(
    //   "needs to be greater or equal to: " +
    //     (this.gameArea.width / 2 -
    //       paddle.depth -
    //       paddle.distance_from_face -
    //       this.ball.radius)
    // );
    // console.log("tmp_ball y pos: " + this.tmp_ball.pos.y);
    // console.log("paddle y: " + paddle.y);
    // console.log("tmp_ball x pos: " + this.tmp_ball.pos.x);
    // console.log("paddle x: " + paddle.x);
    if (
      this.tmp_ball.pos.z >=
        this.gameArea.width / 2 -
          paddle.depth -
          paddle.distance_from_face -
          this.ball.radius &&
      this.tmp_ball.pos.y > paddle.y - height / 2 &&
      this.tmp_ball.pos.y < paddle.y + height / 2 &&
      this.tmp_ball.pos.x < paddle.x + height / 2 &&
      this.tmp_ball.pos.x > paddle.x - height / 2 &&
      this.tmp_ball.velocity.z > 0
    ) {
    //   console.log("tmp x= " + this.tmp_ball.pos.x);
    //   console.log("tmp y= " + this.tmp_ball.pos.y);
    //   console.log("tmp z= " + this.tmp_ball.pos.z);
    //   console.log("paddle x= " + paddle.x);
    //   console.log("paddle y= " + paddle.y);
    //   console.log(
    //     "rightmost bound (x needs to be less than):" + (paddle.x + height / 2)
    //   );
    //   console.log(
    //     "leftmost bound (x needs to be greater than):" + (paddle.x - height / 2)
    //   );
      //this.tmp_ball.velocity.z *= -1;
      this.calculateDirection(paddle);
      console.log("collision with paddle1");
      // Clamp
      this.tmp_ball.pos.z =
        Math.sign(this.tmp_ball.pos.z) *
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
    // console.log("-----------------------START-----------------------");
    // console.log("BALL VELOCITY BEFORE ROTATION: ");
    // console.log(this.ball.velocity);
    // console.log("BALL POSITION BEFORE ROTATION: ");
    // console.log(this.ball.pos);
    const m: Mat3 = {
      //default matrix (only transforms once in the beggining)
      col1: { x: 0, y: 0, z: 1 },
      col2: { x: 0, y: 1, z: 0 },
      col3: { x: 1, y: 0, z: 0 },
    };
    const ninety_left: Mat3 = {
      //matrix to rotate -90º around y (the vertical axis) (like from paddle 2 to 3)
      col1: { x: 0, y: 0, z: 1 },
      col2: { x: 0, y: 1, z: 0 },
      col3: { x: -1, y: 0, z: 0 },
    };
    const opposite: Mat3 = {
      //matrix to flip perspective (from one paddle to its opposite) 
      col1: { x: -1, y: 0, z: 0 },
      col2: { x: 0, y: 1, z: 0 },
      col3: { x: 0, y: 0, z: -1 },
    };
    const up: Mat3 = {
      //matrix to turn up
      col1: { x: 1, y: 0, z: 0 },
      col2: { x: 0, y: 0, z: 1 },
      col3: { x: 0, y: -1, z: 0 },
    };
    const back: Mat3 = {
      //matrix to turn paddle6 back to 1
      col1: { x: -1, y: 0, z: 0 },
      col2: { x: 0, y: 0, z: -1 },
      col3: { x: 0, y: -1, z: 0 },
    };

    this.tmp_ball.velocity = this.rotate_space(this.ball.velocity, m);
    // console.log("BALL VELOCITY AFTER ROTATION: ");
    // console.log(this.tmp_ball.velocity);
    this.tmp_ball.pos = this.rotate_space(this.ball.pos, m);
    // console.log("BALL POSITION AFTER ROTATION: ");
    // console.log(this.tmp_ball.pos);
    this.paddles.forEach((paddle: Paddle2D, index: number) => {
      if (paddle.active) this.movePaddle(paddle); //the input needs to be assigned to a player id (on the game server?) which will then decide which paddle is moved each, movePaddle is done for each player
		// paddle.x = this.paddles[0].x;
        // paddle.y = this.paddles[0].y;
        if (index == 1 || index == 3 || index == 5) {
          //flip from last position
          this.tmp_ball.velocity = this.rotate_space(
            this.tmp_ball.velocity,
            opposite
          );
          this.tmp_ball.pos = this.rotate_space(this.tmp_ball.pos, opposite);
        } else if (index == 2) {
          //rotate to the left
          this.tmp_ball.velocity = this.rotate_space(
            this.tmp_ball.velocity,
            ninety_left
          );
          this.tmp_ball.pos = this.rotate_space(this.tmp_ball.pos, ninety_left);
        } else if (index == 4) {
          //flip, then rotate left then up
          this.tmp_ball.velocity = this.rotate_space(
            this.tmp_ball.velocity,
            opposite
          );
          this.tmp_ball.pos = this.rotate_space(this.tmp_ball.pos, opposite);
          this.tmp_ball.velocity = this.rotate_space(
            this.tmp_ball.velocity,
            ninety_left
          );
          this.tmp_ball.pos = this.rotate_space(this.tmp_ball.pos, ninety_left);
          this.tmp_ball.velocity = this.rotate_space(
            this.tmp_ball.velocity,
            up
          );
          this.tmp_ball.pos = this.rotate_space(this.tmp_ball.pos, up);
        }
        // console.log("index: " + index);
        // console.log("ball velo: ");
        // console.log(this.tmp_ball.velocity);
        // console.log("ball pos: ");
        // console.log(this.tmp_ball.pos);
		if(this.collision==0 && paddle.active)
		{
        if (this.paddleCollisions(paddle)) {
          this.collision = 1;
          console.log("COLLISION WITH PADDLE " + index);
        }
		}
    }); //so that i don't have to rotate the ball from odd angles, it always checks all 6 paddles so in the end i just have to rotate back from paddle6
    this.tmp_ball.velocity = this.rotate_space(this.tmp_ball.velocity, back);
    this.tmp_ball.pos = this.rotate_space(this.tmp_ball.pos, back);
    this.ball.velocity = this.rotate_space(this.tmp_ball.velocity, m);
    this.ball.pos = this.rotate_space(this.tmp_ball.pos, m);
    // console.log("----------------------EXITED LOOP----------------------");
    // console.log("FINAL VELOCITY (already flipped):");
    // console.log(this.ball.velocity);
    // console.log("x: " + this.ball.velocity.x);
    // console.log("y: " + this.ball.velocity.y);
    // console.log("z: " + this.ball.velocity.z);
    // console.log("FINAL POSITION (already flipped):");
    // console.log(this.ball.pos);
  }

  private resetBall() {
    this.ball = {
      pos: {
        x: 0,
        y: 0,
        z: 0,
      },
      velocity: {
        x: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.5),
        y: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.5),
        z: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.5),
        // x: 0.2,
        // y: 0,
        // z: 0,
      },
      radius: this.ball.radius,
      reset: 1,
    };
    //console.log("Ball reset! Scores:", this.scores);
  }

  public getState() {
    return {
      ball: { ...this.ball },
      scores: { ...this.scores },
      paddles: { ...this.paddles },
      hitPoint: { ...this.hitPoint },
      hit: this.collision || this.ball.reset,
      //for each player, send an item of the other_paddles array
    };
  }
}
