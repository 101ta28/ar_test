var modelReady = false;

var vrDisplay;
var vrControls;
var arView;

var canvas;
var camera;
var scene;
var renderer;
var model;

var shadowMesh;
var planeGeometry;
var light;
var directionalLight;

var clock = new THREE.Clock();
var helper;
var vmdIndex = 0;
var MMD_PATH = "/siro/siro_dance_wintercostume_white_v1.1.pmx";
var vmdFiles = [
  {
    name: "repeat",
    file: "/motions/sukiyuki/sukiyuki.vmd",
  },
];
var SCALE = 0.02;

THREE.ARUtils.getARDisplay().then(function (display) {
  if (display) {
    vrDisplay = display;
    init();
  } else {
    THREE.ARUtils.displayUnsupportedMessage();
  }
});

function init() {
  var arDebug = new THREE.ARDebug(vrDisplay);
  document.body.appendChild(arDebug.getElement());

  renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClear = false;
  canvas = renderer.domElement;
  document.body.appendChild(canvas);
  scene = new THREE.Scene();

  arView = new THREE.ARView(vrDisplay, renderer);

  camera = new THREE.ARPerspectiveCamera(
    vrDisplay,
    60,
    window.innerWidth / window.innerHeight,
    vrDisplay.depthNear,
    vrDisplay.depthFar
  );

  vrControls = new THREE.VRControls(camera);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  directionalLight = new THREE.DirectionalLight();
  directionalLight.intensity = 0.3;
  directionalLight.position.set(10, 15, 10);
  directionalLight.castShadow = true;
  light = new THREE.AmbientLight();
  scene.add(light);
  scene.add(directionalLight);

  planeGeometry = new THREE.PlaneGeometry(2000, 2000);
  planeGeometry.rotateX(-Math.PI / 2);

  shadowMesh = new THREE.Mesh(
    planeGeometry,
    new THREE.ShadowMaterial({
      color: 0x111111,
      opacity: 0.15,
    })
  );
  shadowMesh.receiveShadow = true;
  scene.add(shadowMesh);

  var onProgress = function (xhr) {};
  var onError = function (xhr) {
    console.log("load mmd error");
  };

  helper = new THREE.MMDHelper();
  var loader = new THREE.MMDLoader();
  loader.loadModel(
    MMD_PATH,
    function (object) {
      model = object;
      model.children.forEach(function (mesh) {
        mesh.castShadow = true;
      });
      model.scale.set(SCALE, SCALE, SCALE);
      model.position.set(10000, 10000, 10000);
      scene.add(model);

      helper.add(model);
      if (vmdFiles && vmdFiles.length !== 0) {
        function readAnime() {
          var vmdFile = vmdFiles[vmdIndex].file;
          loader.loadVmd(
            vmdFile,
            function (vmd) {
              loader.createAnimation(model, vmd, vmdFiles[vmdIndex].name);
              vmdIndex++;
              if (vmdIndex < vmdFiles.length) {
                readAnime();
              } else {
                helper.setAnimation(model);
                helper.unifyAnimationDuration({ afterglow: 1.0 });
                model.mixer.stopAllAction();
                selectAnimation(model, 0, true);
              }
            },
            onProgress,
            onError
          );
        }
        readAnime();
      }
      modelReady = true;
    },
    onProgress,
    onError
  );

  window.addEventListener("resize", onWindowResize, false);
  canvas.addEventListener("click", spawn, false);

  update();
}

function update() {
  renderer.clearColor();

  arView.render();

  camera.updateProjectionMatrix();

  vrControls.update();
  renderer.clearDepth();
  renderer.render(scene, camera);

  vrDisplay.requestAnimationFrame(update);

  if (modelReady) {
    helper.animate(clock.getDelta());
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function spawn(e) {
  var x = e.clientX / window.innerWidth;
  var y = e.clientY / window.innerHeight;

  var hits = vrDisplay.hitTest(x, y);

  if (!model) {
    console.warn("Model not yet loaded");
    return;
  }

  if (hits && hits.length) {
    var hit = hits[0];

    var matrix = new THREE.Matrix4();
    var position = new THREE.Vector3();
    matrix.fromArray(hit.modelMatrix);
    position.setFromMatrixPosition(matrix);

    shadowMesh.position.y = position.y;

    THREE.ARUtils.placeObjectAtHit(model, hit, 1, true);

    var angle = Math.atan2(
      camera.position.x - model.position.x,
      camera.position.z - model.position.z
    );
    model.rotation.set(0, angle, 0);
  }
}

function selectAnimation(mesh, index, loop) {
  var clip, mclip, action, morph, i;
  i = 2 * index;
  clip = mesh.geometry.animations[i];
  action = mesh.mixer.clipAction(clip);
  mclip = mesh.geometry.animations[i + 1];
  morph = mesh.mixer.clipAction(mclip);
  if (loop) {
    action.repetitions = "Infinity";
    morph.repetitions = "Infinity";
  } else {
    action.repetitions = 0;
    morph.repetitions = 0;
  }
  mesh.mixer.stopAllAction();
  action.play();
  morph.play();
}
