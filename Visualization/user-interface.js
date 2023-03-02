

let InitializeCanvas = function() {
    const canvas = document.getElementById("render-canvas");
    const engine = new BABYLON.Engine(canvas, true);

    // Scene:
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0.1,0.1,0.1);
    
    // Camera:
    const camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, 10, new BABYLON.Vector3(0, 0, 0));
    camera.setPosition(new BABYLON.Vector3(0, 45, 120)); 
    camera.setTarget(BABYLON.Vector3.Zero());
    camera.attachControl(canvas, true);

    // Lights:
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0));
    light.intensity = 0.7;

    // Materials:
    var redMat = new BABYLON.StandardMaterial("redMat");
    redMat.emissiveColor = new BABYLON.Color3(0, 1, 1);

    // Post Processing:
    const glow = new BABYLON.GlowLayer("glow");

    // Geometry:
    // - Grid: 
    let size = 45;
    let lines = BABYLON.MeshBuilder.CreateLines("lines", {
        points: [
            new BABYLON.Vector3(-size, 0, -size),
            new BABYLON.Vector3(-size, 0, size),
            new BABYLON.Vector3(size, 0, size),
            new BABYLON.Vector3(size, 0, -size),
            new BABYLON.Vector3(-size, 0, -size)
        ]
    });

    // References: 
    App.$data.State.Canvas = canvas;
    App.$data.State.Engine = engine;
    App.$data.State.Scene = scene;
};

let SetupCallbacks = function() {
    App.$data.State.Engine.runRenderLoop(() => {
        App.$data.State.Scene.render();
      });
    
    window.addEventListener("resize", () => {
        App.$data.State.Engine.resize();
    });

    App.$data.State.Scene.onPointerObservable.add(_pointerCallback);
};

let _pointerCallback = function(pointerInfo) {
    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERUP) {

        if (pointerInfo.event.button == 2) {
            let position = null;    

            let pickinfo = App.$data.State.Scene.pick(App.$data.State.Scene.pointerX, App.$data.State.Scene.pointerY);
            if (pickinfo.hit) {
                position = pickinfo.pickedPoint;
            } else {
                let distance = 120.0;
                position = new BABYLON.Vector3(
                    pickinfo.ray.origin.x + pickinfo.ray.direction.x * distance,
                    pickinfo.ray.origin.y + pickinfo.ray.direction.y * distance,
                    pickinfo.ray.origin.z + pickinfo.ray.direction.z * distance
                );
            }

            if (position != null) {
                App.$data.State.Points.push(position);
            }
        }
    }
};

InitializeCanvas();
SetupCallbacks();


/*
function geometry_callback(data) {
    for (var segment_name in data) {
        
        var happy_data = [];
        var point_data = data[segment_name];
        for (var point in point_data) {
            let x = point_data[point][0];
            let y = point_data[point][1];
            let z = point_data[point][2];
            let vect = new BABYLON.Vector3(x,y,z);
            happy_data.push(vect);
        }
        let tube = BABYLON.MeshBuilder.CreateTube("tube", { path: happy_data });
        tube.material = redMat;
    }
    debugger;
};

const socket = new WebSocket('ws://localhost:8001');
socket.onmessage = (event) => {
    let data = event.data
    try {
        data = JSON.parse(data);
        data = JSON.parse(data[0]);

        switch (data.message) {
            case "GEO_DATA":
                console.log("data recieved");
                geometry_callback(data.data);
                break;
        }
    }
    catch(err) {
        debugger;
    }
};
socket.onopen = (event) => {
    socket.send(JSON.stringify({
        message: "INIT", data: {}
    }));
};
*/

