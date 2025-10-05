import * as BABYLON from "babylonjs";

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