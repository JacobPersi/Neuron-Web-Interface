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
            const canvas = document.getElementById("render-canvas");
            const engine = new BABYLON.Engine(canvas, true);
            const scene = new BABYLON.Scene(engine);
            scene.clearColor = new BABYLON.Color3(0.1,0.1,0.1);
            const camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, 10, new BABYLON.Vector3(0, 0, 0));
            camera.setPosition(new BABYLON.Vector3(0, 45, 120)); 
            camera.setTarget(BABYLON.Vector3.Zero());
            camera.attachControl(canvas, true);
            
            const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0));
            light.intensity = 0.7;
            
            const glow = new BABYLON.GlowLayer("glow");
            var redMat = new BABYLON.StandardMaterial("redMat");
            redMat.emissiveColor = new BABYLON.Color3(0.1, 0, 0);

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

                  case BABYLON.PointerEventTypes.POINTERMOVE:
                    break;

                    case BABYLON.PointerEventTypes.POINTERUP:
                        if (pointerInfo.event.button == 2) {
                            const screenPosition = new BABYLON.Vector3(scene.pointerX, scene.pointerY, 0);
                            const vector = BABYLON.Vector3.Unproject(
                                screenPosition,
                                engine.getRenderWidth(),
                                engine.getRenderHeight(),
                                BABYLON.Matrix.Identity(),
                                scene.getViewMatrix(),
                                scene.getProjectionMatrix()
                            );
                            sphere.position = vector;
                        }
                        break;

                    case BABYLON.PointerEventTypes.POINTERDOWN:
                        break;

                }
            });

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

