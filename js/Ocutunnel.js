var renderer, camera;
var scene, element;
var ambient, point;
var aspectRatio, windowHalf;
var mouse, time;

var controls;
var clock;
var gamespeed;

var useRift = true;
var gameover = false;
var riftCam;
var ydist = 0;
var height = 10;
var cubeTemp;
var boxes = [];
var xfreq=1/130;
var zfreq=1/130;
var maxfreq=1/160;
var minfreq=1/200;

var bodyAngle;
var bodyAxis;
var bodyPosition;
var viewAngle;
var viewDir;

var velocity;
var oculusBridge;
var oculusOrientation;
var boxTexture;

var tunnelOffset;
var tunnelTrend;
var score;
var playing;
var maxblocks=8*50;
var j;
// Map for key states
var keys = [];
for(var i = 0; i < 130; i++){
  keys.push(false);
}

function initScene() {
  clock = new THREE.Clock();
  mouse = new THREE.Vector2(0, 0);

  windowHalf = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);
  aspectRatio = window.innerWidth / window.innerHeight;
  
  scene = new THREE.Scene();  

  camera = new THREE.PerspectiveCamera(45, aspectRatio, 1, 10000);
  camera.useQuaternion = true;

  camera.position.set(100, 150, 100);
  camera.lookAt(scene.position);

  // Initialize the renderer
  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setClearColor(0xdbf7ff);
  renderer.setSize(window.innerWidth, window.innerHeight);

   scene.fog = new THREE.Fog(0xdbf7ff, 300, 700);

  element = document.getElementById('viewport');
  element.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera);
}


function initLights(){

  ambient = new THREE.AmbientLight(0x222222);
  scene.add(ambient);

  point = new THREE.DirectionalLight( 0xffffff, 1, 0, Math.PI, 1 );
  point.position.set( -250, 150, 0 );


  scene.add(point);

  var  point2 = new THREE.DirectionalLight( 0xffffff, 1, 0, Math.PI, 1 );
  point2.position.set( 250, -150, 0 );


  scene.add(point2);
}

function initGeometry(){
  noise.seed(Math.random());
  cubeTemp = new THREE.CubeGeometry(height, height, height);
  tunnelTrend= new THREE.Vector3(0, 0, 0);
  tunnelOffset = new THREE.Vector3(0, 0, 0);
  // add some boxes.
  boxTexture = new THREE.ImageUtils.loadTexture( "textures/tiles.png" );

}



function init(){
  oculusOrientation= new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI);

  document.addEventListener('keydown', onKeyDown, false);
  document.addEventListener('keyup', onKeyUp, false);
  document.addEventListener('mousemove', onMouseMove, false);

  document.getElementById("start_button").addEventListener("click", function(){
    playing = true;
  });

  document.getElementById("help").addEventListener("click", function(){
    var el = document.getElementById("help-text");
    el.style.display = (el.style.display == "none") ? "" : "none";
  });

  window.addEventListener('resize', onResize, false);

  time          = Date.now();
  bodyAngle     = 0;
  bodyAxis      = new THREE.Vector3(0, 1, 0);
  bodyPosition  = new THREE.Vector3(10, 100, 0);
  velocity      = new THREE.Vector3();
  score = 1;
  playing = false;

  initScene();
  initGeometry();
  initLights();
  
  oculusBridge = new OculusBridge({
    "debug" : true,
    "onOrientationUpdate" : bridgeOrientationUpdated,
    "onConfigUpdate"      : bridgeConfigUpdated,
    "onConnect"           : bridgeConnected,
    "onDisconnect"        : bridgeDisconnected
  });
  oculusBridge.connect();

  riftCam = new THREE.OculusRiftEffect(renderer);
}


function onResize() {
  if(!useRift){
    windowHalf = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);
    aspectRatio = window.innerWidth / window.innerHeight;
   
    camera.aspect = aspectRatio;
    camera.updateProjectionMatrix();
   
    renderer.setSize(window.innerWidth, window.innerHeight);
  } else {
    riftCam.setSize(window.innerWidth, window.innerHeight);
  }
}


function bridgeConnected(){
  document.getElementById("logo").className = "";
}

function bridgeDisconnected(){
  document.getElementById("logo").className = "offline";
}

function bridgeConfigUpdated(config){
  console.log("Oculus config updated.");
  riftCam.setHMD(config);      
}

