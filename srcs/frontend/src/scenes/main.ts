import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";
import { Inspector } from "@babylonjs/inspector";
import HavokPhysics from "@babylonjs/havok";
import model from "@/assets/models/arena.glb"; //arena, paddles and ball models
import city from "@/assets/models/mid_city_separate.glb"; //city model
import score from "@/assets/models/score.glb"; //score sign model
import phanta from "@/assets/models/phanta.glb"; //PhantAI
import yohai from "@/assets/models/yohan.glb"; //yohAI
import {
  simmetrical_vec,
  createLight,
  createTrail,
  sign_flicker,
  glow_score_title,
  save_materials,
} from "../utils/babylonUtils";
import { GameMath } from "../../../backend/src/game/pong/pong_logic";
import { BaseTexture, int, PointLight } from "@babylonjs/core";
import { stick, score_counter } from "../utils/scorePrinting";
import { Dispose } from "@babylonjs/core/Misc/dumpTools";
import { update_ball, update_reset, update_paddles } from "../utils/updates";
import { socket } from "../matchmaking";

export type GameMeshes = {
  //array of the important meshes (objects/models)
  ball?: BABYLON.Mesh;
  arena?: BABYLON.Mesh;
  paddles?: BABYLON.Mesh[];
  score_title?: BABYLON.Mesh;
  score_counter?: BABYLON.Mesh[];
  score_units?: stick[];
};

export type Input = {
  //input object
  up: number;
  left: number;
  down: number;
  right: number;
  reset: number;
  pause: number;
};

function camera_setup(
  scene: BABYLON.Scene,
  player_id: number,
  canvas: HTMLCanvasElement,
  vanilla: number
) {
  const camera = new BABYLON.ArcRotateCamera( //the camera is created here. it's an arc rotate camera, so it looks towards a target (center of the arena), and spins around it on 2 axes.
    "Camera",
    Math.PI,
    Math.PI / 2,
    100,
    BABYLON.Vector3.Zero(),
    scene
  );
  camera.lowerRadiusLimit = 70; //how close to the target the camera can get
  camera.upperRadiusLimit = 200; //and how far
  camera.attachControl(canvas, true); //makes controlling the camera with the mouse possible
  camera.fov = 1.5;
  if(vanilla==1){
	camera.inputs.remove(camera.inputs.attached.keyboard);
	camera.fov=0.7;
  }

  const ratio = canvas.height / canvas.width;
  let camera2 = new BABYLON.ArcRotateCamera( //this is the first extra view (top view). needs to be rotated depending on the player id so the respective paddle shows on the bottom
    "camera",
    Math.PI,
    0,
    50,
    new BABYLON.Vector3(0, 100, 0),
    scene
  );
  camera2.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
  camera2.orthoRight = 110;
  camera2.orthoLeft = -camera2.orthoRight;
  camera2.orthoTop = camera2.orthoRight * ratio;
  camera2.orthoBottom = camera2.orthoLeft * ratio;

  let camera3 = new BABYLON.ArcRotateCamera( //extra view #2 (front view). again needs to be rotated based on player id so the respective paddle is on the front/center
    "camera",
    Math.PI,
    Math.PI / 2,
    50,
    new BABYLON.Vector3(0, 10, 0),
    scene
  );
  camera3.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA; //these views are ortographic
  camera3.orthoRight = 150;
  camera3.orthoLeft = -camera3.orthoRight;
  camera3.orthoTop = camera3.orthoRight * ratio;
  camera3.orthoBottom = camera3.orthoLeft * ratio;

  camera.viewport = new BABYLON.Viewport(0, 0, 1, 1);
  camera2.viewport = new BABYLON.Viewport(0.75, 0.1, 0.16, 0.16);
  camera3.viewport = new BABYLON.Viewport(0.83, 0.087, 0.22, 0.22);
  camera.layerMask = 0xffffffff; //everything shows up on the main camera
  camera2.layerMask = 0x10000000; //only the arena and paddles show up on the ortographic ones
  camera3.layerMask = 0x10000000;
  scene.activeCameras!.push(camera);
  scene.activeCameras!.push(camera2);
  scene.activeCameras!.push(camera3);
}

