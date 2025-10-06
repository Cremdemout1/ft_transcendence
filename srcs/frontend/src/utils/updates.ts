import * as BABYLON from "babylonjs";
import { GameMeshes } from "../scenes/main";
import { GameMath } from "../../../backend/src/game/pong/pong_logic";
import { print_score } from "./scorePrinting";

export function update_ball(meshes: GameMeshes, gameMath: GameMath) {
  if (!meshes.ball) return;
  meshes.ball.position.set(
    gameMath.getState().ball.pos.x, //getState() returns the updated postion of everything
    gameMath.getState().ball.pos.y, //updating the position of the ball with the returned values
    gameMath.getState().ball.pos.z
  );
}

export function update_reset(
  meshes: GameMeshes,
  gameMath: GameMath,
  trail: BABYLON.TrailMesh | null,
  reset: number,
  player_nbr: number
) {
  if (gameMath.getState().ball.reset) {
    print_score(gameMath.getState().scores, player_nbr, meshes.score_units!);
    //need to reset the trail before putting the ball back in the center
    if (trail) {
      trail.stop();
      console.log("RESET!");
      reset = 1;
    }
  } else if (reset) {
    if (trail) {
      trail.reset();
      trail.start();
      reset = 0;
    }
  }
  return reset;
}

export function update_paddles(meshes: GameMeshes, gameMath: GameMath) {
  meshes.paddles!.forEach((paddle, index) => {
    if (paddle.name == "paddle1" || paddle.name == "paddle5")
      paddle.position.z = gameMath.getState().paddles[index].x;
    else if (paddle.name == "paddle2" || paddle.name == "paddle6")
      paddle.position.z = -gameMath.getState().paddles[index].x;
    else if (paddle.name == "paddle3")
      paddle.position.x = -gameMath.getState().paddles[index].x;
    else paddle.position.x = gameMath.getState().paddles[index].x;

    if (
      paddle.name == "paddle1" ||
      paddle.name == "paddle2" ||
      paddle.name == "paddle3" ||
      paddle.name == "paddle4"
    )
      paddle.position.y = gameMath.getState().paddles[index].y;
    else if (paddle.name == "paddle5" || paddle.name == "paddle6")
      paddle.position.x = -gameMath.getState().paddles[index].y;
  });
}
