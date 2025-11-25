import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import "@babylonjs/inspector";
import {
  Engine,
  Scene
} from "@babylonjs/core";
import  {createGameScene } from "./scenes/main";
import { GameMath } from "../../game_server/src/game/pong/pong_logic";

enum State {
  START = 0,
  GAME = 1,
  LOSE = 2,
  CUTSCENE = 3,
}

export async function initBabylon() {
  const canvas = document.getElementById("pongCanvas") as HTMLCanvasElement;
  if (!canvas) {
    console.error("Canvas not found!");
    return;
  }

  const engine= new BABYLON.Engine(canvas);
  //waitroom, pessoasàespera++, quando pessoasàespera = minimo de jogadores, game class (backend) é criado
  //api request: chegou um gajo, muda a variavel de pae
  //const game = new babylonGame(canvas, engine);
  const game = new Game(canvas, engine);//tirar
  //receive state and other stuff
  game.changeState(State.GAME);
  window.addEventListener("resize", () => engine.resize());
  canvas.addEventListener('wheel', evt => evt.preventDefault(), { passive: false });
  window.addEventListener('keydown', (event) => {
    const active = document.activeElement as HTMLElement | null;
    const isTyping = !!active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
    if(event.key === ' ' && !isTyping) {
      event.preventDefault();
    }
  });
}

// export class Game {

//   private _scene: Scene;
//   private _canvas: HTMLCanvasElement;
//   private _engine: Engine;

//   constructor(canvas: HTMLCanvasElement, engine: Engine) {

//     this._canvas = canvas;
//     this._engine = engine;
//     this._scene = new Scene(this._engine);
//   }

//   private async createSceneForState(): Promise<Scene> {
//     switch (this._currentState) {
//       case State.START:
//         //return await createStartScene(this._engine);
//       case State.GAME:
//         return await createGameScene(this._engine, this._canvas);
//       case State.LOSE:
//         //return await createLoseScene(this._engine);
//       case State.CUTSCENE:
//         //return await createCutsceneScene(this._engine);
//       default:
//         throw new Error(`Unknown state: ${this._currentState}`);
//     }
//   }
// }

export class Game {

  private _id: number;
  private _scene: Scene;
  private _canvas: HTMLCanvasElement;
  private _engine: Engine;
  private _currentState: State;

  constructor(canvas: HTMLCanvasElement, engine: Engine) {
	this._id=0;//generate uuid
    this._canvas = canvas;
    this._currentState = State.START;
    this._engine = engine;
    this._scene = new Scene(this._engine);
  }

  public async changeState(newState: State): Promise<void> {
    if (this._scene) {
      this._scene.dispose();
    }

    this._currentState = newState;
    this._scene = await this.createSceneForState();

	this._engine.runRenderLoop(() => {
    this._scene.render();
    });
  }

  private async createSceneForState(): Promise<Scene> {
    switch (this._currentState) {
      case State.START:
        //return await createStartScene(this._engine);
      case State.GAME:
		const gameMath = new GameMath();
        return await createGameScene(this._engine, this._canvas, gameMath);
      case State.LOSE:
        //return await createLoseScene(this._engine);
      case State.CUTSCENE:
        //return await createCutsceneScene(this._engine);
      default:
        throw new Error(`Unknown state: ${this._currentState}`);
    }
  }
}

























// const createScene = (engine: BABYLON.Engine) => {
//   const scene = new BABYLON.Scene(engine);

//   // scene.createDefaultCameraOrLight(true, false, true);
//   scene.createDefaultLight();
//   scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.1, 1);

//   //const camera= new BABYLON.UniversalCamera('camera', new BABYLON.Vector3(0,5, -10), scene);
//   const camera = new BABYLON.ArcRotateCamera(
//     "camera",
//     0,
//     0,
//     3,
//     new BABYLON.Vector3(0, 0, 0),
//     scene
//   );
//   camera.attachControl(true);
//   camera.inputs.addMouseWheel();
//   camera.setTarget(BABYLON.Vector3.Zero());
//   camera.setPosition(new BABYLON.Vector3(0, 0, -20));
//   camera.lowerBetaLimit = Math.PI / 4;
//   camera.upperBetaLimit = Math.PI / 2;
//   camera.lowerRadiusLimit = 5;

//   scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
//   scene.fogStart = 10;
//   scene.fogEnd = 60;

//   // 	const box= BABYLON.MeshBuilder.CreateBox("box", {
//   // 		size: 0.3,
//   // 		width:2,
//   // 		height:0.5,
//   // 		faceColors:[
//   // 			new BABYLON.Color4(1,0,0,1),
//   // 			new BABYLON.Color4(1,1,0)
//   // 		]
//   // 	});

//   // 	const testmaterial= new BABYLON.StandardMaterial('material');
//   //   box.material=testmaterial;
//   //   testmaterial.diffuseColor=new BABYLON.Color3(0,1,0);
//   // 	testmaterial.ambientColor=new BABYLON.Color3(0,1,1);
//   // 	scene.ambientColor=new BABYLON.Color3(0,1,0.5);

//   // 	const util= new BABYLON.UtilityLayerRenderer(scene);
//   // 	const gizmo= new BABYLON.PositionGizmo(util);
//   // 	gizmo.attachedMesh=box;

//   // const ground= BABYLON.MeshBuilder.CreateGround("ground", {
//   // 	height:10,
//   // 	width: 10
//   // });
//   // const sphere= BABYLON.MeshBuilder.CreateSphere("sphere", {
//   // 	segments: 5
//   // }, scene);

//   // const light= new BABYLON.PointLight(
//   // 	'light',
//   // 	new BABYLON.Vector3(0,4,0),
//   // 	scene
//   // );
//   // const lightgiz=new BABYLON.LightGizmo(util);
//   // lightgiz.light=light;
//   // light.intensity=50;

//   // scene.onPointerDown= function castRay() {
//   // 	const hit=scene.pick(scene.pointerX, scene.pointerY);
//   // 	if(hit.pickedMesh && hit.pickedMesh.name==='box')
//   // 	{
//   // 			const clickm= new BABYLON.StandardMaterial('material');
//   // 			hit.pickedMesh.material=clickm;
//   // 			clickm.diffuseColor=new BABYLON.Color3(0,1,0);
//   // 	}
//   // }

//   scene.registerBeforeRender(function () {
//     // box.rotation.x+=0.01;
//     // box.rotation.y+=0.02;
//     // box.rotation.z+=0.03;
//   });

//   return scene;
// };
