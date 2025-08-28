export class GameMath {
  private ball = {
    x: 0,
    y: 0,
    z: 0,
    velocity: { x: 0.02, y: 0.04, z: -0.01 },
    radius: 0.01,
  };
  private paddle = {
    x: 0,
    y: 0,
    height: 0.2,
    depth: 0.02,
    speed: 0.01,
    distance_from_face: 0.02,
  };
  private scores = {
    player1: 0,
    player2: 0,
    player3: 0,
    player4: 0,
    player5: 0,
    player6: 0,
  };
  private gameArea = { width: 1.8, height: 1.8, depth: 1.8 };

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
      this.paddleCollisions();
      this.wallCollisions(); //also checks score
      //this.checkScoring();
    }
  }

  private wallCollisions() {
    if (Math.abs(this.ball.x) >= this.gameArea.width / 2) {
      this.ball.velocity.x *= -1;
      // Clamp
      this.ball.x = Math.sign(this.ball.x) * (this.gameArea.width / 2 - 0.01);
      //if each of these players exist
      if (this.ball.x < 0) this.scores.player1++;
      else this.scores.player2++;
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
      this.gameArea.width / 2 - this.paddle.height
    ) {
      if (this.paddle.x > 0)
        this.paddle.x = this.gameArea.width / 2 - this.paddle.height;
      else this.paddle.x = -(this.gameArea.width / 2 - this.paddle.height);
    }
    if (
      Math.abs(this.paddle.y) >
      this.gameArea.width / 2 - this.paddle.height
    ) {
      if (this.paddle.y > 0)
        this.paddle.y = this.gameArea.width / 2 - this.paddle.height;
      else this.paddle.y = -(this.gameArea.width / 2 - this.paddle.height);
    }
  }

  private calculateDirection() {

	const offset = (this.ball.y - this.paddle.y) / (this.paddle.height / 2); 
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



      this.ball.velocity.x= (base.x * cos - base.y * sin)*0.01;
    this.ball.velocity.y= -(base.x * sin + base.y * cos)*0.01;
    this.ball.velocity.z= base.z;
	console.log(this.ball.velocity);

}

  private paddleCollisions() {
    //forEach paddle, if current paddle exists:
    const height = this.paddle.height + 0.15; //margin
    if (
      this.ball.x >=
        this.gameArea.width / 2 -
          this.paddle.depth -
          this.paddle.distance_from_face -
          this.ball.radius &&
      this.ball.y > this.paddle.y - height / 2 &&
      this.ball.y < this.paddle.y + height / 2 &&
      this.ball.z > -(this.paddle.x + height / 2) &&
      this.ball.z < -(this.paddle.x - height / 2)
    ) {
      //this.ball.velocity.x *= -1;
	  this.calculateDirection();
      console.log("collision with paddle1");
      // Clamp
      this.ball.x =
        Math.sign(this.ball.x) *
        (this.gameArea.width / 2 -
          this.paddle.depth -
          this.paddle.distance_from_face -
          this.ball.radius -
          0.001);
    }
     console.log("ball x: " + this.ball.x);
	 console.log("ball velo x: " + this.ball.velocity.x);
    //  console.log("ball z: " + this.ball.z);
	
    // console.log(
    //   "ball x: " +
    //     this.ball.x.toFixed(3) +
    //     ", ball y: " +
    //     this.ball.y.toFixed(3) +
    //     ", ball z: " +
    //     this.ball.z.toFixed(3)
    // );
    // console.log(
    //   "necessary x: " +
    //     (this.gameArea.width / 2 -
    //       this.paddle.depth -
    //       this.paddle.distance_from_face -
    //       this.ball.radius) +
    //     ", necessary y: between > " +
    //     (this.paddle.y - height / 2) +
    //     " and < " +
    //     (this.paddle.y + height / 2) +
    //     ", necessary z: between >" +
    //     -(this.paddle.x + height / 2) +
    //     " and <" +
    //     -(this.paddle.x - height / 2)
    // );

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
    //console.log("state returning:");
    return {
      ball: { ...this.ball },
      scores: { ...this.scores },
      paddle: { ...this.paddle },
    };
  }
}
