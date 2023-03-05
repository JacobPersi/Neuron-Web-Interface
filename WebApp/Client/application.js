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
            GUI: {
                ActiveView: AppSubView.Morphology,
                canvas: null, Engine: null, Scene: null, Camera: null, Light: null,
                RenderScale: 0.1,
                RedrawRequired: true,
                ShowHelp: true,
            }, 
            Morphology: {
                ActiveSegment: 0,
                Segments: [
                    {
                        index: 0, name: 'soma',
                        points: [
                            { position: new BABYLON.Vector3(1, 0, 0), diameter: 1 },
                            { position: new BABYLON.Vector3(0, 0, 0), diameter: 1 },
                            { position: new BABYLON.Vector3(-1, 0, 0), diameter: 1 },

                        ]
                    }
                ],
                Topology: [{ source: 'soma', destination: 'dendrite[0]' }]
            },
            Biophysics: {
                Ra: 100, cm: 1, gnabar: 0.12, gkbar: 0.036, gl: 0.0003, el: -54.3, g: 0.001, e: -65
            },
            Simulation: {
                Stimulation: {
                    Segment: "soma", Location: 0, 
                    Delay: 5, Duration: 1,  Amplitude: 0.1
                },
                Recording: {
                    Segment: "axon", Location: 1,
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
            this.GUI.Camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, 10, new BABYLON.Vector3(0, 0, 0));
            this.GUI.Camera.setPosition(new BABYLON.Vector3(0, 45, 100)); 
            this.GUI.Camera.setTarget(BABYLON.Vector3.Zero());
            this.GUI.Camera.attachControl(this.GUI.Canvas, true);
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

                    if (segment.points.length > 1) {
                        let path = [];
                        for (var point_index in segment.points) {
                            path.push(segment.points[point_index].position);
                        }

                        let tube = BABYLON.MeshBuilder.CreateTube("tube", { path: path, radius: 0.3 });
                        segment.mesh = tube;
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
                        this.CanvasRightClick(pointerInfo);
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
                    let distance = 60.0;
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
        }
    },
    mounted() {
        this.InitializeCanvas();
    }

});

