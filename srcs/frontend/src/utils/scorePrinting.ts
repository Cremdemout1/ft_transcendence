import * as BABYLON from "@babylonjs/core";
import { GameMeshes } from "../scenes/main";
import score_unit from "@/assets/models/score_unit.glb"; //score digit
import counter from "@/assets/models/digital_clock_new.glb"; //score counter
import pfp from "../../assets/tex/profile_pic.jpg";
import { glow_score_digits } from "./babylonUtils";
import { GameMath } from "../../../game_server/src/game/pong/pong_logic";

export type stick = {
  player: number;
  unit: number; //0 or 1
  type: string; //on or off
  name: string;
  mesh: BABYLON.Mesh;
};

export async function score_units(player_nbr:number, scene: BABYLON.Scene, meshes: GameMeshes) {
	try{
	const scoreunit = await BABYLON.SceneLoader.ImportMeshAsync(
	  "",
	  "",
	  score_unit,
	  scene
	); //importing score unit
	const unitRoot = scoreunit.meshes[0]; //root
	scoreunit.meshes.forEach((mesh) => {
	  if (!mesh.name.includes("root")) return;
	  for (let j = 0; j < 2; j++) {
		for (let i = 0; i < player_nbr; i++) {
		  const name = "player" + i + "_unit" + j + "_" + mesh.name;
		  const par =
			i < 3 ? meshes.score_counter![0] : meshes.score_counter![1];
		  const unit = mesh.clone(name, par) as BABYLON.Mesh;
		  unit.position.x = -20;
		  unit.position.z = j == 0 ? -38 * (i % 3) : -38 * (i % 3) - 15;//change order
		  unit.position.z += 45;
		  unit.position.y = 4;
		  unit.getChildMeshes().forEach((element) => {
			let onoff = element.name.includes("on") ? "on" : "off";
			let curr_stick: stick = {
			  player: i,
			  unit: j,
			  type: onoff,
			  name: element.name,
			  mesh: element as BABYLON.Mesh,
			};
			if (onoff == "on") element.isVisible = false;
			meshes.score_units?.push(curr_stick);
		  });
		}
	  }
	});
	unitRoot.getChildMeshes().forEach((element) => {
	  element.isVisible = false;
	});
	glow_score_digits(scene, meshes);
  } catch (error) {
	console.error("Failed to load score unit models:", error);
	throw error;
  }
}

export async function score_counter(player_nbr:number, scene: BABYLON.Scene, meshes: GameMeshes, player_id: number) {
	try{
	const score_counter = await BABYLON.SceneLoader.ImportMeshAsync(
	  "",
	  "",
	  counter,
	  scene
	); //importing score counter
	// const anims=score_counter.animationGroups;
	// let animation = [];
	// anims.forEach(item => {if(item.name.includes("lift")){
	// 	item.play(true);
	// }
	// });

	// console.log(anims);
	const counterRoot = score_counter.meshes[0]; //root
	if (counterRoot) {
	  meshes.score_counter?.push(counterRoot as BABYLON.Mesh);
	  counterRoot.scaling.addInPlace(new BABYLON.Vector3(10, 10, -10));
	  counterRoot.position.addInPlace(new BABYLON.Vector3(1600, 100, 1500));
	  counterRoot.rotation = new BABYLON.Vector3(0, (Math.PI / 4) * 3, 0);
	  meshes.score_counter?.push(meshes.score_counter![0].clone("second", null));
	  meshes.score_counter![1].position.z = -1500;
	  meshes.score_counter![1].rotation = new BABYLON.Vector3(
		0,
		(Math.PI / 4) * 5,
		0
	  );
	  meshes.score_counter![1].getChildMeshes().forEach((mesh) => {
		if (mesh.name.includes("second.stick.flag.flag_primitive0")) {
		  const flagmat = new BABYLON.StandardMaterial("flagmat");
		  const tex = new BABYLON.Texture(pfp, scene);
		  tex.uScale = 3.2;
		  tex.vScale = 3.2;
		  tex.wAng = Math.PI / 2;
		  tex.uOffset = 0.5;
		  tex.vOffset = 0.04;
		  flagmat.diffuseTexture = tex;
		  flagmat.emissiveTexture = tex;
		  mesh.material = flagmat;
		}
		if (mesh.name.includes("second.stick.flag.flag_primitive2")) {
		  const id_color = new BABYLON.StandardMaterial("id_color");
		  id_color.emissiveColor = BABYLON.Color3.Blue();
		  mesh.material = id_color;
		}
	  });
	}} catch (error) {
	console.error("Failed to load score counter models:", error);
	throw error;
  }
  score_units(player_nbr, scene, meshes);
}

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

export function print_score(paddles: any, player_nbr: number, units: stick[]) {
  for (let i = 0; i < player_nbr; i++) {
	let score = paddles[i].score;
	if (score > 9) print_number(0, Math.floor(score / 10), i, units);
	print_number(1, Math.floor(score % 10), i, units);
  }
}

export function print_score_final(player_nbr: number, units: stick[]) {
  for (let i = 0; i < player_nbr; i++) {
	let score = 0;
	if (score > 9) print_number(0, Math.floor(score / 10), i, units);
	print_number(1, Math.floor(score % 10), i, units);
  }
}