function bridgeOrientationUpdated(quatValues) {
  // Do first-person style controls (like the Tuscany demo) using the rift and keyboard.

  // TODO: Don't instantiate new objects in here, these should be re-used to avoid garbage collection.

  // make a quaternion for the the body angle rotated about the Y axis.
  var quat = new THREE.Quaternion();
  quat.setFromAxisAngle(bodyAxis, bodyAngle);

  // make a quaternion for the current orientation of the Rift
  var quatCam = new THREE.Quaternion(quatValues.x, quatValues.y, quatValues.z, quatValues.w);

  //if (oculusDeltaOrientation==null){
   //oculusDeltaOrientation=new THREE.Quaternion(quatValues.x, quatValues.y, quatValues.z, quatValues.w)
    // var x = quatCam.multiply(oculusDeltaOrientation.inverse());
    // console.log("HI! ("+x.x+","+x.y+","+x.z+","+x.w+")");
 // }
  //QTransition = QFinal * QInitial^{-1}
  //Old value = oculusDeltaOrientation
  //New Value quatCam
  // var delta = quatCam.multiply(oculusDeltaOrientation.inverse());//delta quat
  // console.log("Aw?! ("+delta.x+","+delta.y+","+delta.z+","+delta.w+")");
  //oculusDeltaOrientation = quatCam;
  //var delta = oculusDeltaOrientation.multiply(quatCam.inverse());//delta quat
  // multiply the body rotation by the Rift rotation.
  //oculusOrientation = oculusOrientation.normalize();
  // oculusOrientation = oculusOrientation.multiply(delta);
  quat.multiply(quatCam);
  

  // Make a vector pointing along the Z axis and rotate it accoring to the combined look/body angle.
  var xzVector = new THREE.Vector3(0, 0, 1);
  xzVector.applyQuaternion(quat);

  // Compute the X/Z angle based on the combined look/body angle.  This will be used for FPS style movement controls
  // so you can steer with a combination of the keyboard and by moving your head.
  viewAngle = Math.atan2(xzVector.z, xzVector.x) + Math.PI;

  // Apply the combined look/body angle to the camera.
  camera.quaternion.copy(quat);
  //oculusDeltaOrientation=new THREE.Quaternion(quatValues.x, quatValues.y, quatValues.z, quatValues.w);

  // update the camera position when rendering to the oculus rift.
  if(useRift) {
    camera.position.set(bodyPosition.x, bodyPosition.y, bodyPosition.z);
  }
}


function onMouseMove(event) {
  mouse.set( (event.clientX / window.innerWidth - 0.5) * 2, (event.clientY / window.innerHeight - 0.5) * 2);
}


// function onMouseDown(event) {
//   // Stub
//   console.log("update.");
// }


function onKeyDown(event) {

  if(event.keyCode == 48){ // zero key.
    useRift = !useRift;
    onResize();
  }
  if(event.keyCode == 82){ // R key.
    var obj, i;
    for(var i = 0; i < boxes.length; i++){
      scene.remove(boxes[i]);
    }
    boxes=[];
    ydist = 0;
    score = 0;
    bodyPosition.x=10;
    bodyPosition.y=15;
    bodyPosition.z=0;
    gameover=false;
    playing=false;
    initGeometry();
  }
  

  // prevent repeat keystrokes.
  if(event.keyCode ==32){ // Spacebar to start
    playing=true;
  }

  keys[event.keyCode] = true;
}


function onKeyUp(event) {
  keys[event.keyCode] = false;
}


function updateInput(delta) {

  var step        = 25 * delta;
  var turn_speed  = (55 * delta) * Math.PI / 180;
  
  genTunnel();

  if(gameover){
    playing=false;
    document.getElementById("score_label").innerHTML = "GAME OVER! Score: "+ (score | 0);
  }
  if(playing){
      score += delta;
      document.getElementById("score_label").innerHTML = "Score: "+ (score | 0);
    viewDir= new THREE.Vector3( 0, 0, -1 );
    viewDir.applyQuaternion( camera.quaternion );



    if(keys[87] || keys[38]){ // W or UP
      viewAngle += turn_speed;
  }

  if(keys[83] || keys[40]){ // S or DOWN
      viewAngle -= turn_speed;
  }

   if(keys[65] || keys[37]){ // A or LEFT
      bodyAngle -= turn_speed;
  }   
  
  if(keys[68] || keys[39]){ // D or RIGHT
      bodyAngle += turn_speed;
  }

   if(keys[81]){ // E
      bodyAngle += turn_speed;
  }   
  
  if(keys[69]){ // Q
       bodyAngle -= turn_speed;
  }
    
    
    
    // update the camera position when rendering to the oculus rift.
    if(useRift) {

        gamespeed=Math.log(score);
        bodyPosition.x += gamespeed*5*delta*viewDir.x;
        bodyPosition.y += gamespeed*5*delta*viewDir.y;
        bodyPosition.z += gamespeed*5*delta*viewDir.z;
        if (viewDir.z<0)
          gameover=true;
      camera.position.set(bodyPosition.x, bodyPosition.y, bodyPosition.z);
    }
    for(var i = 0; i < boxes.length; i++){
      if(
