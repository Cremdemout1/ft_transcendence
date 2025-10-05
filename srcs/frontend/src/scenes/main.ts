import * as BABYLON from "babylonjs";
import "babylonjs-loaders";
import { Inspector } from "@babylonjs/inspector";
import HavokPhysics from "@babylonjs/havok";
import model from "@/assets/models/arena.glb"; //arena, paddles and ball models
import city from "@/assets/models/mid_city_separate.glb"; //city model
import score from "@/assets/models/score.glb"; //score sign model
import counter from "@/assets/models/digital_clock_new.glb"; //score counter
import score_unit from "@/assets/models/score_unit.glb"; //score digit
import {
  simmetrical_vec,
  createLight,
  createTrail,
  sign_flicker,
} from "../utils/babylonUtils";
import { GameMath } from "../../../backend/src/game/pong/pong_logic";
import { BaseTexture, int, PointLight } from "babylonjs";
import hitCircle_tex from "../../assets/tex/hit_circle.png";
import pfp from "../../assets/tex/profile_pic.jpg";
import { stick, print_score } from "../utils/scorePrinting";
import { Dispose } from "babylonjs/Misc/dumpTools";

export type GameMeshes = {
  //array of the important meshes (objects/models), obviously will be developed to include all paddles when all their positions are actually being updated
  ball?: BABYLON.Mesh;
  arena?: BABYLON.Mesh;
  paddles?: BABYLON.Mesh[];
  score_title?: BABYLON.Mesh;
  score_counter?: BABYLON.Mesh[];
  score_units?: stick[];
};