async function import_meshes(
  scene: BABYLON.Scene,
  meshes: GameMeshes,
  player_nbr: number,
  player_id: number,
  AI: number
) {
  let arena_meshes: BABYLON.ISceneLoaderAsyncResult;
  try {
    arena_meshes = await BABYLON.SceneLoader.ImportMeshAsync(
      "",
      "",
      model,
      scene
    ); //imports the arena, paddles and ball
    const mainMesh = arena_meshes.meshes[0]; //mesh 0 which i name mainMesh here is a root mesh that contains all 3 mentioned above
    if (mainMesh) mainMesh.scaling = new BABYLON.Vector3(-1, 1, -1);
  } catch (error) {
    console.error("Failed to load arena model:", error);
    throw error;
  }
  arena_meshes.meshes.forEach((mesh) => {
    mesh.layerMask = 0x10000000; //this is for attributing a specific rendering order to make the transparency work properly

    if (mesh.name.includes("ball")) meshes.ball = mesh as BABYLON.Mesh;
    if (mesh.name.includes("arena")) meshes.arena = mesh as BABYLON.Mesh;
    if (meshes.paddles && mesh.name.includes("paddle")) {
      const paddle_nbr = +mesh.name.substring(6, 7);
      if (!mesh.name.includes("border"))
        meshes.paddles[paddle_nbr - 1] = mesh as BABYLON.Mesh;
      if (paddle_nbr > player_nbr) mesh.isVisible = false;
    }

    save_materials(
      scene,
      mesh as BABYLON.Mesh,
      mesh.material as BABYLON.PBRMaterial,
      player_id
    );
  });
  try {
    const cityscene = await BABYLON.SceneLoader.ImportMeshAsync(
      "",
      "",
      city,
      scene
    ); //importing city model, i want it to be animated later on but first i need to figure out a way to get the materials to look at least close to how they do in blender
    const cityRoot = cityscene.meshes[0]; //root mesh
    if (cityRoot) {
      cityRoot.scaling.addInPlace(new BABYLON.Vector3(5, 5, 5));
      cityRoot.position.addInPlace(new BABYLON.Vector3(-10, -900, 10));
    }
  } catch (error) {
    console.error("Failed to load city model:", error);
    throw error;
  }
  try {
    const score_sign = await BABYLON.SceneLoader.ImportMeshAsync(
      "",
      "",
      score,
      scene
    ); //importing score sign
    const scoreRoot = score_sign.meshes[0]; //root
    if (scoreRoot) {
      meshes.score_title = scoreRoot as BABYLON.Mesh;
      scoreRoot.scaling.addInPlace(new BABYLON.Vector3(60, 60, -60));
      scoreRoot.position.addInPlace(new BABYLON.Vector3(1500, 900, 900));
      scoreRoot.rotation = new BABYLON.Vector3(0, Math.PI / 2, 0);
    }
  } catch (error) {
    console.error("Failed to load score title sign model:", error);
    throw error;
  }

  await score_counter(player_nbr, scene, meshes, player_id);

  if(AI){

	let AImodel= AI==1 ? phanta : yohai;
	let AI_meshes: BABYLON.ISceneLoaderAsyncResult;

	try {
    AI_meshes = await BABYLON.SceneLoader.ImportMeshAsync(
      "",
      "",
      AImodel,
      scene
    );
    const AIMesh = AI_meshes.meshes[0];
    if (AIMesh) AIMesh.position = new BABYLON.Vector3(1, 1, 700);//need to check the axes
  } catch (error) {
    console.error("Failed to load AI model:", error);
    throw error;
  }
  }
}

function arena_orientation(
  meshes: GameMeshes,
  scene: BABYLON.Scene,
  player_id: number,
  vanilla: number
) {
  let amount = 0;
  const y_axis = new BABYLON.Vector3(0, 1, 0);
  const z_axis = new BABYLON.Vector3(0, 0, 1);
  let axis = y_axis;

  switch (player_id) {
    case 1:
      amount = Math.PI;
      break;
    case 3:
      amount = Math.PI / 2;
      break;
    case 4:
      amount = -Math.PI / 2;
      break;
    case 5:
      axis = z_axis;
      amount = Math.PI / 2;
      break;
    case 6:
      axis = z_axis;
      amount = -Math.PI / 2;
      break;
  }
  if(vanilla==1) amount=Math.PI / 2;
  meshes.arena?.rotateAround(simmetrical_vec(0), axis, amount);
  if (player_id == 5)
    meshes.arena?.rotateAround(
      simmetrical_vec(0),
      new BABYLON.Vector3(1, 0, 0),
      Math.PI
    );
}

