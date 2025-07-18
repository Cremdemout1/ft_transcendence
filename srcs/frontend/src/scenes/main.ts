import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, Mesh, Color4, Color3, SceneLoader, RectAreaLight, AxesViewer, StandardMaterial } from "@babylonjs/core";
import { Game } from "../game";
import arenaModel from '@/assets/models/arena.glb';


function createLight(position: Vector3, rotation: Vector3, color:Color3, name: string, scene: Scene){

	const width=10;
	const height=10;
    const box = MeshBuilder.CreateBox("box" + name, {width: width, height: height, depth: 0.01});
    const lightMaterial = new StandardMaterial("lightMaterial");
    lightMaterial.disableLighting = true;
    lightMaterial.emissiveColor = color;
    box.material =  lightMaterial;

    box.position = position
    box.rotation = rotation;

    var light = new RectAreaLight("light" + name, new Vector3(0, 0, 0), width, height, scene);
    light.parent = box;
    light.specular = color;
    light.diffuse = color;

    light.intensity = 1;
}

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement): Promise<Scene> {
    
	const scene = new Scene(engine);
    
    const camera: ArcRotateCamera = new ArcRotateCamera(
      "Camera",
      Math.PI / 2,
      Math.PI / 2,
      2,
      Vector3.Zero(),
      scene
    );

	
    camera.attachControl(canvas, true);

    const light: HemisphericLight = new HemisphericLight(
      "light1",
      new Vector3(-1, 1, 0),
      scene
    );
	light.diffuse = new Color3(0.71, 0.56, 1);
	light.specular = new Color3(1, 0.64, 0.93);
	light.groundColor = new Color3(0.2, 0.23, 0.47);

	createLight(new Vector3(5, 6, -2), new Vector3(5.976007358828584, 1.5969762655748114), Color3.White(), "light1" ,scene);
    createLight(new Vector3(-7, 7, 15), new Vector3(5.681046715241543, 0, 0), Color3.Red(), "light2",scene);
    createLight(new Vector3(-15, 5, -2), new Vector3(5.681046715241543, -1.5969762655748114, 0), Color3.Green(), "light3",scene);

	const standardMaterial = new StandardMaterial("StandardMaterial", scene);
	const ground = MeshBuilder.CreateGround("ground", {width: 120, height: 120}, scene);
	ground.position.y-=5;
	standardMaterial.roughness = 0.25;
	standardMaterial.diffuseColor = Color3.Black();
    ground.material = standardMaterial;


    // const sphere: Mesh = MeshBuilder.CreateSphere(
    //   "sphere",
    //   { diameter: 1 },
    //   scene
    // );

	try {
        const result = await SceneLoader.ImportMeshAsync(
            "",
            "",
            arenaModel,
            scene
        );
        
        const box = result.meshes[0];

        console.log("Model loaded:", box.name);

		box.scaling.x+=2;
		box.scaling.y+=2;
		box.scaling.z-=2;
		box.position.z+=3;
		box.position.x-=5;
		camera.setTarget(box.position);

    } catch (error) {
        console.error("Failed to load model:", error);
        throw error;
    }



	scene.clearColor = new Color4(0.1, 0.1, 0.1, 1);
	await scene.whenReadyAsync();

    return scene;
}