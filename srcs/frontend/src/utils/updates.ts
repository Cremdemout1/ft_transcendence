import * as BABYLON from "@babylonjs/core";
import { GameMeshes } from "../scenes/main";
import { GameMath } from "../../../game_server/src/game/pong/pong_logic";
import { print_score } from "./scorePrinting";

export function update_ball(meshes: GameMeshes, state: any) {
  if (!meshes.ball || !state) return;
  meshes.ball.position.set(
    state.ball.pos.x, //getState() returns the updated postion of everything
    state.ball.pos.y, //updating the position of the ball with the returned values
    state.ball.pos.z
  );
}

export function update_reset(
  meshes: GameMeshes,
  state: any,
  trail: BABYLON.TrailMesh | null,
  reset: number,
  player_nbr: number
) {
  if (state.ball.reset) {
	// console.log(state);
    print_score(state.paddles, player_nbr, meshes.score_units!);
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

export function update_paddles(meshes: GameMeshes, state: any) {
  meshes.paddles!.forEach((paddle, index) => {
    if (paddle.name == "paddle1" || paddle.name == "paddle5")
      paddle.position.z = state.paddles[index].x;
    else if (paddle.name == "paddle2" || paddle.name == "paddle6")
      paddle.position.z = -state.paddles[index].x;
    else if (paddle.name == "paddle4")
      paddle.position.x = -state.paddles[index].x;
    else paddle.position.x = state.paddles[index].x;

    if (
      paddle.name == "paddle1" ||
      paddle.name == "paddle2" ||
      paddle.name == "paddle3" ||
      paddle.name == "paddle4"
    )
      paddle.position.y = state.paddles[index].y;
    else if (paddle.name == "paddle5" || paddle.name == "paddle6")
      paddle.position.x = -state.paddles[index].y;
  });
}
