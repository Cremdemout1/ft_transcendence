import * as BABYLON from "@babylonjs/core";
import { GameMeshes } from "../scenes/main";

export function simmetrical_vec(size: number)
{
	return new BABYLON.Vector3(size, size, size);
}

export function createLight( //this function just creates a rectangular area light (right now none are being used in the scene)
  position: BABYLON.Vector3,
  rotation: BABYLON.Vector3,
  color: BABYLON.Color3,
  name: string,
  scene: BABYLON.Scene
) {
  const width = 100;
  const height = 100;
  const box = BABYLON.MeshBuilder.CreateBox("box" + name, {
	width,
	height,
	depth: 0.01,
  });
  const lightMaterial = new BABYLON.StandardMaterial("lightMaterial");
  lightMaterial.disableLighting = true;
  lightMaterial.emissiveColor = color;
  box.material = lightMaterial;
  box.position = position;
  box.lookAt(simmetrical_vec(0));

  const light = new BABYLON.RectAreaLight(
	"light" + name,
	new BABYLON.Vector3(0, 0, 0),
	width,
	height,
	scene
  );
  light.parent = box;
  light.specular = color;
  light.diffuse = color;
  light.intensity = 10;
  light.includeOnlyWithLayerMask = 0x20000000;
}

export function createTrail(ball: BABYLON.Mesh | undefined, scene: BABYLON.Scene, diameter: number) {
  //this function creates a trail such as the one on the ball
  let options = {
	diameter: diameter,
	length: 25,
	segments: 10,
	sections: 4,
	doNotTaper: false,
	autoStart: true,
  };

  if (ball) {
	const trail = new BABYLON.TrailMesh("trail", ball, scene, options);
	trail.layerMask = 0x10000000;
	let sourceMat = new BABYLON.StandardMaterial("sourceMat", scene);
	let color = new BABYLON.Color3(244, 0, 255);
	sourceMat.emissiveColor = sourceMat.diffuseColor = color;
	sourceMat.specularColor = BABYLON.Color3.Black();
	trail.material = sourceMat;
	trail.start();
	return trail;
  }
  return null;
}

export function sign_flicker(gl: BABYLON.GlowLayer, scoremat: BABYLON.PBRMaterial) {
  //helper function to make the light on the score sign flicker
  const t = performance.now() * 0.003;
  const base = 0.3;
  const flicker = base + 0.3 * Math.sin(t * 20) + Math.random() * 0.1;
  gl.intensity = flicker;
  scoremat.emissiveIntensity = flicker * 20 + 50;
}

export function glow_score_digits(scene: BABYLON.Scene, meshes: GameMeshes)
{
			const countergl = new BABYLON.GlowLayer("counter glow", scene); //counter sign glow w/ different settings
		countergl.customEmissiveColorSelector = function (
		  mesh,
		  subMesh,
		  material,
		  result
		) {
		  if (mesh.isVisible == true && mesh.material!.name.includes("turned on"))
			result.set(1, 0.1, 0, 1);
		  else
			result.set(0, 0, 0, 0);
		};
		countergl.intensity = 0.1;
		countergl.blurKernelSize = 64;
		const countermat = scene.getMaterialByName(
		  "turned on"
		) as BABYLON.PBRMaterial;
		countermat.emissiveIntensity = 20;
		const emi = countermat.emissiveIntensity;
		countermat.emissiveColor = new BABYLON.Color3(1, 0, 0);
}

export function glow_score_title(scene: BABYLON.Scene, meshes: GameMeshes, scoremat: BABYLON.PBRMaterial)
{
	  const scoregl = new BABYLON.GlowLayer("score glow", scene); //score sign glow w/ different settings
  scoregl.customEmissiveColorSelector = function (
    mesh,
    subMesh,
    material,
    result
  ) {
    if (mesh.name === "score") {
      result.set(1, 0.1, 0, 1);
    } else {
      result.set(0, 0, 0, 0);
    }
  };
  scoregl.intensity = 1.2;
  scoregl.blurKernelSize = 128;
  scoremat.emissiveIntensity = 20;
  const em = scoremat.emissiveIntensity;
  scoremat.emissiveColor = new BABYLON.Color3(1, 0.005, 0);
  return scoregl;
}

export function save_materials(scene: BABYLON.Scene, mesh: BABYLON.Mesh, mat: BABYLON.PBRMaterial, player_id: number)
{
		if (!mat) return;
		if (mat.name.toLowerCase().includes("foggy")) {
		  //trying to make the paddle glass material look translucid but still have a solid color and be a bit foggy/rough

		  mat.backFaceCulling = false;
		  mat.alpha = 0.5;
		  mat.transparencyMode = 2;
		  mat.metallic = 0;
		  mat.indexOfRefraction = 1.5;
		}
		if(mesh.name.includes("paddle") && !mesh.name.includes("paddle"+player_id))
			mat.alpha = 0.75;
		if (mat.name.toLowerCase().includes("border")) {
		  //borders of the paddles have a different, less transparent material for better visibility
		  mat.alpha = 0.9;
		  mat.metallic = 0.9;
		}
		if (mat.name.toLowerCase().includes("arena")) {
		  //arena glass configuration to make it look decent god somebody shoot me please
		  mat.backFaceCulling = false;
		  mat.albedoColor = mat.albedoColor.clone();
		  mat.alpha = 0.2;
		  mat.transparencyMode = 2;
		  mat.metallic = 0;
		  mat.roughness = 1;
		  mat.indexOfRefraction = 1.5;
		  mat.clearCoat.isEnabled = true;
		  mat.clearCoat.roughness = 0;
		  mat.clearCoat.indexOfRefraction = 2;
		  mat.specularIntensity = 0;
		  mat.subSurface.isRefractionEnabled = true;
		  mat.subSurface.refractionIntensity = 1.0;
		  mat.subSurface.indexOfRefraction = 1.5;
		  mat.subSurface.tintColor = new BABYLON.Color3(1, 1, 1);
		  mat.subSurface.minimumThickness = 0.1;
		  mat.subSurface.maximumThickness = 0.5;
		  mat.environmentBRDFTexture = scene.environmentTexture;
		  mat.subSurface.useMaskFromThicknessTexture = true;
		  mat.forceIrradianceInFragment = true;
		}
}