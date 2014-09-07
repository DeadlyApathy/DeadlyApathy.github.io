var renderer, camera;
var scene, element;
var ambient, point;
var aspectRatio, windowHalf;

var clock;
var gamespeed;

var difficulty = 1500;
var gameover = false;
var riftCam;
var ydist = 0;
var height = 20;
var foodHeight = 10;
var boundaryHeight = 400;
var cubeTemp;
var sphereTemp;
var boundaryTemp;
var segments = [];
var badFood = [];
var goodFood = [];
var walls = [];
var tailCounter=0;
var bodyPosition;
var spinAxis;
var spinAngle =0;
var viewDir;
var goodFoodMat;
var badFoodMat;
var foodTexture;
var oculusBridge;
var oculusOrientation;
var tailTexture;
var numGoodFoods = 2;
var newBadFoods = 3;
var score;
var playing;
var maxblocks=20;
var badBoxSize = 20;

var j;
// Map for key states
var keys = [];
for(var i = 0; i < 130; i++){
  keys.push(false);
}

function initScene() {
  clock = new THREE.Clock();

  windowHalf = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);
  aspectRatio = window.innerWidth / window.innerHeight;
  
  scene = new THREE.Scene();  

  camera = new THREE.PerspectiveCamera(45, aspectRatio, 1, 10000);
  camera.useQuaternion = true;

  camera.position.set(7, -15, -50);
  camera.lookAt(scene.position);

  // Initialize the renderer
  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setClearColor(0xdbf7ff);
  renderer.setSize(window.innerWidth, window.innerHeight);

  element = document.getElementById('viewport');
  element.appendChild(renderer.domElement);

}


function initGeometry(){
  noise.seed(Math.random());
  
  var maxAnisotropy = 1;
  
  cubeTemp = new THREE.CubeGeometry(foodHeight, foodHeight, foodHeight);
  sphereTemp = new THREE.SphereGeometry(height, height, height);
  icosahedronTemp = new THREE.IcosahedronGeometry(2*height);
  boundaryTemp = new THREE.CubeGeometry(boundaryHeight, boundaryHeight, boundaryHeight);
  // add some segments.
  tailTexture = new THREE.ImageUtils.loadTexture( "ohbaby.jpg" );
  tailTexture.anisotropy = maxAnisotropy;


  boundaryTexture = new THREE.ImageUtils.loadTexture( "yousofine.png" );
  boundaryTexture.anisotropy = maxAnisotropy;

  foodTexture = new THREE.ImageUtils.loadTexture( "illmakeyoumine.jpg" );
  foodTexture.anisotropy = maxAnisotropy;

  var material = new THREE.MeshBasicMaterial({ emissive:0x909090, map: boundaryTexture, color: 0xdbf7ff});
    for(var i = 0; i < 3; i++){
      for(var j = 0; j < 3; j++){
      	for(var k = 0; k < 3; k++){
          if(!(i==1&&j==1&&k==1)){
            var wall = new THREE.Mesh( boundaryTemp, material);
            wall.position.set(i*boundaryHeight, j*boundaryHeight,k*boundaryHeight);
            walls.push(wall);
            scene.add(wall);
          }
        }
      }
    }
  goodFoodMat = new THREE.MeshBasicMaterial({ emissive:0x909090, map: foodTexture, color: 0x12ef24});
  var gFood = new THREE.Mesh( cubeTemp, goodFoodMat);
  gFood.position.set(boundaryHeight*1.25, boundaryHeight,boundaryHeight);
  goodFood.push(gFood);
  scene.add(gFood);

  for(var i=0;i < numGoodFoods-1;i++){
    gFood = new THREE.Mesh( cubeTemp, goodFoodMat);
    var point = genPoint(i*431 + 123);
    gFood.position.set(point.x,point.y,point.z);
    goodFood.push(gFood);
    scene.add(gFood);
  }


  badFoodMat = new THREE.MeshBasicMaterial({ emissive:0x909090, map: foodTexture, color: 0xed2131});
  
}



