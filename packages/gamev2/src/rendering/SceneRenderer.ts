import {
  AbstractMesh,
  ActionManager,
  ArcRotateCamera,
  CascadedShadowGenerator,
  Color3,
  DefaultRenderingPipeline,
  DepthOfFieldEffectBlurLevel,
  DirectionalLight,
  ExecuteCodeAction,
  GroundMesh,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  MirrorTexture,
  Plane,
  Scene,
  ShadowGenerator,
  SSAO2RenderingPipeline,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

export class SceneRenderer {
  readonly light: DirectionalLight;
  readonly ambientLight: HemisphericLight;
  readonly shadowGenerator: CascadedShadowGenerator;
  readonly mirrorTexture: MirrorTexture;

  private readonly scene: Scene;
  private readonly camera: ArcRotateCamera;
  private readonly ground: GroundMesh;
  private readonly skybox: Mesh;

  constructor(scene: Scene, camera: ArcRotateCamera, size: number = 10) {
    this.scene = scene;
    this.camera = camera;

    // Lighting
    const light = new DirectionalLight('light', new Vector3(-1, -1, -1).normalize(), scene);
    light.autoUpdateExtends = true;
    light.autoCalcShadowZBounds = true;

    const ambientLight = new HemisphericLight('ambient', new Vector3(1, 1, 0), scene);

    // Shadows
    const shadowGenerator = new CascadedShadowGenerator(2048, light);
    shadowGenerator.autoCalcDepthBounds = false;
    shadowGenerator.bias = 0.01;
    shadowGenerator.numCascades = 2;
    shadowGenerator.usePercentageCloserFiltering = true;
    shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
    shadowGenerator.depthClamp = false;
    shadowGenerator.shadowMaxZ = 60;
    shadowGenerator.darkness = 0.03;

    // Skybox + ground
    this.skybox = MeshBuilder.CreateBox('skybox', { size: 1 }, scene);
    this.ground = MeshBuilder.CreateGround('ground');
    this.resize(size, 0, 0);

    const skyboxMaterial = new StandardMaterial('skybox', scene);
    skyboxMaterial.emissiveColor = new Color3(0.3, 0.3, 0.7);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.disableLighting = true;
    this.skybox.material = skyboxMaterial;

    // Reflective ground
    this.ground.receiveShadows = true;
    const groundMaterial = new StandardMaterial('ground');
    const mirrorTexture = new MirrorTexture('mirror', { ratio: 0.5 }, scene);
    mirrorTexture.mirrorPlane = Plane.FromPositionAndNormal(
      this.ground.position,
      this.ground.getFacetNormal(0).scale(-1)
    );
    mirrorTexture.renderList = [this.skybox];
    mirrorTexture.adaptiveBlurKernel = 24;
    mirrorTexture.noPrePassRenderer = true;

    groundMaterial.reflectionTexture = mirrorTexture;
    groundMaterial.diffuseColor = new Color3(0.2, 0.2, 0.3);
    groundMaterial.specularColor = new Color3(0.2, 0.2, 0.3);
    this.ground.material = groundMaterial;

    ambientLight.excludedMeshes.push(this.ground);

    // Rendering pipeline
    const renderer = new DefaultRenderingPipeline('renderer', true, scene, [camera]);
    renderer.fxaaEnabled = true;
    renderer.depthOfFieldEnabled = true;
    renderer.depthOfField.fStop = 1.2;
    renderer.depthOfFieldBlurLevel = DepthOfFieldEffectBlurLevel.High;

    scene.actionManager = scene.actionManager ?? new ActionManager(scene);
    scene.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnEveryFrameTrigger, () => {
        renderer.depthOfField.focusDistance = camera.radius * 1000;
      })
    );

    // SSAO
    const ssao = new SSAO2RenderingPipeline('ssao', scene, 1);
    ssao.samples = 16;
    ssao.totalStrength = 1.5;
    ssao.radius = 0.2;
    ssao.expensiveBlur = false;
    scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline('ssao', camera);

    this.light = light;
    this.ambientLight = ambientLight;
    this.shadowGenerator = shadowGenerator;
    this.mirrorTexture = mirrorTexture;
  }

  registerMeshes(meshes: AbstractMesh[]): void {
    for (const mesh of meshes) {
      mesh.receiveShadows = true;
      for (const child of mesh.getChildMeshes()) {
        child.receiveShadows = true;
        this.mirrorTexture.renderList?.push(child);
      }
      this.shadowGenerator.addShadowCaster(mesh, true);
    }
  }

  resize(size: number, centerX: number, centerZ: number): void {
    this.skybox.position = new Vector3(centerX, 0, centerZ);
    this.skybox.scaling = new Vector3(size, 50, size);
    this.ground.position = new Vector3(centerX, 0.1, centerZ);
    this.ground.scaling = new Vector3(size, 1, size);
  }
}
