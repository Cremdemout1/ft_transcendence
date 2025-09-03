import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  MeshBuilder,
  Material,
  Color4,
  SceneLoader,
  RectAreaLight,
  StandardMaterial,
  PBRMaterial,
  SceneOptimizer,
  Color3,
  Mesh,
  Texture,
  CubeTexture,
  RenderTargetTexture,
  HDRCubeTexture,
  GlowLayer,
  DebugLayer,
  DebugBlock,
  AxesViewer,
  Camera,
  ActionManager,
  ExecuteCodeAction,
  KeyboardEventTypes
} from "@babylonjs/core";
import arenaModel from "@/assets/models/transcendence_curve.glb";
import city from "@/assets/models/mid_city.glb";
import { simmetrical_vec } from "../babylonUtils";
import { GameMath } from "../../../backend/src/game/pong/pong_logic";
import { io } from "socket.io-client";
// Connect to backend game server
const socket = io("http://localhost:8081");
let playerId = "";
socket.on("playerId", (data: { playerId: string }) => {
  playerId = data.playerId;
});
// Play options menu (centered, only appears after Play is pressed in dashboard)
const playOptionsMenuDiv = document.createElement('div');
playOptionsMenuDiv.id = 'play-options-menu';
playOptionsMenuDiv.style.position = 'absolute';
playOptionsMenuDiv.style.top = '50%';
playOptionsMenuDiv.style.left = '50%';
playOptionsMenuDiv.style.transform = 'translate(-50%, -50%)';
playOptionsMenuDiv.style.background = 'rgba(0,0,0,0.8)';
playOptionsMenuDiv.style.color = 'white';
playOptionsMenuDiv.style.padding = '2em';
playOptionsMenuDiv.style.borderRadius = '1em';
playOptionsMenuDiv.style.textAlign = 'center';
playOptionsMenuDiv.style.zIndex = '1000';
playOptionsMenuDiv.style.display = 'none';
document.body.appendChild(playOptionsMenuDiv);

let lastMenuOptions: string[] = [];

function showPlayOptions(options?: string[]) {
  playOptionsMenuDiv.innerHTML = '<h2>Choose Mode</h2>';
  const opts = (options && options.length ? options : lastMenuOptions.length ? lastMenuOptions : ['singleplayer', 'multiplayer', 'options']);
  const menuOptions = [...opts, 'Back'];
  menuOptions.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
    btn.style.margin = '1em';
    btn.onclick = () => {
      if (opt === 'Back') {
        playOptionsMenuDiv.style.display = 'none';
        return;
      }
      socket.emit('menuSelect', opt.toLowerCase());
      playOptionsMenuDiv.style.display = 'none';
      if (opt.toLowerCase() === 'multiplayer') {
        waitingDiv.style.display = 'block';
      }

    };
    playOptionsMenuDiv.appendChild(btn);
  });
  playOptionsMenuDiv.style.display = 'block';
}

// Waiting for players menu
const waitingDiv = document.createElement('div');
waitingDiv.id = 'waiting-menu';
waitingDiv.style.position = 'absolute';
waitingDiv.style.top = '50%';
waitingDiv.style.left = '50%';
waitingDiv.style.transform = 'translate(-50%, -50%)';
waitingDiv.style.background = 'rgba(0,0,0,0.8)';
waitingDiv.style.color = 'white';
waitingDiv.style.padding = '2em';
waitingDiv.style.borderRadius = '1em';
waitingDiv.style.textAlign = 'center';
waitingDiv.style.zIndex = '1000';
waitingDiv.style.display = 'none';
document.body.appendChild(waitingDiv);

function showWaiting(message: string) {
  waitingDiv.innerHTML = `<h2>${message}</h2>`;
  waitingDiv.style.display = 'block';
}


function attachPlayBtnListener() {
  const playBtnDashboard = document.getElementById('playBtn');
  if (playBtnDashboard && !playBtnDashboard.hasAttribute('data-listener')) {
    playBtnDashboard.addEventListener('click', () => {
      socket.emit('requestMenu');
    });
    playBtnDashboard.setAttribute('data-listener', 'true');
  }
}
window.addEventListener('hashchange', attachPlayBtnListener);
window.addEventListener('DOMContentLoaded', attachPlayBtnListener);

// Socket event handlers
socket.on('menu', (data: { options: string[] }) => {
  lastMenuOptions = data.options || ['singleplayer', 'multiplayer', 'options'];
  showPlayOptions(data.options);
});

socket.on('waiting', (data: { message: string }) => {
  showWaiting(data.message);
  // Optionally, you could add a spinner or animation here
});

