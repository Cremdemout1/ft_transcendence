type Paddle2D = {
  x: number;
  y: number;
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
    velocity: { x: 2, y: 4, z: -1 },
    radius: 3,
  };
  private tmp_ball = {
    x: 0,
    y: 0,
    z: 0,
    velocity: { x: 0, y: 0, z: 0 },
    radius: 3,
  };
  private paddle = {
    x: 0,
    y: 0,
    height: 20,
    depth: 2,
    speed: 1,
    distance_from_face: 0,
  };

  private other_paddles: Paddle2D[] = Array.from({ length: 5 }, () => ({
    x: 0,
    y: 0,
  }));

  private scores = {
    player1: 0,
    player2: 0,
    player3: 0,
    player4: 0,
    player5: 0,
    player6: 0,
  };
  private gameArea = { width: 100, height: 100, depth: 100 };

  public update(
    up: number,
    down: number,
    left: number,
    right: number,
    reset: number
  ) {
    if (reset) this.resetBall();
    else {
      this.ball.x += this.ball.velocity.x;
      this.ball.y += this.ball.velocity.y;
      this.ball.z += this.ball.velocity.z;
      this.movePaddle(up, down, left, right); //the input needs to be assigned to a player id (on the game server?) which will then decide which paddle is moved, do movePaddle for each player
      this.paddleCollisionManager();
      this.wallCollisions(); //also checks score
      this.fetchOtherPaddlePos();
      //console.log(this.ball.velocity)
      //this.checkScoring();
    }
  }

  private fetchOtherPaddlePos() {
    return this.other_paddles;
    //here you need to send the final position of this paddle to the other players through the API, and then receive the other paddles positions
    //forEach(player that exists) => other_paddles[player].x = whatever, other_paddles[player].y = whatever
    //this information will then need to be translated by me into the correct axes, and the values flipped or not depending on what paddle it is, but that will be done in the client after the information is delivered
  }

  private wallCollisions() {
    if (Math.abs(this.ball.x) >= this.gameArea.width / 2-this.ball.radius) {
      this.ball.velocity.x *= -1;
      // Clamp
      this.ball.x = Math.sign(this.ball.x) * (this.gameArea.width / 2 -this.ball.radius- 0.01);
      //if each of these players exist
      if (this.ball.x < 0) this.scores.player1++;
      else this.scores.player2++;
      this.resetBall();
    }

    if (Math.abs(this.ball.y) >= this.gameArea.height / 2-this.ball.radius) {
      this.ball.velocity.y *= -1;
      this.ball.y = Math.sign(this.ball.y) * (this.gameArea.height / 2 -this.ball.radius- 0.01);
    }

    if (Math.abs(this.ball.z) >= this.gameArea.depth / 2) {
      this.ball.velocity.z *= -1;
      this.ball.z = Math.sign(this.ball.z) * (this.gameArea.depth / 2 -this.ball.radius- 0.01);
    }
    //console.log("wall collisions done!");
  }

  movePaddle(up: number, down: number, left: number, right: number) {
    let moveAmount = this.paddle.speed;

    let horizontal = 0;
    let vertical = 0;

    if (up) vertical++;
    if (down) vertical--;
    if (left) horizontal--;
    if (right) horizontal++;

    moveAmount = horizontal < 0 ? -moveAmount : moveAmount; //i might be getting this wrong xD ------- IMPORTANT THE AXIS AND THE WAY OF THE MOVEMENT WILL CHANGE DEPENDING ON THE PLAYER
    if (horizontal != 0) this.paddle.x += moveAmount;
    moveAmount = this.paddle.speed;
    moveAmount = vertical < 0 ? -moveAmount : moveAmount;
    if (vertical != 0) this.paddle.y += moveAmount;

    if (
      Math.abs(this.paddle.x) >
      this.gameArea.width / 2 - this.paddle.height / 2
    ) {
      if (this.paddle.x > 0)
        this.paddle.x = this.gameArea.width / 2 - this.paddle.height / 2;
      else this.paddle.x = -(this.gameArea.width / 2 - this.paddle.height / 2);
    }
    if (
      Math.abs(this.paddle.y) >
      this.gameArea.width / 2 - this.paddle.height / 2
    ) {
      if (this.paddle.y > 0)
        this.paddle.y = this.gameArea.width / 2 - this.paddle.height / 2;
      else this.paddle.y = -(this.gameArea.width / 2 - this.paddle.height / 2);
    }
  }

  private dot_product(x: number, y: number, z: number) {// SQUARE ROOT of dot product of the SAME VECTOR (get magnitude)
    return Math.sqrt(x * x + y * y + z * z);
  }

  private normalize(_x: number, _y: number, _z: number, vel: number) {
    const res: Vec3 = { x: _x / vel, y: _y / vel, z: _z / vel };
    return res;
  }

  private calculateDirection() {
    console.log("velocity before: " + this.tmp_ball.velocity.x + " " + this.tmp_ball.velocity.y + " " + this.tmp_ball.velocity.z);
    const offset = (this.tmp_ball.y - this.paddle.y) / (this.paddle.height / 2);
    const maxAngle = (75 * Math.PI) / 180;
    const deflection = offset * maxAngle;

    console.log("ball y: " + this.tmp_ball.y);
    console.log("paddle y: " + this.paddle.y);
    console.log("diff: " + (this.tmp_ball.y - this.paddle.y));
    console.log(this.paddle.height / 2);
    console.log("offset: " + offset);
    console.log("final angle: " + (180 / Math.PI) * deflection);

    // const base: Vec3 = { x: 0, y: 0, z: -1 };

    // const cos = Math.cos(deflection);
    // const sin = Math.sin(deflection);

    // this.tmp_ball.velocity.x = base.x;
    // this.tmp_ball.velocity.z = base.z * cos - base.y * sin;
    // this.tmp_ball.velocity.y = base.z * sin + base.y * cos;

    const offsetX =
      (this.tmp_ball.x - this.paddle.x) / (this.paddle.height / 2);
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
    console.log(this.paddle.x);
    console.log(this.paddle.height / 2);
    console.log(offsetX);
    console.log("final x angle: " + (180 / Math.PI) * deflectionX);

    console.log(this.tmp_ball.velocity);
  }

  private paddleCollisions() {
    //the "default" paddle is on the xy plane, perpendicular to the z axis. Looking from the outside, positive y is up, positive x is right and NEGATIVE z is front (incoming ball has a positive Z velocity)
    const height = this.paddle.height + 0.15; //margin
    if (
      this.tmp_ball.z >=
        this.gameArea.width / 2 -
          this.paddle.depth -
          this.paddle.distance_from_face -
          this.ball.radius &&
      this.tmp_ball.y > this.paddle.y - height / 2 &&
      this.tmp_ball.y < this.paddle.y + height / 2 &&
      this.tmp_ball.x < this.paddle.x + height / 2 &&
      this.tmp_ball.x > this.paddle.x - height / 2 &&
      this.tmp_ball.velocity.z > 0
    ) {
      console.log(this.ball.velocity);
      console.log("tmp x= " + this.tmp_ball.x);
      console.log("tmp y= " + this.tmp_ball.y);
      console.log("tmp z= " + this.tmp_ball.z);
      console.log("paddle x= " + this.paddle.x);
      console.log("paddle y= " + this.paddle.y);
      console.log(
        "rightmost bound (x needs to be less than):" +
          (this.paddle.x + height / 2)
      );
      console.log(
        "leftmost bound (x needs to be greater than):" +
          (this.paddle.x - height / 2)
      );
      //this.tmp_ball.velocity.z *= -1;
      this.calculateDirection();
      console.log("collision with paddle1");
      // Clamp
      this.tmp_ball.z =
        Math.sign(this.tmp_ball.z) *
        (this.gameArea.width / 2 -
          this.paddle.depth -
          this.paddle.distance_from_face -
          this.ball.radius -
          0.01);

      return 1;
    }
	//else if (check side collisions still)
    return 0;
  }

  private paddleCollisionManager() {
    //if paddle=paddle1 flip axes and values like this, etc etc, i can make a proper flipping function later that just copies and then rotates the vector by multiplying the matrixes
    this.tmp_ball.velocity.x = -this.ball.velocity.z;
    this.tmp_ball.velocity.y = this.ball.velocity.y;
    this.tmp_ball.velocity.z = this.ball.velocity.x;
    this.tmp_ball.x = -this.ball.z;
    this.tmp_ball.y = this.ball.y;
    this.tmp_ball.z = this.ball.x;
    if (this.paddleCollisions()) {
      this.ball.velocity.x = this.tmp_ball.velocity.z;
      this.ball.velocity.y = this.tmp_ball.velocity.y;
      this.ball.velocity.z = -this.tmp_ball.velocity.x;
      this.ball.x = this.tmp_ball.z;
      this.ball.y = this.tmp_ball.y;
      this.ball.z = -this.tmp_ball.x;
      console.log(this.ball.velocity);
    }
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
    };
    //console.log("Ball reset! Scores:", this.scores);
  }

  public getState() {
    //console.log("state returning:");
    return {
      ball: { ...this.ball },
      scores: { ...this.scores },
      paddle: { ...this.paddle },
      //for each player, send an item of the other_paddles array
    };
  }
}
