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
var height = 10;
var cubeTemp;
var boxes = [];
var xfreq=1/130;
var zfreq=1/130;
var maxfreq=1/160;
var minfreq=1/200;

var bodyPosition;
var spinAxis;
var spinAngle =0;
//var viewAngle;
var viewDir;
//var reseted=false;


var oculusBridge;
var oculusOrientation;
//var oculusDeltaOrientation=null;
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
  tunnelTrend = new THREE.Vector3(0, 0, 0);

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
  cubeTemp = new THREE.CubeGeometry(height, height, height);
  tunnelOffset = new THREE.Vector3(0, 0, 0);
  // add some boxes.
  boxTexture = new THREE.ImageUtils.loadTexture( "t.png" );

}



function init(){
  oculusOrientation= new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI);

  document.addEventListener('keydown', onKeyDown, false);
  document.addEventListener('keyup', onKeyUp, false);


  document.getElementById("hp").addEventListener("click", function(){
    var el = document.getElementById("ht");
    el.style.display = (el.style.display == "none") ? "" : "none";
  });


  spinAxis      = new THREE.Vector3(0, 0, 1);
  bodyPosition  = new THREE.Vector3(10, 15, 10);
  score = 1;
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

  // make a quaternion for the current orientation of the Rift
  var quatCam = new THREE.Quaternion(quatValues.x, quatValues.y, quatValues.z, quatValues.w);

  //if (oculusDeltaOrientation==null){
    //oculusDeltaOrientation=new THREE.Quaternion(quatValues.x, quatValues.y, quatValues.z, quatValues.w)
    // var x = quatCam.multiply(oculusDeltaOrientation.inverse());
    // console.log("HI! ("+x.x+","+x.y+","+x.z+","+x.w+")");
  //}
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
    for(var i = 0; i < boxes.length; i++){
      scene.remove(boxes[i]);
    }
    boxes=[];
    ydist = 0;
    score = 1;
    bodyPosition.x=10;
    bodyPosition.y=15;
    bodyPosition.z=10;
    spinAngle=0;
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

  var turn_speed  = (55 * delta) * Math.PI / 180;
  
  genTunnel();
      spinAngle -= Math.log(score)*turn_speed/20;
  // if(keys[87] || keys[38]){ // W or UP
  //     spinAngle += turn_speed;
  // }

  // if(keys[83] || keys[40]){ // S or DOWN
  //     spinAngle -= turn_speed;
  // }

  //  if(keys[65] || keys[37]){ // A or LEFT
  //     bodyAngle -= turn_speed;
  // }   
  
  // if(keys[68] || keys[39]){ // D or RIGHT
  //     bodyAngle += turn_speed;
  // }


  if(gameover){
    playing=false;
    document.getElementById("s_l").innerHTML = "LOST pnts:"+ (score | 0);
  }
  if(playing){
      score += delta;
      document.getElementById("s_l").innerHTML = "pnts"+ (score | 0);
    viewDir= new THREE.Vector3( 0, 0, -1 );
    viewDir.applyQuaternion( camera.quaternion );

    // update the camera position when rendering to the oculus rift.

        gamespeed=Math.log(score);
        bodyPosition.x += gamespeed*5*delta*viewDir.x;
        bodyPosition.y += gamespeed*5*delta*viewDir.y;
        bodyPosition.z += gamespeed*5*delta*viewDir.z;
        if (viewDir.z<0)
          gameover=true;
      camera.position.set(bodyPosition.x, bodyPosition.y, bodyPosition.z);
    }
    // if((score|0)%10==0 && !reseted){
    //   ydist=0;
    //   tunnelTrend.x=tunnelOffset.x;
    //   tunnelTrend.z=tunnelOffset.z;
    //   reseted=true;
    // }
    // if((score|0)%10==1 && reseted){
    //   reseted=false;
    // }

    for(var i = 0; i < boxes.length; i++){
      if(boxes[i]){
        if(Math.abs(boxes[i].position.z-bodyPosition.z) < height/2 &&
          Math.abs(boxes[i].position.y-bodyPosition.y) < height/2 &&
          Math.abs(boxes[i].position.x-bodyPosition.x)< height/2)
          gameover=true;
        }
        if(boxes[i].position.z-bodyPosition.z <-10){
          scene.remove(boxes[i]);
          boxes[i]=null;
        }
    }
    boxes = boxes.filter(function(e){return e}); 
}

function newFrequency(freqencyIn, deltaRate){
  frequencyOut = freqencyIn + noise.simplex2(ydist,ydist)*deltaRate;
  if (frequencyOut > maxfreq)
      frequencyOut = maxfreq;

  if (frequencyOut < minfreq)
      frequencyOut = minfreq;

  return frequencyOut;
}

function genTunnel(){
  while ((maxblocks-boxes.length)>8){
    //freq=(freq+noise.simplex2(ydist,ydist)/13.37);
    xfreq=newFrequency(xfreq, 1/10000);
    zfreq=newFrequency(zfreq, 1/10000);

    if(ydist%difficulty==0){
      //console.log(ydist);
      tunnelTrend.x=tunnelOffset.x-Math.cos(((ydist%difficulty)+10)*xfreq)*height*5;
      tunnelTrend.z=tunnelOffset.z-Math.sin(((ydist%difficulty)+10)*zfreq)*height*5;
    }

    tunnelOffset.x=tunnelTrend.x+Math.cos(((ydist%difficulty)+10)*xfreq)*height*5;
    tunnelOffset.z=tunnelTrend.z+Math.sin(((ydist%difficulty)+10)*zfreq)*height*5;


    var randcolor= "#"+((1<<24)*(1.0+noise.simplex2(ydist,ydist))/2.0|0).toString(16);
    var material = new THREE.MeshBasicMaterial({ emissive:0x606060, map: boxTexture, color: randcolor});
        for(var i = 0; i < 3; i++){
      for(var j = 0; j < 3; j++){
          if(i*j!=1){
            var box = new THREE.Mesh( cubeTemp, material);
            box.position.set(i*height+tunnelOffset.x, (1+2*j)*height/2+tunnelOffset.z ,ydist);
            boxes.push(box);
            scene.add(box);
          }
      }
    }

    ydist +=height;

    j++;

  }
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