function camera_setup(
  scene: BABYLON.Scene,
  player_id: number,
  canvas: HTMLCanvasElement
) {
  const camera = new BABYLON.ArcRotateCamera( //the camera is created here. it's an arc rotate camera, so it looks towards a target (center of the arena), and spins around it on 2 axes.
    "Camera",
    0,
    Math.PI / 2,
    100,
    BABYLON.Vector3.Zero(),
    scene
  );
  camera.lowerRadiusLimit = 70; //how close to the target the camera can get
  camera.upperRadiusLimit = 200; //and how far
  camera.attachControl(canvas, true); //makes controlling the camera with the mouse possible
  camera.fov = 1.5;

  const ratio = canvas.height / canvas.width;
  let camera2 = new BABYLON.ArcRotateCamera( //this is the first extra view (top view). needs to be rotated depending on the player id so the respective paddle shows on the bottom
    "camera",
    0,
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
    0,
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
  camera.layerMask = 0xffffffff;
  camera2.layerMask = 0x10000000;
  camera3.layerMask = 0x10000000;
  scene.activeCameras!.push(camera);
  scene.activeCameras!.push(camera2);
  scene.activeCameras!.push(camera3);
}

export async function createGameScene( //function that makes all the visuals (updates are at the bottom), it takes the engine, the html canvas and the backend calculations object as parameters
  engine: BABYLON.Engine,
  canvas: HTMLCanvasElement,
  gameMath: GameMath
): Promise<BABYLON.Scene> {
  //returns a babylon js scene
  const scene = new BABYLON.Scene(engine);

  //initial call to the API to fetch game information such as how many players there are will go here

  let player_nbr = 6;
  let player_id = 1;

  let sky = BABYLON.CubeTexture.CreateFromPrefilteredData(
    "../../assets/hdris/night_sky2.env",
    scene
  );
  let desert = BABYLON.CubeTexture.CreateFromPrefilteredData(
    "../../assets/hdris/kiara.env",
    scene
  );
  let helper = scene.createDefaultEnvironment({
    groundOpacity: 0,
    createSkybox: true,
    skyboxTexture: sky,
    skyboxSize: 10000,
    environmentTexture: desert,
  });

  const axes = new BABYLON.AxesViewer(scene, 10); //this just shows the world axes, y green, x red, z blue
  //const light = new HemisphericLight("HemiLight", new Vector3(0.5, 1, 0.2), scene);
  //   scene.environmentTexture = desert;
  //   scene.createDefaultSkybox(sky, true, 100000);

  camera_setup(scene, player_id, canvas);

  const groundMat = new BABYLON.StandardMaterial("StandardMaterial", scene); //ground under the city (here i'm creating the material for it first for some reason)
  groundMat.roughness = 0.25;
  groundMat.diffuseColor = BABYLON.Color3.Black();

  const ground = BABYLON.MeshBuilder.CreateGround(
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

  const meshes: GameMeshes = {};
  meshes.paddles = [];
  meshes.score_units = [];
  meshes.score_counter = [];
  //   console.log("Array right after init: ");
  //   console.log(meshes.paddles);
  //   console.log("-------------------------");
  try {
    const result = await BABYLON.SceneLoader.ImportMeshAsync(
      "",
      "",
      model,
      scene
    ); //imports the arena, paddles and ball
    const mainMesh = result.meshes[0]; //mesh 0 which i name mainMesh here is a root mesh that contains all 3 mentioned above
    if (mainMesh) {
      //do rotation here
      //if player= white or black only?
      //mainMesh.rotateAround(simmetrical_vec(0), new Vector3(1,0,0), Math.PI/2);
      mainMesh.scaling = new BABYLON.Vector3(-1, 1, -1);
    }

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
      let mat = mesh.material as BABYLON.Material;
      if (!mat) return;

      if (mesh.name.includes("ball")) {
        mesh.scaling = simmetrical_vec(0.4);
        meshes.ball = mesh as BABYLON.Mesh;
        // let ball_clone=meshes.ball.clone();
        // ball_clone.parent= meshes.ball;
        // ball_clone.scaling=new Vector3(2,2,2);
        // ball_clone.layerMask= 0x10000000;
        // let bigtrail= createTrail(ball_clone, scene, 5);
        // bigtrail!.layerMask = 0x10000000;
      }
      if (mesh.name.includes("arena")) meshes.arena = mesh as BABYLON.Mesh;
      for (let i = 0; i < player_nbr; i++) {
        const paddle_name = "paddle" + (i + 1); //paddle1 will be meshes.paddles[0]
        console.log("paddle_name: " + paddle_name);
        if (
          meshes.paddles &&
          mesh.name.includes(paddle_name) &&
          !mesh.name.includes("border")
        )
          meshes.paddles[i] = mesh as BABYLON.Mesh;
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
        mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
        mat.backFaceCulling = false;

        if (mat instanceof BABYLON.PBRMaterial) {
          mat.alpha = 0.5;
          mat.transparencyMode = 2;
          mat.metallic = 0;
          mat.indexOfRefraction = 1.5;
        }
      }

      if (mat.name.toLowerCase().includes("border")) {
        //borders of the paddles have a different, less transparent material for better visibility
        if (mat instanceof BABYLON.PBRMaterial) {
          mat.alpha = 0.9;
          mat.metallic = 0.9;
        }
      }
      if (mat.name.toLowerCase().includes("gradient")) {
        //arena glass configuration to make it look decent god somebody shoot me please
        mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
        mat.backFaceCulling = false;
        if (mat instanceof BABYLON.PBRMaterial) {
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

        if (mat instanceof BABYLON.StandardMaterial) {
          mat.diffuseColor = mat.diffuseColor.clone();
          mat.alpha = 0.6;
        }
      }
    });
    const bg = await BABYLON.SceneLoader.ImportMeshAsync("", "", city, scene); //importing city model, i want it to be animated later on but first i need to figure out a way to get the materials to look at least close to how they do in blender
    const cityRoot = bg.meshes[0]; //root mesh
    if (cityRoot) {
      cityRoot.scaling.addInPlace(new BABYLON.Vector3(5, 5, 5));
      cityRoot.position.addInPlace(new BABYLON.Vector3(-10, -900, 10));
    }
    const score_sign = await BABYLON.SceneLoader.ImportMeshAsync(
      "",
      "",
      score,
      scene
    ); //importing score sign (i've only modeled the title so far but the score system works i'm just not printing it anywhere)
    const scoreRoot = score_sign.meshes[0]; //root
    if (scoreRoot) {
      meshes.score_title = scoreRoot as BABYLON.Mesh;
      scoreRoot.scaling.addInPlace(new BABYLON.Vector3(60, 60, -60));
      scoreRoot.position.addInPlace(new BABYLON.Vector3(1500, 900, 900));
      scoreRoot.rotation = new BABYLON.Vector3(0, Math.PI / 2, 0);
    }
    const score_counter = await BABYLON.SceneLoader.ImportMeshAsync(
      "",
      "",
      counter,
      scene
    ); //importing score counter
    const counterRoot = score_counter.meshes[0]; //root
    if (counterRoot) {
      meshes.score_counter[0] = counterRoot as BABYLON.Mesh;
      counterRoot.scaling.addInPlace(new BABYLON.Vector3(10, 10, -10));
      counterRoot.position.addInPlace(new BABYLON.Vector3(1600, 100, 1500));
      counterRoot.rotation = new BABYLON.Vector3(0, (Math.PI / 4) * 3, 0);
      meshes.score_counter[1] = meshes.score_counter[0].clone("second", null);
      meshes.score_counter[1].position.z = -1500;
      meshes.score_counter[1].rotation = new BABYLON.Vector3(
        0,
        (Math.PI / 4) * 5,
        0
      );
      meshes.score_counter[1].getChildMeshes().forEach((mesh) => {
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
    }

    const scoreunit = await BABYLON.SceneLoader.ImportMeshAsync(
      "",
      "",
      score_unit,
      scene
    ); //importing score unit
    const unitRoot = scoreunit.meshes[0]; //root
    if (unitRoot) {
      //unitRoot.scaling.addInPlace(new Vector3(10, 10, -10));
      //   unitRoot.position.addInPlace(new Vector3(1500, 500, 300));
      //   unitRoot.rotation = new Vector3(0, Math.PI, 0);
    }

    scoreunit.meshes.forEach((mesh) => {
      console.log(mesh.name);
      if (!mesh.name.includes("root")) return;
      for (let j = 0; j < 2; j++) {
        for (let i = 0; i < player_nbr; i++) {
          const name = "player" + i + "_unit" + j + "_" + mesh.name;
          const par =
            i < 3 ? meshes.score_counter![0] : meshes.score_counter![1];
          const unit = mesh.clone(name, par) as BABYLON.Mesh;
          unit.position.x = -20;
          unit.position.z = j == 0 ? -38 * (i % 3) : -38 * (i % 3) - 15;
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
            console.log(curr_stick);
            console.log(curr_stick.mesh);
            if (onoff == "on") element.isVisible = false;
            meshes.score_units?.push(curr_stick);
          });
        }
      }
    });
    unitRoot.getChildMeshes().forEach((element) => {
      element.isVisible = false;
    });
  } catch (error) {
    console.error("Failed to load model:", error);
    throw error;
  }
  meshes.arena?.rotateAround(
    simmetrical_vec(0),
    new BABYLON.Vector3(0, 1, 0),
    -Math.PI / 2
  );
  //axes.update(simmetrical_vec(0), new BABYLON.Vector3(0,0,-1), new BABYLON.Vector3(0,1,0), new BABYLON.Vector3(1,0,0));

  //   meshes.arena!.renderingGroupId = 0;
  // meshes.arena!.material=scene.getMaterialByName("turned_off");
  // meshes.arena!.material!.backFaceCulling=true
  scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.1, 1);
  const gl = new BABYLON.GlowLayer("glow", scene, {
    //adds glow to the emissive materials
    mainTextureSamples: 4,
  });
  gl.intensity = 0.6;

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
  const scoremat = scene.getMeshByName("score")
    ?.material as BABYLON.PBRMaterial;
  scoremat.emissiveIntensity = 20;
  const em = scoremat.emissiveIntensity;
  scoremat.emissiveColor = new BABYLON.Color3(1, 0.005, 0);

  const countergl = new BABYLON.GlowLayer("counter glow", scene); //counter sign glow w/ different settings
  countergl.customEmissiveColorSelector = function (
    mesh,
    subMesh,
    material,
    result
  ) {
    if (mesh.isVisible == true && mesh.material!.name.includes("turned on")) {
      result.set(1, 0.1, 0, 1);
    } else {
      result.set(0, 0, 0, 0);
    }
  };
  countergl.intensity = 0.1;
  countergl.blurKernelSize = 64;
  const countermat = scene.getMaterialByName(
    "turned on"
  ) as BABYLON.PBRMaterial;
  countermat.emissiveIntensity = 20;
  const emi = countermat.emissiveIntensity;
  countermat.emissiveColor = new BABYLON.Color3(1, 0, 0);

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
      case BABYLON.KeyboardEventTypes.KEYDOWN:
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

      case BABYLON.KeyboardEventTypes.KEYUP: //this is the keyboard event of releasing the key, the above was pressing it
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


  let reset = 0;
//     let decal: BABYLON.Mesh;
//   var decalMaterial = new BABYLON.StandardMaterial("decalMat", scene);
//   decalMaterial.diffuseTexture = new BABYLON.Texture(hitCircle_tex, scene);
//   decalMaterial.diffuseTexture.hasAlpha = true;
//   decalMaterial.useAlphaFromDiffuseTexture = true;
//   decalMaterial.emissiveColor = BABYLON.Color3.Red();
//   decalMaterial.zOffset = -2;
//   decalMaterial.backFaceCulling = false;
//   let decal_alpha = 1;

  let orb: BABYLON.Mesh;
  let orbmaterial = new BABYLON.StandardMaterial("aaa");
  orbmaterial.diffuseColor = BABYLON.Color3.Red();

  const omfg = new BABYLON.HemisphericLight(
    "aaaa",
    new BABYLON.Vector3(0, -1, 0)
  );

  await BABYLON.InitializeCSG2Async();
  let sphereCSG = BABYLON.CSG2.FromMesh(meshes.arena!);
  let boxCSG: BABYLON.CSG2;
  let booleanCSG: BABYLON.CSG2;
  let booleanCSG2: BABYLON.CSG2;
  let newMesh: BABYLON.Mesh;
  let smaller= BABYLON.MeshBuilder.CreateBox("smaller", {size: 99});
  smaller.material=groundMat;
  let newnewMesh: BABYLON.Mesh;
  let sphereCSG2 = BABYLON.CSG2.FromMesh(smaller!);
  smaller!.isVisible=false;

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
        print_score(
          gameMath.getState().scores,
          player_nbr,
          meshes.score_units!
        );
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
    meshes.paddles!.forEach((paddle, index) => {
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
      else if (paddle.name == "paddle5" || paddle.name == "paddle6")
        paddle.position.x = -gameMath.getState().paddles[index].y;
    });
    // if (decal) {
    //   decal.material!.alpha = decal_alpha;
    //   decal_alpha -= 0.02;
    //   if (decal.scaling.x > 0)
    //     decal.scaling.set(
    //       decal.scaling.x - 0.005,
    //       decal.scaling.y - 0.005,
    //       decal.scaling.z - 0.005
    //     );
    // }
    if (gameMath.getState().hit) {
      const hitPoint = new BABYLON.Vector3(
        gameMath.getState().hitPoint.pos.x,
        gameMath.getState().hitPoint.pos.y,
        gameMath.getState().hitPoint.pos.z
      );
      if (orb) orb.dispose();
      orb = BABYLON.MeshBuilder.CreateSphere("orb", { diameter: 30 });

      orb.isVisible = false;
      orb.material = orbmaterial;
      orb.setParent(meshes.arena!);
      orb.position.set(
        gameMath.getState().hitPoint.pos.x,
        gameMath.getState().hitPoint.pos.y,
        gameMath.getState().hitPoint.pos.z
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
	  if(booleanCSG2) booleanCSG2.dispose();
	  booleanCSG2 = boxCSG.subtract(sphereCSG2);
	  if(newnewMesh) newnewMesh.dispose();
	  newnewMesh = booleanCSG2.toMesh("newnewMesh", scene, {
        centerMesh: false,
        materialToUse: orbmaterial,
      });
	  newMesh.dispose();
      const origin = new BABYLON.Vector3(0, 0, 0);
      const rayDirection = origin.subtract(hitPoint).normalize();
      const ray = new BABYLON.Ray(hitPoint, rayDirection, 10);
      const pickInfo = scene.pickWithRay(ray);
      meshes.arena!.isPickable = true;
    //   if (decal) decal.dispose();
    //   if (pickInfo) {
    //     decal = BABYLON.MeshBuilder.CreateDecal("decal", meshes.arena!, {
    //       position: pickInfo!.pickedPoint!,
    //       normal: pickInfo!.getNormal(true, true)!,
    //       size: simmetrical_vec(gameMath.getState().hitPoint.dist / 2),
    //       cullBackFaces: false,
    //     });
    //     decal.material = decalMaterial;
    //     decal_alpha = 1;
    //   }
    }
    input.reset = 0;
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
