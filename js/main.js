var mesh, camera, scene, renderer, effect;
var helper;

var ready = false;

var context;
var source;
var controls, marker;

var audio;

var clock = new THREE.Clock();

init();

function init() {
  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.domElement.style.position = "absolute";
  document.body.appendChild(renderer.domElement);

  effect = new THREE.OutlineEffect(renderer);

  camera = new THREE.Camera();
  scene.add(camera);

  var light = new THREE.DirectionalLight(0xffffff);
  light.position.set(-20, 20, 20);
  scene.add(light);

  function onResize() {
    source.onResizeElement();
    source.copyElementSizeTo(renderer.domElement);

    if (context.arController !== null) {
      source.copyElementSizeTo(context.arController.canvas);
    }
  }

  source = new THREEx.ArToolkitSource({
    sourceType: "webcam",
  });
  source.init(function onReady() {
    onResize();
  });

  context = new THREEx.ArToolkitContext({
    debug: false,
    cameraParametersUrl:
      THREEx.ArToolkitContext.baseURL + "../data/data/camera_para.dat",
    detectionMode: "mono",
    imageSmoothingEnabled: true,
    maxDetectionRate: 60,
    canvasWidth: source.parameters.sourceWidth,
  });

  context.init(function onCompleted() {
    camera.projectionMatrix.copy(context.getProjectionMatrix());
  });

  window.addEventListener("resize", function () {
    onResize();
  });

  marker = new THREE.Group();
  controls = new THREEx.ArMarkerControls(context, marker, {
    barcodeValue: "siro",
    type: "pattern",
    patternUrl: "/data/pattern-siro.patt",
  });
  scene.add(marker);

  function onProgress(xhr) {
    if (xhr.lengthComputable) {
      var percentComplete = (xhr.loaded / xhr.total) * 100;
      console.log(Math.round(percentComplete, 2) + "% downloaded");
    }
  }

  function onError(xhr) {}

  var modelFile = "/siro/siro_dance_wintercostume_white_v1.1.pmx";

  var vmdFiles = ["/motions/sukiyuki/sukiyuki.vmd"];

  var audioFile = "/audio/sukiyuki.mp3";
  var audioParams = { delayTime: 0 };

  helper = new THREE.MMDAnimationHelper({
    afterglow: 2.0,
  });

  new THREE.MMDLoader().loadWithAnimation(
    modelFile,
    vmdFiles,
    function (mmd) {
      mesh = mmd.mesh;

      var model = new THREE.Object3D();
      model.scale.x = 0.1;
      model.scale.y = 0.1;
      model.scale.z = 0.1;
      model.add(mesh);

      helper.add(mesh, {
        animation: mmd.animation,
        physics: true,
      });

      marker.add(model);

      new THREE.AudioLoader().load(audioFile, function (buffer) {
        var listener = new THREE.AudioListener();
        var audio = new THREE.Audio(listener).setBuffer(buffer);

        listener.position.z = 1;

        helper.add(audio, audioParams);
        marker.add(listener);

        // Music Load Flag
        ready = true;
      });
      ready = true;
    },
    onProgress,
    onError
  );
}

setInterval(function () {
  if (source.ready === false) {
    return;
  }

  if (ready) {
    helper.update(clock.getDelta());
  }

  renderer.render(scene, camera);
  context.update(source.domElement);
}, 1000 / 60);