socket.on('gameStart', (data: { roomId: string }) => {
  waitingDiv.style.display = 'none';
  playOptionsMenuDiv.style.display = 'none';
    // Start the game scene for multiplayer
    if (typeof window.renderPong === 'function') {
      window.renderPong(data.roomId);
    } else {
      // fallback: reload or call game init
      if (typeof window.startMultiplayerGame === 'function') {
        window.startMultiplayerGame(data.roomId);
      }
    }
});
// Attach a global function to window to start the game scene
(window as any).renderPong = function(roomId: string) {
  // You may want to pass roomId to the game logic if needed
  import('../game').then(mod => {
    if (mod && typeof mod.initBabylon === 'function') {
      mod.initBabylon();
    }
  });
};

function createLight(
  position: Vector3,
  rotation: Vector3,
  color: Color3,
  name: string,
  scene: Scene
) {
  const width = 30;
  const height = 30;
  const box = MeshBuilder.CreateBox("box" + name, {
    width,
    height,
    depth: 0.01,
  });
  const lightMaterial = new StandardMaterial("lightMaterial");
  lightMaterial.disableLighting = true;
  lightMaterial.emissiveColor = color;
  box.material = lightMaterial;
  box.position = position;
  box.rotation = rotation;

  const light = new RectAreaLight(
    "light" + name,
    new Vector3(0, 0, 0),
    width,
    height,
    scene
  );
  light.parent = box;
  light.specular = color;
  light.diffuse = color;
  light.intensity = 10;
}

