import * as BABYLON from "babylonjs";

export type stick = {
  player: number;
  unit: number; //0 or 1
  type: string; //on or off
  name: string;
  mesh: BABYLON.Mesh;
};

export function should_print(numbers: number[], stick: stick): boolean {
  for (const n in numbers) {
	if (stick.name.includes("00" + numbers[n])) return true;
  }
  return false;
}

export function print_number(
  unit: number,
  digit: number,
  player: number,
  units: stick[]
) {
  let to_print: number[];
  switch (digit) {
	case 0:
	  to_print = [0, 1, 2, 3, 5, 6];
	  break;
	case 1:
	  to_print = [0, 3];
	  break;
	case 2:
	  to_print = [0, 1, 4, 5, 6];
	  break;
	case 3:
	  to_print = [0, 1, 4, 3, 6];
	  break;
	case 4:
	  to_print = [0, 2, 3, 4];
	  break;
	case 5:
	  to_print = [1, 2, 3, 4, 6];
	  break;
	case 6:
	  to_print = [1, 2, 3, 4, 5, 6];
	  break;
	case 7:
	  to_print = [0, 1, 3];
	  break;
	case 8:
	  to_print = [0, 1, 2, 3, 4, 5, 6];
	  break;
	case 9:
	  to_print = [0, 1, 2, 3, 4, 6];
	  break;
	default:
	  to_print = [];
	  break;
  }
  units.forEach((stick) => {
	if (stick.player == player && stick.unit == unit) {
	  if (stick.type == "on") {
		if (should_print(to_print, stick)) stick.mesh.isVisible = true;
		else stick.mesh.isVisible = false;
	  } else if (stick.type == "off") {
		if (should_print(to_print, stick)) stick.mesh.isVisible = false;
		else stick.mesh.isVisible = true;
	  }
	}
  });
}

export function print_score(scores: any, player_nbr: number, units: stick[]) {
  for (let i = 0; i < player_nbr; i++) {
	let score = scores["player" + (i + 1)];
	if (score > 9) print_number(0, Math.floor(score / 10), i, units);
	print_number(1, Math.floor(score % 10), i, units);
  }
}