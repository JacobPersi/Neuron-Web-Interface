var App = new Vue({
    el: '#app-root',
    data() {
        return { 
            State: 
            {
                Canvas: null,
                Engine: null,
                Scene: null,
                Segments: [],
                ActiveSegment: null,
                Meshes: [],
                IsDirty: false,
                Scale: 0.1
            }
        }
    },
    methods: {
        NewCell: function() {
            this.State.ActiveSegment = null;
            this.State.Segments = [];
        },
        NewSegment: function() {
            if (this.State.ActiveSegment != null) {
                this.State.ActiveSegment.expanded = false;
            }
            let segment = {
                name: "Segment [" + this.State.Segments.length + "]",
                expanded: true,
                points: []
            };
            this.State.Segments.push(segment);
            this.State.ActiveSegment = segment;
        },
        CollapseCell: function(event, cell) {
            if (this.State.ActiveSegment != cell && this.State.ActiveSegment != null) {
                this.State.ActiveSegment.expanded = false;
            }
            cell.expanded = ! cell.expanded;
            if (cell.expanded == true) {
                this.State.ActiveSegment = cell;
            } else {
                this.State.ActiveSegment = null;
            }
        },
        DeletePoint: function(event, cell, index) {
            this.State.ActiveSegment.points.splice(index, 1);
            this.State.IsDirty = true;
        },
        _initializeCanvas: function() {
            const canvas = document.getElementById("render-canvas");
            const engine = new BABYLON.Engine(canvas, true);
            // Scene:
            const scene = new BABYLON.Scene(engine);
            scene.clearColor = new BABYLON.Color3(0.1,0.1,0.1);
            // Camera:
            const camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, 10, new BABYLON.Vector3(0, 0, 0));
            camera.setPosition(new BABYLON.Vector3(0, 45, 100)); 
            camera.setTarget(BABYLON.Vector3.Zero());
            camera.attachControl(canvas, true);
            // Lights:
            const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0));
            light.intensity = 0.7;

            // Post Processing:
            const glow = new BABYLON.GlowLayer("glow");
            this.State.GlowMat = new BABYLON.StandardMaterial("glowMat", scene);
            this.State.GlowMat.emissiveColor = new BABYLON.Color3(0, 0, .5);
            this.State.GlowMat.emissiveIntensity = 1;

            // Geometry:
            let size = 20;
            let lines = BABYLON.MeshBuilder.CreateLines("lines", {
                points: [
                    new BABYLON.Vector3(-size, 0, -size),
                    new BABYLON.Vector3(-size, 0, size),
                    new BABYLON.Vector3(size, 0, size),
                    new BABYLON.Vector3(size, 0, -size),
                    new BABYLON.Vector3(-size, 0, -size)
                ]
            });
            // Store References:
            this.State.Canvas = canvas;
            this.State.Engine = engine;
            this.State.Scene = scene;
        },
        _setupCallbacks: function() {
            this.State.Engine.runRenderLoop(() => {
                this.State.Scene.render();
              });
            
            window.addEventListener("resize", () => {
                this.State.Engine.resize();
            });
            this.State.Scene.onPointerObservable.add(this._pointerCallback);
            this.State.Scene.onBeforeRenderObservable.add(this._preRender);
        },
        _pointerCallback: function(pointerInfo) {
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERUP) {

                if (pointerInfo.event.button == 2) {
                    let position = null;    
        
                    let pickinfo = this.State.Scene.pick(this.State.Scene.pointerX, this.State.Scene.pointerY);
                    if (pickinfo.hit) {
                        position = pickinfo.pickedPoint;
                    } else {
                        let distance = 60.0;
                        position = new BABYLON.Vector3(
                            pickinfo.ray.origin.x + pickinfo.ray.direction.x * distance,
                            pickinfo.ray.origin.y + pickinfo.ray.direction.y * distance,
                            pickinfo.ray.origin.z + pickinfo.ray.direction.z * distance
                        );
                    }
        
                    if (position != null) {
                        if (this.State.ActiveSegment != null) {
                           this.State.ActiveSegment.points.push(position);
                        }
                    }
                }
            }
        },
        _pullData: function() {
            const socket = new WebSocket('ws://localhost:8001');
            // Request data:
            socket.onopen = (event) => {
                socket.send(JSON.stringify({
                    message: "INIT", data: {}
                }));
            };

            // Recieve data:
            socket.onmessage = (event) => {
                let data = event.data
                try {
                    data = JSON.parse(data);
                    data = JSON.parse(data[0]);

                    switch (data.message) {
                        case "GEO_DATA":
                            App.State.Segments = []
                            for (var segment in data.segments) {
                                

                                var points = data.segments[segment];
                                for (var index in points) {
                                    var point = points[index];
                                    points[index] = {
                                        position: new BABYLON.Vector3(
                                            point[0] * App.State.Scale, 
                                            point[1] * App.State.Scale, 
                                            point[2] * App.State.Scale),
                                        diameter: point[3] * App.State.Scale
                                    };
                                }
                                
                                var entry = {
                                    name: segment,
                                    expanded: false,
                                    points: data.segments[segment]
                                }

                                App.State.Segments.push(entry);
                            }
                            App.State.IsDirty = true;
                            break;
                    }
                }
                catch(err) {
                    console.log(err);
                }
            };
           
        },
        _preRender: function() {

            if (this.State.IsDirty == true) {
                for (var mesh in this.State.Meshes) {
                    this.State.Meshes[mesh].dispose();
                }

                for (var index in this.State.Segments) {
                    let segment = this.State.Segments[index];

                    let path = [];
                    for (var point_index in segment.points) {
                        path.push(segment.points[point_index].position);
                    }
                    let tube = BABYLON.MeshBuilder.CreateTube("tube", { path: path, radius: 0.3 });
                    tube.material = this.State.GlowMat;
                    this.State.Meshes.push(tube);
                }

                this.State.IsDirty = false;
            }

            /*
            if (this.State.ActiveSegment != null) {
                // Remove all meshes - SLOW!
                
                for (var index in this.State.ActiveSegment.points) {
                    index = parseInt(index);
                    if (this.State.ActiveSegment.points.length > 1) {
                        let tube = BABYLON.MeshBuilder.CreateTube("tube", { path: this.State.ActiveSegment.points });
                        this.State.Meshes.push(tube);
                    }
                }
            }
            */
        }
    },
    mounted() {
        this._initializeCanvas();
        this._setupCallbacks();
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


*/

