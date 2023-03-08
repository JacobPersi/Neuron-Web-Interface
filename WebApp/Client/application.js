let AppSubView = {
    Morphology: 0,
    Biophysics: 1,
    Simulation: 2,
    Visualization: 3
}; 

var App = new Vue({
    el: '#app-root',
    data() {
        return { 
            Connection: {
                Socket: null,
                Connected: false,
                LastAttempt: new Date()
            },
            GUI: {
                ActiveView: AppSubView.Morphology,
                canvas: null, Engine: null, Scene: null, Camera: null, Light: null,
                RenderScale: 0.05,
                RedrawRequired: true,
                ShowHelp: true,
            }, 
            Morphology: {
                ActiveSegment: 0,
                Segments: [],
                Topology: [{ source: 'soma', destination: 'dendrite[0]' }]
            },
            Biophysics: {
                Ra: 100, cm: 1, gnabar: 0.12, gkbar: 0.036, gl: 0.0003, el: -54.3, g: 0.001, e: -65
            },
            Simulation: {
                Stimulation: {
                    Targets: [{
                        Segment: "soma", Location: 0, 
                        Delay: 5, Duration: 1,  Amplitude: 0.1
                    }]
                },
                Recording: {
                    InitialVoltage: -65,
                    Length: 25,
                    Targets: [{
                        Segment: "axon", Location: 1,
                    }]
                }
            }
        }
    },
    methods: {
        InitializeCanvas: function() {
            this.GUI.Canvas = document.getElementById("babylon-canvas");
            this.GUI.Engine = new BABYLON.Engine(this.GUI.Canvas, true);

            this.GUI.Scene = new BABYLON.Scene(this.GUI.Engine);
            this.GUI.Scene.clearColor = new BABYLON.Color3(0.1,0.1,0.1);

            this.GUI.Camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, 30, new BABYLON.Vector3(0, 0, 0));
            this.GUI.Camera.setPosition(new BABYLON.Vector3(25, 30, -25)); 
            this.GUI.Camera.attachControl(this.GUI.Canvas, true);
            this.GUI.Camera.wheelPrecision = 100; 
            this.GUI.Camera.lowerRadiusLimit = 30;
            this.GUI.Camera.upperRadiusLimit = 300;

            this.GUI.Light = new BABYLON.HemisphericLight("Light", new BABYLON.Vector3(0, 1, 0));
            this.GUI.Light.intensity = 0.7;

            this.GUI.Scene.onPointerObservable.add(this.PointerEvent);
            this.GUI.Scene.onBeforeRenderObservable.add(this.PreDraw);
            this.GUI.Engine.runRenderLoop(() => { this.GUI.Scene.render(); });
            window.addEventListener("resize", () => { this.GUI.Engine.resize(); });
        },
        PreDraw: function() {
            if (this.GUI.RedrawRequired == true) {
                console.log("Redraw!");
                for (var index in this.Morphology.Segments) {
                    let segment = this.Morphology.Segments[index];

                    if (segment.mesh != null) {
                        segment.mesh.dispose();    
                    }            

                    if (segment.name == "soma" && segment.points != null && segment.points.length >= 2) {
                        let firstPoint = segment.points[0].position;
                        let lastPoint = segment.points[segment.points.length - 1].position;
                        segment.mesh = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: BABYLON.Vector3.Distance(firstPoint, lastPoint) });
                    }

                    if (segment.points.length > 1) {
                        let path = [];
                        for (var point_index in segment.points) {
                            path.push(segment.points[point_index].position);
                        }
                        
                        segment.mesh = BABYLON.MeshBuilder.CreateTube("tube", { 
                            path: path, 
                            radius: 0.1, 
                            cap: BABYLON.Mesh.CAP_ALL, 
                            sideOrientation: BABYLON.Mesh.DOUBLESIDE 
                        });
                    }
                }
                this.DrawGrid(20);
                this.GUI.RedrawRequired = false;
            }
        },
        PointerEvent: function(pointerInfo) {
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERUP:
                    if (pointerInfo.event.button == 2) {
                        //this.CanvasRightClick(pointerInfo);
                    } 
                    break;
            }
        },
        CanvasRightClick: function(pointerInfo) {
            if (this.Morphology.ActiveSegment != -1) {
                let position = null;
                let pickinfo = this.GUI.Scene.pick(this.GUI.Scene.pointerX, this.GUI.Scene.pointerY);
                if (pickinfo.hit) {
                    position = pickinfo.pickedPoint;
                } else {
                    let distance = this.GUI.Camera.radius;
                    position = new BABYLON.Vector3(
                        pickinfo.ray.origin.x + pickinfo.ray.direction.x * distance,
                        pickinfo.ray.origin.y + pickinfo.ray.direction.y * distance,
                        pickinfo.ray.origin.z + pickinfo.ray.direction.z * distance
                    );
                }
                if (position != null) {
                    this.AddPointToActive(position);
                }
            }
        },
        DrawGrid: function(size) {
            let grid = BABYLON.MeshBuilder.CreateLines("lines", {
                points: [
                    new BABYLON.Vector3(-size, 0, -size),
                    new BABYLON.Vector3(-size, 0, size),
                    new BABYLON.Vector3(size, 0, size),
                    new BABYLON.Vector3(size, 0, -size),
                    new BABYLON.Vector3(-size, 0, -size)
                ]
            });
        },
        AttemptSocketConnection: function() {
            this.Connection.Socket = new WebSocket('ws://localhost:8001');
            this.Connection.Socket.onopen = (event) => this.OnSocketOpen(event);
            this.Connection.Socket.onmessage = (event) => this.OnSocketMessage(event);
            this.Connection.Socket.onclose = (event) => this.OnSocketError(event);
            this.Connection.Socket.onerror = (event) => this.OnSocketError(event);
              
        },
        OnSocketOpen: function(event) {
            this.Connection.Connected = true;
            this.LoadExample();
        },
        OnSocketMessage: function(event) {
            let data = event.data
            try {
                data = JSON.parse(data);
                data = JSON.parse(data[0]);

                switch(data.message) {
                    case "EXAMPLE_DATA":
                        this.LoadSegmentData(data.segments);
                      break;

                    default:
                        console.log(data);
                  }
                  

            } catch(err) {
                console.log(err);
                this.OnSocketError();
            }
        },
        OnSocketError: function(event) {
            this.Connection.Connected = false;
            this.Connection.LastAttempt = new Date();
        },
        NewSegment: function() {
            this.Morphology.Segments.push({
                name: 'new[' + (this.Morphology.Segments.length + 1) + ']',
                points: []
            });
            if (this.Morphology.ActiveSegment == -1) {
                this.Morphology.ActiveSegment = 0;
            }
        },
        ExpandSegment: function(index) {
            this.Morphology.ActiveSegment = index;
        },
        DeleteSegment: function(index) {
            if (this.Morphology.Segments[index].mesh != null) {
                this.Morphology.Segments[index].mesh.dispose();   
            }
            this.Morphology.Segments.splice(index, 1);
            this.Morphology.ActiveSegment = this.Morphology.Segments.length - 1;
            this.ReDraw();
        },
        AddPointToActive: function(location) {
            this.Morphology.Segments[this.Morphology.ActiveSegment].points.push({
                position: location, 
                diameter: 1
            });
            this.ReDraw();
        },
        DeletePoint: function(index) {
            this.Morphology.Segments[this.Morphology.ActiveSegment].points.splice(index, 1);
            this.ReDraw();
        }, 
        ToggleHelp: function() {
            this.GUI.ShowHelp = !this.GUI.ShowHelp; 
        },
        ReDraw: function() {
            this.GUI.RedrawRequired = true;
        },
        LoadExample: function() {
            if (this.Connection.Connected && this.Connection.Socket.readyState === this.Connection.Socket.OPEN) {
                this.Connection.Socket.send(JSON.stringify({
                    message: "LOAD_EXAMPLE", 
                    data: {}
                }));
            } else {
                this.OnSocketError();
            }
        },
        LoadSegmentData: function(segments) {
            this.ClearScene();
            for (var segment in segments) {
                var points = segments[segment];

                for (var index in points) {
                    var point = points[index];
                    
                    points[index] = {
                        position: new BABYLON.Vector3(
                            point[0] * this.GUI.RenderScale, 
                            point[1] * this.GUI.RenderScale, 
                            point[2] * this.GUI.RenderScale),
                        diameter: point[3] * this.GUI.RenderScale
                    };
                }
                
                this.Morphology.Segments.push({
                    name: segment,
                    points: segments[segment]
                });
            }
            this.ReDraw();
        }, 
        ClearScene: function() {
            while (this.Morphology.Segments.length > 0) {
                for (let i = 0; i < this.Morphology.Segments.length; i++) {
                    this.DeleteSegment(i);
                }
            }
        },
        NextStep: function() {
            if (this.GUI.ActiveView < AppSubView.Visualization) {
                this.GUI.ActiveView++;
            }
        },
        PreviousStep: function() {
            if (this.GUI.ActiveView > AppSubView.Morphology) {
                this.GUI.ActiveView--;
            }
        },
        RenderSimulation: function() {
            if (this.Connection.Connected && this.Connection.Socket.readyState === this.Connection.Socket.OPEN) {
                this.Connection.Socket.send(JSON.stringify({
                    message: "RENDER", 
                    data: {}
                }));
            } else {
                this.OnSocketError();
            }
        }
    },
    mounted() {
        this.InitializeCanvas();
        this.AttemptSocketConnection();
    }

});

