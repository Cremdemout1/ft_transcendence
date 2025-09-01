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
} from "@babylonjs/core";
import arenaModel from "@/assets/models/transcendence_full.glb";
import city from "@/assets/models/mid_city.glb";
import { simmetrical_vec } from "../babylonUtils";
import { GameMath } from "../../../backend/src/game/pong/pong_logic";

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

function createTrail(ball: Mesh | undefined, scene: Scene) {
  let options = {
    diameter: 2,
    length: 25,
    segments: 10,
    sections: 4,
    doNotTaper: false,
    autoStart: true,
  };

  if (ball) {
    const trail = new TrailMesh("trail", ball, scene, options);
    let sourceMat = new StandardMaterial("sourceMat", scene);
    let color = Color3.Purple();
    sourceMat.emissiveColor = sourceMat.diffuseColor = color;
    sourceMat.specularColor = Color3.Black();
    trail.material = sourceMat;
    trail.start();
    return trail;
  }
  return null;
}

export async function createGameScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  gameMath: GameMath
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

  //   var skybox = Mesh.CreateBox("skyBox", 3000.0, scene);
  //     var skyboxMaterial = new StandardMaterial("skyBox", scene);
  //     skyboxMaterial.backFaceCulling = false;
  //     skyboxMaterial.reflectionTexture = new CubeTexture("srcs/frontend/assets/hdris/sky", scene);
  //     skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
  //     skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
  //     skyboxMaterial.specularColor = new Color3(0, 0, 0);
  //     skybox.material = skyboxMaterial;

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
      //mainMesh.scaling.addInPlace(new Vector3(100, 100, -100));
      //mainMesh.position.addInPlace(new Vector3(-10, 10, 10));
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
      //forEach player (API call)

      if (mat.name.toLowerCase().includes("glass")) {
        mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
        mat.backFaceCulling = false;

        if (mat instanceof PBRMaterial) {
          mat.alpha = 0.4;
          // mat.needDepthPrePass =true;
          mat.transparencyMode = 2;
          mat.metallic = 0.3;
          mat.indexOfRefraction = 1.5;
        }
      }
      if (mat.name.toLowerCase().includes("gradient")) {
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

  const trail = createTrail(meshes.ball, scene);


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
    pause: 0,
  };

  var isLocked = false;

  // On click event, request pointer lock
  scene.onPointerDown = function (evt) {
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
          case "f":
            input.pause = input.pause;
            break;
        }
        break;
    }
  });

  scene.registerBeforeRender(function () {
    if (input.pause) return;
    gameMath.update(input.up, input.down, input.left, input.right, input.reset);
    if (meshes.ball) {
      meshes.ball.position.set(
        gameMath.getState().ball.x,
        gameMath.getState().ball.y,
        gameMath.getState().ball.z
      );
      if (gameMath.getState().ball.reset) {
        if (trail) {
          trail.reset();
          console.log("RESET!");
        }
      }
    }
    if (meshes.paddle1) {
      //red paddle
      // console.log("x before: "+ meshes.paddle1.position.z);
      meshes.paddle1.position.z = -gameMath.getState().paddle.x; //z is x for this paddle

      //console.log("x after: "+ meshes.paddle1.position.z);
      // console.log("y before: "+ meshes.paddle1.position.y);
      meshes.paddle1.position.y = gameMath.getState().paddle.y;
      //console.log("y after: "+ meshes.paddle1.position.y);
    }
  });

  await SceneOptimizer.OptimizeAsync(scene);
  await scene.whenReadyAsync();

  return scene;
}