function init(){
  oculusOrientation= new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI);

  document.addEventListener('keydown', onKeyDown, false);
  document.addEventListener('keyup', onKeyUp, false);


  document.getElementById("hp").addEventListener("click", function(){
    var el = document.getElementById("ht");
    el.style.display = (el.style.display == "none") ? "" : "none";
  });


  spinAxis      = new THREE.Vector3(0, -1, 0);
  bodyPosition  = new THREE.Vector3(boundaryHeight, boundaryHeight, boundaryHeight);
  score = 0;
  gamespeed=4;
  playing = false;

  initScene();
  initGeometry();

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
  quat.setFromAxisAngle(spinAxis, spinAngle);

  var quatCam = new THREE.Quaternion(quatValues.x, quatValues.y, quatValues.z, quatValues.w);

  quat.multiply(quatCam);
  

  // Make a vector pointing along the Z axis and rotate it accoring to the combined look/body angle.
  var xzVector = new THREE.Vector3(0, 0, 1);
  xzVector.applyQuaternion(quat);

  // Compute the X/Z angle based on the combined look/body angle.  This will be used for FPS style movement controls
  // so you can steer with a combination of the keyboard and by moving your head.
  //viewAngle = Math.atan2(xzVector.z, xzVector.x) + Math.PI;

  // Apply the combined look/body angle to the camera.
  camera.quaternion.copy(quat);
  //oculusDeltaOrientation=new THREE.Quaternion(quatValues.x, quatValues.y, quatValues.z, quatValues.w);

  // update the camera position when rendering to the oculus rift.
  camera.position.set(bodyPosition.x, bodyPosition.y, bodyPosition.z);
}