export async function createGameScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  gameMath: GameMath,
  firstTime: number
): Promise<Scene> {
  const scene = new Scene(engine);

  scene.createDefaultEnvironment({
    groundOpacity: 0,
    createSkybox: false,
  });

  const camera = new ArcRotateCamera(
    "Camera",
    Math.PI / 2,
    Math.PI / 2,
    2,
    Vector3.Zero(),
    scene
  );
  camera.lowerRadiusLimit = 200;
  camera.upperRadiusLimit = 500;
  camera.attachControl(canvas, true);
  //camera.mode = Camera.ORTHOGRAPHIC_CAMERA;

//   const light = new HemisphericLight("light1", new Vector3(-1, 1, 0), scene);
//   light.diffuse = new Color3(0.71, 0.56, 1);
//   light.specular = new Color3(1, 0.64, 0.93);
//   light.groundColor = new Color3(0.2, 0.23, 0.47);

  createLight(
    new Vector3(300, 240, -100),
    new Vector3(5.976, 1.596),
    Color3.White(),
    "light1",
    scene
  );
  createLight(
    new Vector3(-300, 300, 600),
    new Vector3(5.681, 0, 0),
    Color3.Red(),
    "light2",
    scene
  );
  createLight(
    new Vector3(-600, 200, -100),
    new Vector3(5.681, -1.596, 0),
    Color3.Green(),
    "light3",
    scene
  );

  const groundMat = new StandardMaterial("StandardMaterial", scene);
  groundMat.roughness = 0.25;
  groundMat.diffuseColor = Color3.Black();

  const ground = MeshBuilder.CreateGround(
    "ground",
    { width: 1000, height: 1000 },
    scene
  );
  ground.position.y -= 1000;

  ground.material = groundMat;
  type GameMeshes = {
    ball?: Mesh;
    arena?: Mesh;
    paddle1?: Mesh;
    paddle2?: Mesh;
  };
  const meshes: GameMeshes = {};

  try {
    const result = await SceneLoader.ImportMeshAsync("", "", arenaModel, scene);
    const mainMesh = result.meshes[0]; //root
    if (mainMesh) {
      mainMesh.scaling.addInPlace(new Vector3(100, 100, -100));
      mainMesh.position.addInPlace(new Vector3(-10, 10, 10));
      camera.setTarget(mainMesh.position);
    }

    const axes = new AxesViewer(scene, 10); //y green, x red, z blue

    result.meshes.forEach((mesh) => {
      let mat = mesh.material as Material;
      if (!mat) return;

      if (mesh.name.includes("ball")) {
        mesh.scaling = simmetrical_vec(0.4);
        meshes.ball = mesh as Mesh;
      }
      if (mesh.name.includes("arena")) meshes.arena = mesh as Mesh;
      if (mesh.name.includes("paddle2")) meshes.paddle1 = mesh as Mesh;
      if (mesh.name.includes("paddle3")) meshes.paddle2 = mesh as Mesh;

      if (mat.name.toLowerCase().includes("glass")) {
        mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
        mat.backFaceCulling = false;
      }
      if (mat.name.toLowerCase().includes("gradient")) {
        mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
        mat.backFaceCulling = false;

        if (mat instanceof PBRMaterial) {
          mat.albedoColor = mat.albedoColor.clone();
          mat.alpha = 0.2;
          mat.backFaceCulling = false;
          // mat.needDepthPrePass =true;
          mat.transparencyMode = 2;
          mat.metallic = 1;
          mat.roughness = 1;
          mat.indexOfRefraction = 1.5;
          mat.clearCoat.isEnabled = true;
          mat.clearCoat.roughness = 0;
          mat.clearCoat.indexOfRefraction = 2;
          mat.specularIntensity = 0;

          mat.subSurface.isRefractionEnabled = true;
          mat.subSurface.refractionIntensity = 1.0;
          mat.subSurface.indexOfRefraction = 1.5;
          mat.subSurface.tintColor = new Color3(1, 1, 1);
          mat.subSurface.minimumThickness = 0.1;
          mat.subSurface.maximumThickness = 0.5;
          mat.environmentBRDFTexture = scene.environmentTexture;
          mat.subSurface.useMaskFromThicknessTexture = true;
          mat.forceIrradianceInFragment = true;
        }

        if (mat instanceof StandardMaterial) {
          mat.diffuseColor = mat.diffuseColor.clone();
          mat.alpha = 0.6;
        }

	  
      }
    });
	const bg = await SceneLoader.ImportMeshAsync("", "", city, scene);
	const cityRoot = bg.meshes[0]; //root
    if (cityRoot) {
      cityRoot.scaling.addInPlace(new Vector3(5, 5, -5));
      cityRoot.position.addInPlace(new Vector3(-10, -900, 10));
    }

  } catch (error) {
    console.error("Failed to load model:", error);
    throw error;
  }

  scene.clearColor = new Color4(0.1, 0.1, 0.1, 1);
  const gl = new GlowLayer("glow", scene, {
    mainTextureSamples: 4,
  });
  gl.intensity = 0.75;

  if (meshes.paddle1 && meshes.arena) {
    meshes.paddle1.position.set(meshes.arena.scaling.x-0.12, 0, 0);
  }

  if (meshes.paddle2 && meshes.arena) {
    meshes.paddle2.position.set(-(meshes.arena.scaling.x-0.12), 0, 0);
  }

  if (firstTime) {
    //play animation
    firstTime = 0;
  }

type Input = {
  up: number;
  left: number;
  down: number;
  right: number;
  reset: number;
  pause: number;
};

const input: Input = {
    up: 0,
  left: 0,
  down: 0,
  right: 0,
  reset: 0,
  pause: 0
};



scene.onKeyboardObservable.add((kbInfo) => {
            switch (kbInfo.type) {
            case KeyboardEventTypes.KEYDOWN:
                switch (kbInfo.event.key) {  
                case "w":
                    input.up = 1;
                    break;
                } 
				switch (kbInfo.event.key) {  
                case "a":
                    input.left = 1;
                    break;
                } 
				switch (kbInfo.event.key) {  
                case "s":
                    input.down = 1;
                    break;
                }
				switch (kbInfo.event.key) {  
                case "d":
                    input.right = 1;
                    break;
                }
				switch (kbInfo.event.key) {  
                case " ":
                    input.reset = 1;
                    break;
                }
				switch (kbInfo.event.key) {  
                case "p":
					if(!input.pause)
                    	input.pause = 1;
					else
						input.pause = 0;
                    break;
                }                 
                break;

            case KeyboardEventTypes.KEYUP:
                switch (kbInfo.event.key) {   
                case "w":
                    input.up = 0;
                    break;
                }     
				switch (kbInfo.event.key) {  
                case "a":
                    input.left = 0;
                    break;
                } 
				switch (kbInfo.event.key) {  
                case "s":
                    input.down = 0;
                    break;
                }
				switch (kbInfo.event.key) {  
                case "d":
                    input.right = 0;
                    break;
                }
				switch (kbInfo.event.key) {  
                case " ":
                    input.reset = 0;
                    break;
                }
				switch (kbInfo.event.key) {  
                case "p":
                    input.pause = input.pause;
                    break;
                }                
                break;           
            }
        });

  scene.registerBeforeRender(function () {
	if(input.pause)	return;
    const playerInputs: Record<string, { up: number; down: number; left: number; right: number }> = {};
    if (playerId) {
      playerInputs[playerId] = {
        up: input.up,
        down: input.down,
        left: input.left,
        right: input.right,
      };
    }
    gameMath.update(playerInputs, input.reset);
    if (meshes.ball) {
      const state = gameMath.getState();
      meshes.ball.position.set(
        state.ball.x,
        state.ball.y,
        state.ball.z
      );
      const paddle = state.paddles[playerId];
      if (meshes.paddle1 && paddle) {
        meshes.paddle1.position.z = -paddle.x;
        meshes.paddle1.position.y = paddle.y;
      }
    }
  });

  await SceneOptimizer.OptimizeAsync(scene);
  await scene.whenReadyAsync();

  return scene;
}

(window as any).attachPlayBtnListener = attachPlayBtnListener;