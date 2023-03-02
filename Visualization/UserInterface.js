export default {
    data() {
        return {
            cells: [
                {
                    section: "soma",
                    segments: [[0,0,0]]
                },
                {
                    section: "axon",
                    segments: [[0,0,0], [0,0,5]]
                },
                {
                    section: "axon[1]",
                    segments: [[0,0,4], [1,0,5]]
                },
                {
                    section: "axon[2]",
                    segments: [[0,0,4], [-1,0,5]]
                }
            ]
        };
    },
    methods: {
        InitializeCanvas() {

            let CameraPos = new BABYLON.Vector3(0, 45, 120);

            const canvas = document.getElementById("render-canvas");
            const engine = new BABYLON.Engine(canvas, true);
            const scene = new BABYLON.Scene(engine);
            scene.clearColor = new BABYLON.Color3(0.1,0.1,0.1);
            const camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, 10, new BABYLON.Vector3(0, 0, 0));
            camera.setPosition(CameraPos); 
            camera.setTarget(BABYLON.Vector3.Zero());
            camera.attachControl(canvas, true);
            
            const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0));
            light.intensity = 0.7;
            
            const glow = new BABYLON.GlowLayer("glow");
            var redMat = new BABYLON.StandardMaterial("redMat");
            redMat.emissiveColor = new BABYLON.Color3(0, 1, 1);

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

            const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 2});

            scene.onPointerObservable.add((pointerInfo) => {
                switch (pointerInfo.type) {

                    case BABYLON.PointerEventTypes.POINTERUP:
                        if (pointerInfo.event.button == 2) {
                            let pickinfo = scene.pick(scene.pointerX, scene.pointerY)
                            if (pickinfo.hit) {
                                sphere.position = pickinfo.pickedPoint;
                            } else {

                                let distance = 120.0;
                                let position = new BABYLON.Vector3(
                                    pickinfo.ray.origin.x + pickinfo.ray.direction.x * distance,
                                    pickinfo.ray.origin.y + pickinfo.ray.direction.y * distance,
                                    pickinfo.ray.origin.z + pickinfo.ray.direction.z * distance
                                );
                                sphere.position = position;
                            }
                        }
                        break;

                }
            });

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

            engine.runRenderLoop(function () {
                scene.render();
            });

            window.addEventListener("resize", function () {
                engine.resize();
            });
        }
    },
    mounted() {
        this.InitializeCanvas();
    }
}

