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
                ActiveSection: -1,
                Sections: [],
                Topology: [{ source: 'soma', destination: 'dendrite[0]' }]
            },
            Biophysics: {
                Ra: 100, cm: 1, gnabar: 0.12, gkbar: 0.036, gl: 0.0003, el: -54.3, g: 0.001, e: -65
            },
            Simulation: {
                Stimulation: {
                    Targets: [{
                        Section: "soma", Location: 0, 
                        Delay: 5, Duration: 1,  Amplitude: 0.1
                    }]
                },
                Recording: {
                    InitialVoltage: -65,
                    Span: 25,
                    Targets: [{
                        Section: "axon", Location: 1,
                    }]
                }
            },
            Visualization: {}
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

            this.GUI.DefaultMaterial = new BABYLON.StandardMaterial("DefaultMaterial");
            this.GUI.ActiveElementMaterial = new BABYLON.StandardMaterial("ActiveElementMaterial");
            this.GUI.ActiveElementMaterial.diffuseColor = new BABYLON.Color3(1, 0, 1);
            this.GUI.ActiveElementMaterial.specularColor = new BABYLON.Color3(0.5, 0.6, 0.87);
            this.GUI.ActiveElementMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
            this.GUI.ActiveElementMaterial.ambientColor = new BABYLON.Color3(0.23, 0.98, 0.53);
            
            this.GUI.Scene.onPointerObservable.add(this.PointerEvent);
            this.GUI.Scene.onBeforeRenderObservable.add(this.PreDraw);
            this.GUI.Engine.runRenderLoop(() => { this.GUI.Scene.render(); });
            window.addEventListener("resize", () => { this.GUI.Engine.resize(); });
        },
        PreDraw: function() {
            if (this.GUI.RedrawRequired == true) {
                console.log("Redraw!");
                for (var index in this.Morphology.Sections) {
                    let section = this.Morphology.Sections[index];
                    if (section.mesh != null) {
                        section.mesh.dispose();    
                    }            
                    if (section.points.length > 1) {
                        let path = [];
                        for (var point_index in section.points) {
                            path.push(section.points[point_index].position);
                        }
                        const extrusion = BABYLON.MeshBuilder.ExtrudeShapeCustom("pipe", {
                            shape: [
                                new BABYLON.Vector3(0, -1, 0),
                                new BABYLON.Vector3(1, 0, 0),
                                new BABYLON.Vector3(0, 1, 0),
                                new BABYLON.Vector3(-1, 0, 0)
                            ],
                            closeShape: true,
                            path: path,
                            scaleFunction: (i, distance) => { return 0.1; },
                            sideOrientation: BABYLON.Mesh.DOUBLESIDE,
                            cap: BABYLON.Mesh.CAP_ALL,
                        });
                        section.mesh = extrusion;
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
            if (this.Morphology.ActiveSection != -1) {
                debugger; 
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
        },
        OnSocketMessage: function(event) {
            let data = event.data
            try {
                data = JSON.parse(data);
                data = JSON.parse(data[0]);
                switch(data.message) {
                    case "RENDER_DATA":
                        this.RenderResult(data);
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
        SetActiveSection: function(index) {
            if (this.Morphology.ActiveSection != -1 && this.Morphology.Sections[this.Morphology.ActiveSection].mesh != null) {
                this.Morphology.Sections[this.Morphology.ActiveSection].mesh.material = this.GUI.DefaultMaterial;
            }
            this.Morphology.ActiveSection = index;
            if(this.Morphology.Sections[this.Morphology.ActiveSection].mesh != null) {
                this.Morphology.Sections[this.Morphology.ActiveSection].mesh.material = this.GUI.ActiveElementMaterial;
            }
        },
        NewSection: function() {
            this.Morphology.Sections.push({
                name: 'new[' + (this.Morphology.Sections.length + 1) + ']',
                points: []
            });
            if (this.Morphology.ActiveSection == -1) {
                this.SetActiveSection(0);
            }
        },
        ExpandSection: function(index) {
            this.SetActiveSection(index);
        },
        DeleteSection: function(index) {
            if (this.Morphology.Sections[index].mesh != null) {
                this.Morphology.Sections[index].mesh.dispose();   
            }
            this.Morphology.Sections.splice(index, 1);
            this.SetActiveSection(this.Morphology.Sections.length - 1);
            this.ReDraw();
        },
        AddPointToActive: function(location) {
            this.Morphology.Sections[this.Morphology.ActiveSection].points.push({
                position: location, 
                diameter: 1
            });
            this.ReDraw();
        },
        DeletePoint: function(index) {
            this.Morphology.Sections[this.Morphology.ActiveSection].points.splice(index, 1);
            this.ReDraw();
        }, 
        ToggleHelp: function() {
            this.GUI.ShowHelp = !this.GUI.ShowHelp; 
        },
        ReDraw: function() {
            this.GUI.RedrawRequired = true;
        },
        LoadSectionData: function(sections) {
            this.ClearScene();
            for (var section in sections) {
                var points = sections[section];
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
                this.Morphology.Sections.push({
                    name: section,
                    points: sections[section]
                });
            }
            this.SetActiveSection(0);
            this.ReDraw();
        }, 
        ClearScene: function() {
            while (this.Morphology.Sections.length > 0) {
                for (let i = 0; i < this.Morphology.Sections.length; i++) {
                    this.DeleteSection(i);
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
                    data: {
                        Biophysics: this.Biophysics, 
                        Simulation: this.Simulation
                    }
                }));
            } else {
                this.OnSocketError();
            }
        },
        RenderResult: function(data) {
            this.Visualization = data;
        }
    },
    mounted() {
        this.InitializeCanvas();
        this.AttemptSocketConnection();
        this.LoadSectionData(DefaultData);
    }

});

