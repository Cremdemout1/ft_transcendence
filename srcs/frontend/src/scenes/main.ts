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
  KeyboardEventTypes,
  TrailMesh,
  Viewport,
  HavokPlugin,
  PhysicsRaycastResult,
  PhysicsAggregate,
  PhysicsShapeType,
  SpotLight,
  Matrix,
  Ray,
  RayHelper,
} from "@babylonjs/core";

import { Inspector } from "@babylonjs/inspector";
import HavokPhysics from "@babylonjs/havok";
import model from "@/assets/models/transcendence_fixed.glb"; //arena, paddles and ball models
import city from "@/assets/models/mid_city.glb"; //city model
import score from "@/assets/models/score.glb"; //score sign model
import { simmetrical_vec } from "../babylonUtils";
import { GameMath } from "../../../backend/src/game/pong/pong_logic";
import { PointLight } from "babylonjs";
import hitCircle_tex from "../../assets/tex/hit_circle.png";

function createLight( //this function just creates a rectangular area light (right now none are being used in the scene)
  position: Vector3,
  rotation: Vector3,
  color: Color3,
  name: string,
  scene: Scene
) {
  const width = 100;
  const height = 100;
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
  box.lookAt(simmetrical_vec(0));

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
  light.includeOnlyWithLayerMask = 0x20000000;
}

function createTrail(ball: Mesh | undefined, scene: Scene, diameter: number) {
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
    const trail = new TrailMesh("trail", ball, scene, options);
    trail.layerMask = 0x10000000;
    let sourceMat = new StandardMaterial("sourceMat", scene);
    let color = new Color3(244, 0, 255);
    sourceMat.emissiveColor = sourceMat.diffuseColor = color;
    sourceMat.specularColor = Color3.Black();
    trail.material = sourceMat;
    trail.start();
    return trail;
  }
  return null;
}

function sign_flicker(gl: GlowLayer, scoremat: PBRMaterial) {
  //helper function to make the light on the score sign flicker
  const t = performance.now() * 0.003;
  const base = 0.3;
  const flicker = base + 0.3 * Math.sin(t * 20) + Math.random() * 0.1;
  gl.intensity = flicker;
  scoremat.emissiveIntensity = flicker * 20 + 50;
}

