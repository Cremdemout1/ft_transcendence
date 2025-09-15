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
} from "@babylonjs/core";

import { Inspector } from "@babylonjs/inspector";
import HavokPhysics from "@babylonjs/havok";
import model from "@/assets/models/transcendence_big.glb";//arena, paddles and ball models
import city from "@/assets/models/mid_city.glb";//city model
import score from "@/assets/models/score.glb";//score sign model
import { simmetrical_vec } from "../babylonUtils";
import { GameMath } from "../../../backend/src/game/pong/pong_logic";
import { PointLight } from "babylonjs";

function createLight(//this function just creates a rectangular area light (right now none are being used in the scene)
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

function createTrail(ball: Mesh | undefined, scene: Scene, diameter: number) {//this function creates a trail such as the one on the ball
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

function sign_flicker(gl: GlowLayer, scoremat: PBRMaterial) {//helper function to make the light on the score sign flicker
  const t = performance.now() * 0.003;
  const base = 0.3;
  const flicker = base + 0.3 * Math.sin(t * 20) + Math.random() * 0.1;
  gl.intensity = flicker;
  scoremat.emissiveIntensity = flicker * 20 + 50;
}

export async function createGameScene(//function that makes all the visuals (updates are at the bottom), it takes the engine, the html canvas and the backend calculations object as parameters
  engine: Engine,
  canvas: HTMLCanvasElement,
  gameMath: GameMath
): Promise<Scene> {//returns a babylon js scene
  const scene = new Scene(engine);

  scene.createDefaultEnvironment({//i just use this to give random reflections to the arena glass
    groundOpacity: 0,
    createSkybox: false,
  });

  //With the cameras keep in mind right now it is as if the player is the RED PADDLE
  const camera = new ArcRotateCamera(//the camera is created here. it's an arc rotate camera, so it looks towards a target (center of the arena), and spins around it on 2 axes. needs to be rotated after creation based on player id so it starts facing the correct paddle
    "Camera",
    0,
    Math.PI / 2,
    100,
    Vector3.Zero(),
    scene
  );
  camera.lowerRadiusLimit = 70;//how close to the target the camera can get
  camera.upperRadiusLimit = 200;//and how far
  camera.attachControl(canvas, true);//makes controlling the camera with the mouse possible
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
  camera3.mode = Camera.ORTHOGRAPHIC_CAMERA;//these views are ortographic
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

  //   const light = new HemisphericLight("light1", new Vector3(-1, 1, 0), scene);
  //   light.diffuse = new Color3(0.71, 0.56, 1);
  //   light.specular = new Color3(1, 0.64, 0.93);
  //   light.groundColor = new Color3(0.2, 0.23, 0.47);

  //   const hk = new HavokPlugin(true, await havokModule);
  //     scene.enablePhysics(new Vector3(0, 0, 0), hk);
  //     let physEngine = scene.getPhysicsEngine();

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

  const groundMat = new StandardMaterial("StandardMaterial", scene);//ground under the city (here i'm creating the material for it first for some reason)
  groundMat.roughness = 0.25;
  groundMat.diffuseColor = Color3.Black();

  const ground = MeshBuilder.CreateGround(//creates the ground
    "ground",
    { width: 1000, height: 1000 },
    scene
  );
  ground.position.y -= 1000;
  ground.material = groundMat;//this assigns the material

  //   var skybox = Mesh.CreateBox("skyBox", 3000.0, scene);
  //     var skyboxMaterial = new StandardMaterial("skyBox", scene);
  //     skyboxMaterial.backFaceCulling = false;
  //     skyboxMaterial.reflectionTexture = new CubeTexture("srcs/frontend/assets/hdris/sky", scene);
  //     skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
  //     skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
  //     skyboxMaterial.specularColor = new Color3(0, 0, 0);
  //     skybox.material = skyboxMaterial;

  type GameMeshes = {//array of the important meshes (objects/models), obviously will be developed to include all paddles when all their positions are actually being updated
    ball?: Mesh;
    arena?: Mesh;
    paddle1?: Mesh;
    paddle2?: Mesh;
    score_title?: Mesh;
  };
  const meshes: GameMeshes = {};

  try {
    const result = await SceneLoader.ImportMeshAsync("", "", model, scene);//imports the arena, paddles and ball
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
      if (
        mesh.name.includes("ball") ||
        mesh.name.includes("paddle") ||
        mesh.name.includes("arena")
      ) {
        mesh.layerMask = 0x10000000;//this is for attributing a specific rendering order to make the transparency work properly
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
      if (mesh.name.includes("paddle2")) meshes.paddle1 = mesh as Mesh;
      if (mesh.name.includes("paddle3")) meshes.paddle2 = mesh as Mesh;
      //forEach player (API call)

      if (mat.name.toLowerCase().includes("glass")) {//trying to make the paddle glass material look translucid but still have a solid color and be a bit foggy/rough
        mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
        mat.backFaceCulling = false;

        if (mat instanceof PBRMaterial) {
          mat.alpha = 0.5;
          // mat.needDepthPrePass =true;
          mat.transparencyMode = 2;
          mat.metallic = 0;
          mat.indexOfRefraction = 1.5;
        }
      }

      if (mat.name.toLowerCase().includes("border")) {//borders of the paddles have a different, less transparent material for better visibility
        if (mat instanceof PBRMaterial) {
          mat.alpha = 0.9;
          mat.metallic = 0.9;
        }
      }
      if (mat.name.toLowerCase().includes("gradient")) {//arena glass configuration to make it look decent god somebody shoot me please
        mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
        mat.backFaceCulling = false;
        if (mat instanceof PBRMaterial) {
          mat.albedoColor = mat.albedoColor.clone();
          mat.alpha = 0.2;
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
          mat.stencil.enabled = true;
          mat.stencil.func = Engine.ALWAYS;
          mat.stencil.funcRef = 1;
          mat.stencil.funcMask = 0xff;
          mat.stencil.opStencilFail = Engine.KEEP;
          mat.stencil.opStencilFail = Engine.KEEP;
          mat.stencil.opStencilDepthPass = Engine.REPLACE;
          mat.stencil.mask = 0xff;
        }

        if (mat instanceof StandardMaterial) {
          mat.diffuseColor = mat.diffuseColor.clone();
          mat.alpha = 0.6;
        }
      }
    });
    const bg = await SceneLoader.ImportMeshAsync("", "", city, scene);//importing city model, i want it to be animated later on but first i need to figure out a way to get the materials to look at least close to how they do in blender
    const cityRoot = bg.meshes[0]; //root mesh
    if (cityRoot) {
      cityRoot.scaling.addInPlace(new Vector3(5, 5, 5));
      cityRoot.position.addInPlace(new Vector3(-10, -900, 10));
      // bg.meshes.forEach((mesh) => {
      // mesh.layerMask= 0x10000000;
      // });
    }
    const score_sign = await SceneLoader.ImportMeshAsync("", "", score, scene);//importing score sign (i've only modeled the title so far but the score system works i'm just not printing it anywhere)
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

  meshes.arena!.renderingGroupId = 0;

  scene.clearColor = new Color4(0.1, 0.1, 0.1, 1);
  const gl = new GlowLayer("glow", scene, {//adds glow to the emissive materials
    mainTextureSamples: 4,
  });
  gl.intensity = 0.6;

  const scoregl = new GlowLayer("score glow", scene);//score sign glow w/ different settings
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

  type Input = {//input object
    up: number;
    left: number;
    down: number;
    right: number;
    reset: number;
    pause: number;
  };

  const input: Input = {//these variables are all just flags, they need one per key so we can click several keys at the same time, let them go etc and it all keeps moving smoothly, and for security reasons to prevent hacking attempts + pause and reset ball flags
    up: 0,
    left: 0,
    down: 0,
    right: 0,
    reset: 0,
    pause: 0,
  };

  var isLocked = false;

  //   const spot_light = new SpotLight("spotLight", new Vector3(meshes.ball?.position.x, meshes.ball?.position.y, meshes.ball?.position.z), new Vector3(0, -1, 0), Math.PI / 2, 10, scene);
  //   spot_light.diffuse = new Color3(1, 0, 0);

  //   var ground2 = MeshBuilder.CreateGround("ground", {width: 400, height: 400}, scene);
  //   ground2.position.y=-100;
  //   ground2.material= new StandardMaterial("ground2");
  //   ground2.material.alpha=0.8;

  // On click event, request pointer lock
  scene.onPointerDown = function (evt) {//hide mouse pointer
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

  scene.onKeyboardObservable.add((kbInfo) => {//keyboard event to change the flags and yes i've tried to make it shorter like 1 switch and for some reason it does not work
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

      case KeyboardEventTypes.KEYUP://this is the keyboard event of releasing the key, the above was pressing it
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

  let hitCircle: Mesh;//hit circle is (will be eventually, it's still not correct, and it's lagging because rn it's a light, i'm trying to make it a mesh)
  let reset = 0;
  //createLight(simmetrical_vec(0), simmetrical_vec(0), Color3.White(), "a", scene);

  scene.registerBeforeRender(function () {//the registerBeforeRender function is what updates the scene every frame so the API fetches for the updating of the positions of everything + the score will be called here
    sign_flicker(scoregl, scoremat);//this just flickers the score sign
    meshes.arena!.updateFacetData();
    if (input.pause) return;//if the game is paused nothing is sent to or returned from update
    gameMath.update(input.up, input.down, input.left, input.right, input.reset);//this is where i send the inputs (only the inputs, no positions of anything, for the aforementioned security reasons). needs to be replaced by an API send. This function is in the pong_logic.ts
    if (meshes.ball) {//updating the position of the ball with the returned values
      meshes.ball.position.set(
        gameMath.getState().ball.x,//getState() returns the updated postion of everything
        gameMath.getState().ball.y,
        gameMath.getState().ball.z
        // 10,
        // 10,
        // 10
      );
      //console.log(gameMath.getState().ball.velocity);
      if (gameMath.getState().ball.reset) {//need to reset the trail before putting the ball back in the center
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
    if (meshes.paddle1) {//moving the paddle mesh to the updated poisition (this will be a for loop with all the paddles after merging)
      //replace with FOREACH WHERE ACTIVE=1
      //red paddle
      // console.log("x before: "+ meshes.paddle1.position.z);
      meshes.paddle1.position.z = gameMath.getState().paddles[0].x; //z is x for this paddle

      //console.log("x after: "+ meshes.paddle1.position.z);
      // console.log("y before: "+ meshes.paddle1.position.y);
      meshes.paddle1.position.y = gameMath.getState().paddles[0].y;
      //console.log("y after: "+ meshes.paddle1.position.y);
    }
    let options_hit = {
      diameter: 10,
    };
    if (gameMath.getState().hit) {
      if (hitCircle) hitCircle.dispose();//projecting the hitting spot of the ball on the arena walls (DOESN'T WORK, RIGHT NOW IT'S JUST A LIGHT SPHERE ON THE POINT)
      hitCircle = MeshBuilder.CreateSphere("hit", options_hit);
      let hitMat = new PBRMaterial("hitMat");
      hitMat._albedoColor = Color3.Red();
      hitMat.ambientColor = Color3.Red();
      hitMat.metallic = 0;
      hitMat.disableLighting = true;
      hitMat.emissiveColor = new Color3(1, 0, 0);

      hitCircle.material = hitMat;
      hitCircle.renderingGroupId = 1;
      hitCircle.position.set(
        gameMath.getState().hitPoint.x,
        gameMath.getState().hitPoint.y,
        gameMath.getState().hitPoint.z
        // 10,
        // 10,
        // 10
      );
      if (hitMat) {//trying to make a circle from the intersection of the sphere mesh with the arena mesh
        hitMat.stencil.enabled = true;
        hitMat.stencil.func = Engine.EQUAL;
        hitMat.stencil.funcRef = 1;
        hitMat.stencil.funcMask = 0xff;
        hitMat.stencil.opStencilFail = Engine.KEEP;
        hitMat.stencil.opStencilFail = Engine.KEEP;
        hitMat.stencil.opStencilDepthPass = Engine.KEEP;
        hitMat.stencil.mask = 0xff;
      }
    }
  });

  SceneOptimizer.OptimizeAsync(scene);
  await scene.whenReadyAsync();
  return scene;
}