function onKeyDown(event) {

  if(event.keyCode == 82){ // R key.
    var obj, i;
    for(var i = 0; i < segments.length; i++){
      scene.remove(segments[i]);
    }
    for(var i = 0; i < walls.length; i++){
      scene.remove(walls[i]);
    }
    for(var i = 0; i < goodFood.length; i++){
      scene.remove(goodFood[i]);
    }
    for(var i = 0; i < badFood.length; i++){
      scene.remove(badFood[i]);
    }
    segments=[];
    goodFood=[];
    badFood=[];
    ydist = 0;
    score = 0;
    bodyPosition.x=boundaryHeight;
    bodyPosition.y=boundaryHeight;
    bodyPosition.z=boundaryHeight;
    spinAngle=0;
    gameover=false;
    playing=false;
    initScene();
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

  var turn_speed  = (55 * delta) * Math.PI / 180;
  
  // if(keys[87] || keys[38]){ // W or UP
  //     spinAxis.y += turn_speed;
  // }

  // if(keys[83] || keys[40]){ // S or DOWN
  //     spinAxis.z -= turn_speed;
  // }

   if(keys[65] || keys[37]){ // A or LEFT
      spinAngle -= turn_speed;
  }   
  
  if(keys[68] || keys[39]){ // D or RIGHT
      spinAngle += turn_speed;
  }


  if(gameover){
    playing=false;
    document.getElementById("s_l").innerHTML = "YOU LOSE! Score:"+ (score | 0);
  }
  if(playing){
      document.getElementById("s_l").innerHTML = "Score:"+ (score | 0) +"    Speed:" +(gamespeed);
    viewDir= new THREE.Vector3( 0, 0, -1 );
    viewDir.applyQuaternion( camera.quaternion );

    // update the camera position when rendering to the oculus rift.

        
        bodyPosition.x += gamespeed*5*delta*viewDir.x;
        bodyPosition.y += gamespeed*5*delta*viewDir.y;
        bodyPosition.z += gamespeed*5*delta*viewDir.z;
        // if (viewDir.z<0)
        //   gameover=true;
      camera.position.set(bodyPosition.x, bodyPosition.y, bodyPosition.z);
      genTail(delta);
    }


    for(var i = 0; i < segments.length; i++){
      if(segments[i]){
        if(checkCollisionSphere(segments[i].position,bodyPosition,height)){
          gameover=true;
        }
      }
    }

    for(var i = 0; i < walls.length; i++){
      if(walls[i]){
        if(Math.abs(walls[i].position.z-bodyPosition.z) < boundaryHeight/2 &&
          Math.abs(walls[i].position.y-bodyPosition.y) < boundaryHeight/2 &&
          Math.abs(walls[i].position.x-bodyPosition.x)< boundaryHeight/2)
          gameover=true;
        }
    }

    for(var i = 0; i < badFood.length; i++){
      if(badFood[i]){
        if(checkCollisionSphere(badFood[i].position,bodyPosition,badBoxSize)){
          gameover=true;
        }
      }
    }

    for(var i = 0; i < goodFood.length; i++){
      if(goodFood[i]){
        if(checkCollisionBox(goodFood[i].position,bodyPosition,foodHeight)){
          addFoods(goodFood[i]);
          break;
        }
      }
    }
    segments = segments.filter(function(e){return e}); 
}

function addFoods(food){
  //Mod Speed
  score+=100;
  var x = Math.log(1.0 + (score/200.0));
  gamespeed =  15.1 * x / (x+1.0);

  maxblocks +=7;
  var len = goodFood.length;
  for(var i = 0; i < len; i++){
    var thisFood = goodFood.pop();
    if(food === thisFood){
      scene.remove(thisFood);
    }else if(thisFood){
      goodFood.unshift(thisFood)
    }
  }

  //for(var i = 0; i <= numGoodFoods; i++){
    var gFood = new THREE.Mesh( cubeTemp, goodFoodMat);
    var hits = false;
    var yolo = 200;
    var point;
    do{
      hits = false;
      point = genPoint(yolo*420*(1));

      for(var j = 0; j < segments.length; j++){
        if(segments[j]){
          if(checkCollisionSphere(segments[j].position,point,height + foodHeight/2)){
            hits=true;
          }
        }
      }
      for(var j = 0; j < badFood.length; j++){
        if(badFood[j]){
          if(checkCollisionSphere(badFood[j].position,point,badBoxSize + foodHeight/2)){
            hits=true;
          }
        }
      }
      yolo++;
    }
    while(hits);

    gFood.position.set(point.x,point.y,point.z);
    goodFood.push(gFood);
    scene.add(gFood);
 // }
   var count = newBadFoods;
   for(var i = 0; i <= count; i++){
    //TODO: check in body
    var bFood = new THREE.Mesh( icosahedronTemp, badFoodMat);
    var p = genPoint(i*213);

    if(!checkCollisionSphere(p,bodyPosition,10*height)){
      bFood.position.set(p.x,p.y,p.z);
      badFood.push(bFood);
      scene.add(bFood);
    }else{
      count++; 
    }

    
  }
}

function genTail(delta){
  tailCounter+=delta;
  if(tailCounter>.65){
  	  tailCounter=0;
	  if(!(maxblocks>segments.length)){
	  	scene.remove(segments.shift());
	  }
    var material = new THREE.MeshBasicMaterial({ emissive:0x606060, map: tailTexture, color: 0xeee2ff});
    var sphere = new THREE.Mesh( sphereTemp, material);
    sphere.position.set(bodyPosition.x-2*height*viewDir.x,bodyPosition.y-2*height*viewDir.y,bodyPosition.z-2*height*viewDir.z);
    segments.push(sphere);
    scene.add(sphere);
  }
}


///////////////////////////////////////////////////////////////////////////

function genPoint(ding){
  x = boundaryHeight*(1-noise.simplex2(ding*bodyPosition.x,ding*bodyPosition.y)/2.1);
  y = boundaryHeight*(1-noise.simplex2(ding*bodyPosition.y,ding*bodyPosition.z)/2.1);
  z = boundaryHeight*(1-noise.simplex2(ding*bodyPosition.z,ding*bodyPosition.x)/2.1);
  return new THREE.Vector3(x,y,z);
}

function checkCollisionSphere(point, center, radius){
  var dx = center.x - point.x;
  var dy = center.y - point.y;
  var dz = center.z - point.z;

  return dx*dx + dy*dy + dz*dz < radius*radius;
}

function checkCollisionBox(point, boxCenter, length){
  var dx = Math.abs(boxCenter.x - point.x);
  var dy = Math.abs(boxCenter.y - point.y);
  var dz = Math.abs(boxCenter.z - point.z);
  var len = length/2;

  return (dx<len&&dy<len&&dz<len);
}

function animate() {
  var delta = clock.getDelta();

  updateInput(delta);
  
  if(render()){
    requestAnimationFrame(animate);  
  }
}

function render() { 
  try{
      riftCam.render(scene, camera);
  } catch(e){
    console.log(e);
    oculusBridge.disconnect();
    return false;
  }
  return true;
}


window.onload = function() {
  myAudio = new Audio('song.wav'); 
  myAudio.addEventListener('ended', function() {
      this.currentTime = 0;
      this.play();
  }, false);
  myAudio.play();
  init();
  animate();
}