export async function createGameScene( //function that makes all the visuals (updates are at the bottom), it takes the engine, the html canvas and the backend calculations object as parameters
  engine: Engine,
  canvas: HTMLCanvasElement,
  gameMath: GameMath
): Promise<Scene> {
  //returns a babylon js scene
  const scene = new Scene(engine);

  //initial call to the API to fetch game information such as how many players there are will go here

  let player_nbr = 6;

  scene.createDefaultEnvironment({
    //i just use this to give random reflections to the arena glass
    groundOpacity: 0,
    createSkybox: false,
  });

  //With the cameras keep in mind right now it is as if the player is the RED PADDLE
  const camera = new ArcRotateCamera( //the camera is created here. it's an arc rotate camera, so it looks towards a target (center of the arena), and spins around it on 2 axes. needs to be rotated after creation based on player id so it starts facing the correct paddle
    "Camera",
    0,
    Math.PI / 2,
    100,
    Vector3.Zero(),
    scene
  );
  camera.lowerRadiusLimit = 70; //how close to the target the camera can get
  camera.upperRadiusLimit = 200; //and how far
  camera.attachControl(canvas, true); //makes controlling the camera with the mouse possible
  camera.fov = 1.5;

  const ratio = canvas.height / canvas.width;
  let camera2 = new ArcRotateCamera( //this is the first extra view (top view). needs to be rotated depending on the player id so the respective paddle shows on the bottom
    "camera",
    0,
    0,
    50,
    new Vector3(0, 100, 0),
    scene
  );
  camera2.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera2.orthoRight = 110;
  camera2.orthoLeft = -camera2.orthoRight;
  camera2.orthoTop = camera2.orthoRight * ratio;
  camera2.orthoBottom = camera2.orthoLeft * ratio;

  let camera3 = new ArcRotateCamera( //extra view #2 (front view). again needs to be rotated based on player id so the respective paddle is on the front/center
    "camera",
    0,
    Math.PI / 2,
    50,
    new Vector3(0, 10, 0),
    scene
  );
  camera3.mode = Camera.ORTHOGRAPHIC_CAMERA; //these views are ortographic
  camera3.orthoRight = 150;
  camera3.orthoLeft = -camera3.orthoRight;
  camera3.orthoTop = camera3.orthoRight * ratio;
  camera3.orthoBottom = camera3.orthoLeft * ratio;

  camera.viewport = new Viewport(0, 0, 1, 1);
  camera2.viewport = new Viewport(0.75, 0.1, 0.16, 0.16);
  camera3.viewport = new Viewport(0.83, 0.087, 0.22, 0.22);
  camera.layerMask = 0xffffffff;
  camera2.layerMask = 0x10000000;
  camera3.layerMask = 0x10000000;
  scene.activeCameras!.push(camera);
  scene.activeCameras!.push(camera2);
  scene.activeCameras!.push(camera3);

  //   createLight(
  //     new Vector3(800, 240, -1000),
  //     new Vector3(50, 1.596,60),
  //     Color3.White(),
  //     "light1",
  //     scene
  //   );
  //   createLight(
  //     new Vector3(-300, 300, 600),
  //     new Vector3(5.681, 0, 0),
  //     Color3.Red(),
  //     "light2",
  //     scene
  //   );
  //   createLight(
  //     new Vector3(-600, 200, -100),
  //     new Vector3(5.681, -1.596, 0),
  //     Color3.Green(),
  //     "light3",
  //     scene
  //   );

  const groundMat = new StandardMaterial("StandardMaterial", scene); //ground under the city (here i'm creating the material for it first for some reason)
  groundMat.roughness = 0.25;
  groundMat.diffuseColor = Color3.Black();

  const ground = MeshBuilder.CreateGround(
    //creates the ground
    "ground",
    { width: 1000, height: 1000 },
    scene
  );
  ground.position.y -= 1000;
  ground.material = groundMat; //this assigns the material

  //   var skybox = Mesh.CreateBox("skyBox", 3000.0, scene);
  //     var skyboxMaterial = new StandardMaterial("skyBox", scene);
  //     skyboxMaterial.backFaceCulling = false;
  //     skyboxMaterial.reflectionTexture = new CubeTexture("srcs/frontend/assets/hdris/sky", scene);
  //     skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
  //     skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
  //     skyboxMaterial.specularColor = new Color3(0, 0, 0);
  //     skybox.material = skyboxMaterial;

  type GameMeshes = {
    //array of the important meshes (objects/models), obviously will be developed to include all paddles when all their positions are actually being updated
    ball?: Mesh;
    arena?: Mesh;
    paddles?: Mesh[];
    score_title?: Mesh;
  };
  const meshes: GameMeshes = {};
  meshes.paddles = [];
//   console.log("Array right after init: ");
//   console.log(meshes.paddles);
//   console.log("-------------------------");
  try {
    const result = await SceneLoader.ImportMeshAsync("", "", model, scene); //imports the arena, paddles and ball
    const mainMesh = result.meshes[0]; //mesh 0 which i name mainMesh here is a root mesh that contains all 3 mentioned above
    if (mainMesh) {
      //do rotation here
      //if player= white or black only?
      //mainMesh.rotateAround(simmetrical_vec(0), new Vector3(1,0,0), Math.PI/2);
      mainMesh.scaling = new Vector3(-1, 1, -1);
      camera.setTarget(mainMesh.position);
      camera2.setTarget(mainMesh.position);
    }

    const axes = new AxesViewer(scene, 10); //this just shows the world axes, y green, x red, z blue

    result.meshes.forEach((mesh) => {
      console.log(mesh.name);
      console.log("Array first:");
      console.log(meshes.paddles);
      if (
        mesh.name.includes("ball") ||
        mesh.name.includes("paddle") ||
        mesh.name.includes("arena")
      ) {
        mesh.layerMask = 0x10000000; //this is for attributing a specific rendering order to make the transparency work properly
        mesh.mustDepthSortFacets = true;
      }
      let mat = mesh.material as Material;
      if (!mat) return;

      if (mesh.name.includes("ball")) {
        mesh.scaling = simmetrical_vec(0.4);
        meshes.ball = mesh as Mesh;
        // let ball_clone=meshes.ball.clone();
        // ball_clone.parent= meshes.ball;
        // ball_clone.scaling=new Vector3(2,2,2);
        // ball_clone.layerMask= 0x10000000;
        // let bigtrail= createTrail(ball_clone, scene, 5);
        // bigtrail!.layerMask = 0x10000000;
      }
      if (mesh.name.includes("arena")) meshes.arena = mesh as Mesh;
      for (let i = 0; i < player_nbr; i++) {
        const paddle_name = "paddle" + (i + 1); //paddle1 will be meshes.paddles[0]
        console.log("paddle_name: " + paddle_name);
        if (
          meshes.paddles &&
          mesh.name.includes(paddle_name) &&
          !mesh.name.includes("border")
        )
          meshes.paddles[i] = mesh as Mesh;
      }
      for (let i = player_nbr; i < 6; i++) {
        const paddle_name = "paddle" + (i + 1);
        console.log("paddle_name: " + paddle_name);
        if (meshes.paddles && mesh.name.includes(paddle_name))
          mesh.isVisible = false;
      }
      console.log("Array after:");
      console.log(meshes.paddles);
      //forEach player (API call)

      if (mat.name.toLowerCase().includes("glass")) {
        //trying to make the paddle glass material look translucid but still have a solid color and be a bit foggy/rough
        mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
        mat.backFaceCulling = false;

        if (mat instanceof PBRMaterial) {
          mat.alpha = 0.5;
          mat.transparencyMode = 2;
          mat.metallic = 0;
          mat.indexOfRefraction = 1.5;
        }
      }

      if (mat.name.toLowerCase().includes("border")) {
        //borders of the paddles have a different, less transparent material for better visibility
        if (mat instanceof PBRMaterial) {
          mat.alpha = 0.9;
          mat.metallic = 0.9;
        }
      }
      if (mat.name.toLowerCase().includes("gradient")) {
        //arena glass configuration to make it look decent god somebody shoot me please
        mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
        mat.backFaceCulling = false;
        if (mat instanceof PBRMaterial) {
          mat.albedoColor = mat.albedoColor.clone();
          mat.alpha = 0.2;
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
    const bg = await SceneLoader.ImportMeshAsync("", "", city, scene); //importing city model, i want it to be animated later on but first i need to figure out a way to get the materials to look at least close to how they do in blender
    const cityRoot = bg.meshes[0]; //root mesh
    if (cityRoot) {
      cityRoot.scaling.addInPlace(new Vector3(5, 5, 5));
      cityRoot.position.addInPlace(new Vector3(-10, -900, 10));
      // bg.meshes.forEach((mesh) => {
      // mesh.layerMask= 0x10000000;
      // });
    }
    const score_sign = await SceneLoader.ImportMeshAsync("", "", score, scene); //importing score sign (i've only modeled the title so far but the score system works i'm just not printing it anywhere)
    const scoreRoot = score_sign.meshes[0]; //root
    if (scoreRoot) {
      meshes.score_title = scoreRoot as Mesh;
      scoreRoot.scaling.addInPlace(new Vector3(60, 60, -60));
      scoreRoot.position.addInPlace(new Vector3(1500, 900, 800));
      scoreRoot.rotation = new Vector3(0, Math.PI / 2, 0);
    }
  } catch (error) {
    console.error("Failed to load model:", error);
    throw error;
  }

  //   meshes.arena!.renderingGroupId = 0;

  scene.clearColor = new Color4(0.1, 0.1, 0.1, 1);
  const gl = new GlowLayer("glow", scene, {
    //adds glow to the emissive materials
    mainTextureSamples: 4,
  });
  gl.intensity = 0.6;

  const scoregl = new GlowLayer("score glow", scene); //score sign glow w/ different settings
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
  const scoremat = scene.getMeshByName("score")?.material as PBRMaterial;
  scoremat.emissiveIntensity = 20;
  const em = scoremat.emissiveIntensity;
  scoremat.emissiveColor = new Color3(1, 0.005, 0);

  const trail = createTrail(meshes.ball, scene, 3);

  type Input = {
    //input object
    up: number;
    left: number;
    down: number;
    right: number;
    reset: number;
    pause: number;
  };

  const input: Input = {
    //these variables are all just flags, they need one per key so we can click several keys at the same time, let them go etc and it all keeps moving smoothly, and for security reasons to prevent hacking attempts + pause and reset ball flags
    up: 0,
    left: 0,
    down: 0,
    right: 0,
    reset: 1,
    pause: 0,
  };

  var isLocked = false;

  // On click event, request pointer lock
  scene.onPointerDown = function (evt) {
    //hide mouse pointer
    if (!isLocked) {
      canvas.requestPointerLock = canvas.requestPointerLock;
      if (canvas.requestPointerLock) {
        canvas.requestPointerLock();
      }
    }
  };

  var pointerlockchange = function () {
    var controlEnabled = document.pointerLockElement || null;

    // If the user is already locked
    if (!controlEnabled) {
      //camera.detachControl(canvas);
      isLocked = false;
    } else {
      //camera.attachControl(canvas);
      isLocked = true;
    }
  };

  document.addEventListener("pointerlockchange", pointerlockchange, false);

  scene.onKeyboardObservable.add((kbInfo) => {
    //keyboard event to change the flags and yes i've tried to make it shorter like 1 switch and for some reason it does not work
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
          case "f":
            if (!input.pause) input.pause = 1;
            else input.pause = 0;
            break;
        }
        break;

      case KeyboardEventTypes.KEYUP: //this is the keyboard event of releasing the key, the above was pressing it
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
          case "f":
            input.pause = input.pause;
            break;
        }
        break;
    }
  });

  let decal: Mesh;
  let reset = 0;
  var decalMaterial = new StandardMaterial("decalMat", scene);
  decalMaterial.diffuseTexture = new Texture(hitCircle_tex, scene);
  decalMaterial.diffuseTexture.hasAlpha = true;
  decalMaterial.useAlphaFromDiffuseTexture = true; 
  decalMaterial.emissiveColor = Color3.Red();
  decalMaterial.zOffset = -2;
  decalMaterial.backFaceCulling = false;
  let decal_alpha = 1;

  scene.registerBeforeRender(function () {
    //the registerBeforeRender function is what updates the scene every frame so the API fetches for the updating of the positions of everything + the score will be called here
    sign_flicker(scoregl, scoremat); //this just flickers the score sign
    //meshes.arena!.updateFacetData();
    if (input.pause) return; //if the game is paused nothing is sent to or returned from update
    gameMath.update(input.up, input.down, input.left, input.right, input.reset); //this is where i send the inputs (only the inputs, no positions of anything, for the aforementioned security reasons). needs to be replaced by an API send. This function is in the pong_logic.ts
    if (meshes.ball) {
      //updating the position of the ball with the returned values
      meshes.ball.position.set(
        gameMath.getState().ball.pos.x, //getState() returns the updated postion of everything
        gameMath.getState().ball.pos.y,
        gameMath.getState().ball.pos.z
        // 10,
        // 10,
        // 10
      );
      //console.log(gameMath.getState().ball.velocity);
      if (gameMath.getState().ball.reset) {
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
    }
    meshes.paddles!.forEach((paddle, index) => {//replace meshes[0] with meshes[i]
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
      else if (paddle.name == "paddle5")
        paddle.position.x = -gameMath.getState().paddles[index].y;
      else paddle.position.x = gameMath.getState().paddles[index].y;
    });
    if (decal) {
      decal.material!.alpha = decal_alpha;
      decal_alpha-=0.02;
	  if(decal.scaling.x>0)
	  	decal.scaling.set(decal.scaling.x-0.005, decal.scaling.y-0.005, decal.scaling.z-0.005);
    }
    if (gameMath.getState().hit) {
      const hitPoint = new Vector3(
        gameMath.getState().hitPoint.pos.x,
        gameMath.getState().hitPoint.pos.y,
        gameMath.getState().hitPoint.pos.z
      );
      const origin = new Vector3(0, 0, 0);
      const rayDirection = origin.subtract(hitPoint).normalize();
      const ray = new Ray(hitPoint, rayDirection, 10);
      const pickInfo = scene.pickWithRay(ray);
      meshes.arena!.isPickable = true;
      if (decal) decal.dispose();
      if (pickInfo) {
        decal = MeshBuilder.CreateDecal("decal", meshes.arena!, {
          position: pickInfo!.pickedPoint!,
          normal: pickInfo!.getNormal(true, true)!,
          size: simmetrical_vec((gameMath.getState().hitPoint.dist)/2),
          cullBackFaces: false,
        });
        decal.material = decalMaterial;
        decal_alpha = 1;
      }
    }
    input.reset = 0;
  });
  //scene.debugLayer.show();
  SceneOptimizer.OptimizeAsync(scene);
  await scene.whenReadyAsync();
  return scene;
}