export async function createGameScene( //function that makes all the visuals (updates are at the bottom), it takes the engine, the html canvas and the backend calculations object as parameters
  engine: BABYLON.Engine,
  canvas: HTMLCanvasElement,
  gameMath: GameMath
): Promise<BABYLON.Scene> {
  //returns a babylon js scene
  const scene = new BABYLON.Scene(engine);

  //initial call to the API to fetch game information such as how many players there are will go here

  const room = await new Promise<any>((resolve) => {
    socket.on(
      "roomResponse",
      ({ room }: { room: any }) => {
        console.log("roomResponse event received:", room);
        resolve(room);
      }
    );

    socket.emit("roomRequest", {});

    // Fallback timeout
    setTimeout(() => resolve(6), 2000);
  });
  
  const player_nbr= room.numPlayers;
  const vanilla= room.vanilla;
  const AI= room.isSinglePlayer;
//   const player_nbr = await new Promise<number>((resolve) => {
//     socket.on(
//       "playerCountResponse",
//       ({ numPlayers }: { numPlayers: number }) => {
//         console.log("playerCountResponse event received:", numPlayers);
//         resolve(numPlayers);
//       }
//     );

//     socket.emit("playerCountRequest", {});

//     // Fallback timeout
//     setTimeout(() => resolve(6), 2000);
//   });

    let player_id = await new Promise<number>((resolve) => {
    socket.on(
      "playerIDResponse",
      ({ playerIdx }: { playerIdx: number }) => {
        console.log("playerIDResponse event received:", playerIdx);
        resolve(playerIdx+1);
      }
    );

    socket.emit("playerIDRequest", {});

    // Fallback timeout
    setTimeout(() => resolve(-2), 2000);
  });
// console.log("PLAYER ID: "+ player_id);

//     let vanilla = await new Promise<number>((resolve) => {
//     socket.on(
//       "vanillaResponse",
//       ({ vanilla }: { vanilla: number }) => {
//         console.log("vanillaResponse event received:", vanilla);
//         resolve(vanilla);
//       }
//     );

//     socket.emit("vanillaRequest", {});

//     // Fallback timeout
//     setTimeout(() => resolve(0), 2000);
//   });

//       let AI = await new Promise<number>((resolve) => {
//     socket.on(
//       "AIResponse",
//       ({ AI }: { AI: number }) => {
//         console.log("AIResponse event received:", AI);
//         resolve(AI);
//       }
//     );

//     socket.emit("AIRequest", {});

//     // Fallback timeout
//     setTimeout(() => resolve(0), 2000);
//   });

  let sky = BABYLON.CubeTexture.CreateFromPrefilteredData(
    "../../assets/hdris/night_sky2.env",
    scene
  );
  let desert = BABYLON.CubeTexture.CreateFromPrefilteredData(
    "../../assets/hdris/kiara.env",
    scene
  );
  let helper = scene.createDefaultEnvironment({
    //this creates the skybox, environment texture etc
    groundOpacity: 0,
    createSkybox: true,
    skyboxTexture: sky,
    skyboxSize: 10000,
    environmentTexture: desert,
  });

  const axes = new BABYLON.AxesViewer(scene, 10); //this just shows the world axes, y green, x red, z blue
  //   scene.environmentTexture = desert;
  //   scene.createDefaultSkybox(sky, true, 100000);

  camera_setup(scene, player_id, canvas, vanilla); //creates the main camera + the 2 little views in the corner

  const groundMat = new BABYLON.StandardMaterial("StandardMaterial", scene); //ground under the city (here i'm creating the material for it first for some reason)
  groundMat.diffuseColor = BABYLON.Color3.Black();

  const ground = BABYLON.MeshBuilder.CreateGround(
    //creates the ground
    "ground",
    { width: 1000, height: 1000 },
    scene
  );
  ground.position.y -= 1000;
  ground.material = groundMat; //this assigns the material

  const meshes: GameMeshes = {};
  meshes.paddles = [];
  meshes.score_units = [];
  meshes.score_counter = [];

  await import_meshes(scene, meshes, player_nbr, player_id, AI);

  arena_orientation(meshes, scene, player_id, vanilla);
  const scoremat = scene.getMeshByName("score")
    ?.material as BABYLON.PBRMaterial;
  const scoregl = glow_score_title(scene, meshes, scoremat);
  const gl = new BABYLON.GlowLayer("glow", scene, {
    //adds glow to the emissive materials
    mainTextureSamples: 4,
  });
  gl.intensity = 0.6;

  const trail = createTrail(meshes.ball, scene, 3);

  const input: Input = {
    //these variables are all just flags, they need one per key so we can click several keys at the same time, let them go etc and it all keeps moving smoothly, and for security reasons to prevent hacking attempts + pause and reset ball flags
    up: 0,
    left: 0,
    down: 0,
    right: 0,
    reset: 1,
    pause: 0,
  };

      let input2: Input = {
    up: 0,
    left: 0,
    down: 0,
    right: 0,
    reset: 1,
    pause: 0,
  };

  let isLocked = false;
  // On click event, request pointer lock
  scene.onPointerDown = function (evt) {
    //hide mouse pointer
    canvas.requestPointerLock();
  };

  let pointerlockchange = function () {
    var controlEnabled = document.pointerLockElement || null;
    // If the user is already locked
    if (!controlEnabled) {
      isLocked = false;
    } else {
      isLocked = true;
    }
  };

  document.addEventListener("pointerlockchange", pointerlockchange, false);

  scene.onKeyboardObservable.add((kbInfo) => {
    //keyboard event to change the flags and yes i've tried to make it shorter like 1 switch and for some reason it does not work
    switch (kbInfo.type) {
      case BABYLON.KeyboardEventTypes.KEYDOWN:
        switch (kbInfo.event.key) {
          case "w":
            input.up = 1;
            break;
          case "a":
            input.left = 1;
            break;
          case "s":
            input.down = 1;
            break;
          case "d":
            input.right = 1;
            break;
          case " ":
            input.reset = 1;
            break;
          case "f":
            if (!input.pause) input.pause = 1;
            else input.pause = 0;
            break;
        }
        break;

      case BABYLON.KeyboardEventTypes.KEYUP: //this is the keyboard event of releasing the key, the above was pressing it
        switch (kbInfo.event.key) {
          case "w":
            input.up = 0;
            break;
          case "a":
            input.left = 0;
            break;
          case "s":
            input.down = 0;
            break;
          case "d":
            input.right = 0;
            break;
          case " ":
            input.reset = 0;
            break;
          case "f":
            input.pause = input.pause;
            break;
        }
        break;
    }
  });

  let spltScrn = 0;

  if(vanilla==1)
  {
	scene.onKeyboardObservable.add((kbInfo) => {
    //keyboard event to change the flags and yes i've tried to make it shorter like 1 switch and for some reason it does not work
    switch (kbInfo.type) {
      case BABYLON.KeyboardEventTypes.KEYDOWN:
        switch (kbInfo.event.key) {
          case "ArrowUp":
            input2.up = 1;
            break;
          case "ArrowLeft":
            input2.left = 1;
            break;
          case "ArrowDown":
            input2.down = 1;
            break;
          case "ArrowRight":
            input2.right = 1;
            break;
		  case ".":
            if (!spltScrn) spltScrn = 1;
            else spltScrn = 0;
            break;
        }
        break;

      case BABYLON.KeyboardEventTypes.KEYUP: //this is the keyboard event of releasing the key, the above was pressing it
        switch (kbInfo.event.key) {
          case "ArrowUp":
            input2.up = 0;
            break;
          case "ArrowLeft":
            input2.left = 0;
            break;
          case "ArrowDown":
            input2.down = 0;
            break;
          case "ArrowRight":
            input2.right = 0;
            break;
		  case ".":
            spltScrn = spltScrn;
            break;
        }
        break;
    }
  });
  }

  let reset = 0;
  let orb: BABYLON.Mesh;
  let orbmaterial = new BABYLON.StandardMaterial("orbmaterial");
  orbmaterial.emissiveColor = BABYLON.Color3.Red();
  const bottom_light = new BABYLON.HemisphericLight(
    "bottom_light",
    new BABYLON.Vector3(0, -1, 0)
  );

  await BABYLON.InitializeCSG2Async();
  let sphereCSG = BABYLON.CSG2.FromMesh(meshes.arena!);
  let boxCSG: BABYLON.CSG2;
  let booleanCSG: BABYLON.CSG2;
  let booleanCSG2: BABYLON.CSG2;
  let newMesh: BABYLON.Mesh;
  let smaller = BABYLON.MeshBuilder.CreateBox("smaller", { size: 99 });
  smaller.material = groundMat;
  let newnewMesh: BABYLON.Mesh;
  let sphereCSG2 = BABYLON.CSG2.FromMesh(smaller!);
  smaller!.isVisible = false;
  let opacity: number = 0.8;
  let speed: number = 0;
  let counter: number = 0;
  let serverGameState: any = null;
  let i=0;
  const onGameState = ({ gameState }: { gameState: any }) => {
    serverGameState = gameState;

    if (!serverGameState) {
      // no-op when server sends null/empty state
      // keeps previous visuals intact until next valid update
      console.log("IT'S JOEVER");
      return;
    }
    console.log("WINNER: " + serverGameState.winner);
    update_ball(meshes, serverGameState);
    reset = update_reset(meshes, serverGameState, trail, reset, player_nbr);
    update_paddles(meshes, serverGameState);
    if (serverGameState.hit) {
      console.log("hit!");
      console.log(serverGameState);
      const hitPoint = new BABYLON.Vector3(
        serverGameState.hitPoint.pos.x,
        serverGameState.hitPoint.pos.y,
        serverGameState.hitPoint.pos.z
      );
      if (orb) orb.dispose();
      orb = BABYLON.MeshBuilder.CreateSphere("orb", { diameter: 30 });

      orb.isVisible = false;
      orb.material = orbmaterial;
      orb.setParent(meshes.arena!);
      orb.position.set(
        serverGameState.hitPoint.pos.x,
        serverGameState.hitPoint.pos.y,
        serverGameState.hitPoint.pos.z
      );
      if (boxCSG) boxCSG.dispose();
      boxCSG = BABYLON.CSG2.FromMesh(orb);

      if (booleanCSG) booleanCSG.dispose();
      booleanCSG = sphereCSG.intersect(boxCSG);
      if (newMesh) newMesh.dispose();
      newMesh = booleanCSG.toMesh("newMesh", scene, {
        centerMesh: false,
        materialToUse: orbmaterial,
      });
      boxCSG.dispose();
      boxCSG = BABYLON.CSG2.FromMesh(newMesh);
      if (booleanCSG2) booleanCSG2.dispose();
      booleanCSG2 = boxCSG.subtract(sphereCSG2);
      if (newnewMesh) newnewMesh.dispose();
      newnewMesh = booleanCSG2.toMesh("newnewMesh", scene, {
        centerMesh: false,
        materialToUse: orbmaterial,
      });
      newMesh.dispose();
      opacity = serverGameState.hitPoint.dist - 4;
      speed = new BABYLON.Vector3(
        serverGameState.ball.velocity.x,
        serverGameState.ball.velocity.y,
        serverGameState.ball.velocity.z
      ).length();
      counter = 0.5;
    }
    if (newnewMesh) {
      if (counter < opacity) counter += speed;
      newnewMesh.material!.alpha = 0.8 - counter / opacity;
    }
    input.reset = 0;
    if (serverGameState) serverGameState = null;
  };

  socket.on("gameState", onGameState);

  //cleanup when leaving the #pong route so rendering and socket handlers stop
  const onHashChange = () => {
    if (!location.hash.startsWith("#pong")) {
      console.log("Leaving #pong — cleaning up scene and handlers");
      try {
        socket.off("gameState", onGameState);
      } catch (e) {
        /* ignore */
      }
      try {
        engine.stopRenderLoop();
      } catch (e) {
        /* ignore */
      }
      try {
        scene.dispose();
      } catch (e) {
        /* ignore */
      }
      try {
        document.removeEventListener("pointerlockchange", pointerlockchange, false);
      } catch (e) {}
      try {
        window.removeEventListener("hashchange", onHashChange);
      } catch (e) {}
    }
  };
  window.addEventListener("hashchange", onHashChange);
  scene.registerBeforeRender(function () {
    //the registerBeforeRender function is what updates the scene every frame so the API fetches for the updating of the positions of everything + the score will be called here
    sign_flicker(scoregl, scoremat); //this just flickers the score sign
    if (input.pause) return; //if the game is paused nothing is sent to or returned from update
    //gameMath.update(input.up, input.down, input.left, input.right, input.reset); //this is where i send the inputs (only the inputs, no positions of anything, for the aforementioned security reasons). needs to be replaced by an API send. This function is in the pong_logic.ts
    socket.emit("SendInputsToBackend", {
      input: {
        up: input.up,
        left: input.left,
        down: input.down,
        right: input.right,
        reset: input.reset,
      },
	  input2: {
        up: input2.up,
        left: input2.left,
        down: input2.down,
        right: input2.right,
        reset: input2.reset,
      }
    });
    
  });
  //scene.debugLayer.show();
  let optimizerOptions = new BABYLON.SceneOptimizerOptions(60, 500);
  optimizerOptions.optimizations = optimizerOptions.optimizations.filter(
    (opt) => !(opt instanceof BABYLON.MergeMeshesOptimization)
  );
  BABYLON.SceneOptimizer.OptimizeAsync(scene, optimizerOptions);
  await scene.whenReadyAsync();
  return scene;
}
