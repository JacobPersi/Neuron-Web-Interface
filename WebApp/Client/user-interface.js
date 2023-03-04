var App = new Vue({
    el: '#app-root',
    data() {
        return { 
            State: 
            {
                Canvas: null,
                Engine: null,
                Scene: null,
                ActiveView: "Morphology",
                
                Morphology: {
                    ActiveSegment: null,
                    Segments: [],
                    RedrawRequired: false,
                    Scale: 0.1,
                },
                Biophysics: {
                    Ra: 100,
                    cm: 1,
                    gnabar: 0.12,
                    gkbar: 0.036,
                    gl: 0.0003,
                    el: -54.3,
                    g: 0.001,
                    e: -65
                },
                Simulation: {
                    Stimulation: {
                        Segment: "soma",
                        Location: 0, 
                        Delay: 5,
                        Duration: 1, 
                        Amplitude: 0.1
                    },
                    Recording: {
                        Segment: "axon",
                        Location: 1,
                    }
                }
            }
        }
    },
    methods: {
        SetView: function(view) {
            this.State.ActiveView = view;
            this.State.Morphology.ActiveSegment = null;
            this.State.Morphology.RedrawRequired = true;
        },
        NewCell: function() {
            this.State.Morphology.ActiveSegment = null;
            this.State.Morphology.Segments = [];
            this.State.Morphology.RedrawRequired = true;
        },
        NewSegment: function() {
            if (this.State.Morphology.ActiveSegment != null) {
                this.State.Morphology.ActiveSegment.expanded = false;
            }
            let segment = {
                name: "Segment [" + this.State.Morphology.Segments.length + "]",
                expanded: true,
                points: [],
                mesh: null
            };
            this.State.Morphology.Segments.push(segment);
            this.State.Morphology.ActiveSegment = segment;
            this.State.Morphology.RedrawRequired = true;
        },
        CollapseSegment: function(event, segment) {
            if (this.State.Morphology.ActiveSegment != segment && this.State.Morphology.ActiveSegment != null) {
                this.State.Morphology.ActiveSegment.expanded = false;
            }
            segment.expanded = ! segment.expanded;
            if (segment.expanded == true) {
                this.State.Morphology.ActiveSegment = segment;
                this.State.Morphology.RedrawRequired = true;
            } else {
                this.State.Morphology.ActiveSegment = null;
            }
        },
        DeletePoint: function(event, segment, index) {
            this.State.Morphology.ActiveSegment.points.splice(index, 1);
            this.State.Morphology.RedrawRequired = true;
        },
        RunSimulation: function() {
            const socket = new WebSocket('ws://localhost:8001');
            // Request data:
            socket.onopen = (event) => {
                socket.send(JSON.stringify({
                    message: "RUN_SIM", 
                    data: { 
                        Biophysics: App.State.Biophysics, 
                        Simulation: App.State.Simulation
                    }
                }));
            };

            // Recieve data:
            socket.onmessage = (event) => {
                let data = event.data
                try {
                    data = JSON.parse(data);
                    data = JSON.parse(data[0]);

                    if (data.message == "SIM_RESULTS") {
                            
                    }
                }
                catch(err) {
                    console.log(err);
                }
            };
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
            this.State.GlowMat.emissiveIntensity = 0.5;

            this.State.ActiveMat = new BABYLON.StandardMaterial("activeMat", scene);
            this.State.ActiveMat.emissiveColor = new BABYLON.Color3(1, 0, 0);
            this.State.ActiveMat.emissiveIntensity = 1;

            this.State.IdleMat = new BABYLON.StandardMaterial("idleMat", scene);
            this.State.IdleMat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            this.State.IdleMat.emissiveIntensity = 0;

            // Geometry:
            let size = 20;
            let lines = BABYLON.MeshBuilder.CreateLines("lines", {
                points: [
                    new BABYLON.Vector3(-size, -30, -size),
                    new BABYLON.Vector3(-size, -30, size),
                    new BABYLON.Vector3(size, -30, size),
                    new BABYLON.Vector3(size, -30, -size),
                    new BABYLON.Vector3(-size, -30, -size)
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
            // Mouse click:
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERUP) {
                
                // Left mouse click:
                if (pointerInfo.event.button == 0) {
                    
                    let pickinfo = this.State.Scene.pick(this.State.Scene.pointerX, this.State.Scene.pointerY);
                    if (pickinfo.hit) {
                        for(var index in this.State.Morphology.Segments) {
                            var segment = this.State.Morphology.Segments[index];
                            if (segment.mesh == pickinfo.pickedMesh) {
                                this.State.Morphology.ActiveSegment = segment;
                                this.State.Morphology.RedrawRequired = true;
                            }
                        }
                    }
                }

                /*
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
                */
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

                    if (data.message == "GEO_DATA") {
                        App.State.Morphology.Segments = []
                        for (var segment in data.segments) {
                            var points = data.segments[segment];
                            for (var index in points) {
                                var point = points[index];
                                points[index] = {
                                    position: new BABYLON.Vector3(
                                        point[0] * App.State.Morphology.Scale, 
                                        point[1] * App.State.Morphology.Scale, 
                                        point[2] * App.State.Morphology.Scale),
                                    diameter: point[3] * App.State.Morphology.Scale
                                };
                            }
                            
                            var entry = {
                                name: segment,
                                expanded: false,
                                points: data.segments[segment],
                                mesh: null
                            }

                            App.State.Morphology.Segments.push(entry);
                        }
                        App.State.Morphology.RedrawRequired = true;
                    }
                }
                catch(err) {
                    console.log(err);
                }
            };
           
        },
        _preRender: function() {

            if (this.State.Morphology.RedrawRequired == true) {
                console.log("Redraw!");

                for (var index in this.State.Morphology.Segments) {
                    let segment = this.State.Morphology.Segments[index];

                    if (segment.mesh != null) {
                       segment.mesh.dispose();    
                    }            

                    let path = [];
                    for (var point_index in segment.points) {
                        path.push(segment.points[point_index].position);
                    }
                    let tube = BABYLON.MeshBuilder.CreateTube("tube", { path: path, radius: 0.3 });
                    
                    if (this.State.ActiveView == 'Morphology') {
                        if (this.State.Morphology.ActiveSegment == segment) {
                            tube.material = this.State.ActiveMat;
                        } else {
                            tube.material = this.State.GlowMat;
                        }
                    } else {
                        tube.material = this.State.GradientMaterial;
                    }

                    segment.mesh = tube;
                }

                this.State.Morphology.RedrawRequired = false;
            }
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
};


*/

