let scene, camera, renderer, controls;
let rootGroup, foliageGroup, stemDisplayGroup, baseComponentsGroup, oxygenParticles;
const particleCount = 150;

function init() {
    // Scene & Fog
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf8fcf5, 10, 80);

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 4, 8);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const container = document.querySelector('.canvas-container');
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3;
    controls.maxDistance = 15;
    controls.target.set(0, 2.5, 0);
    controls.update();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const hemiLight = new THREE.HemisphereLight(0xe0f7fa, 0xa5d6a7, 0.3);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0xe8f0e0, shininess: 0 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Main Group
    rootGroup = new THREE.Group();
    scene.add(rootGroup);

    createModel();
    createOxygenParticles();

    window.addEventListener('resize', onWindowResize, false);
}

function createModel() {
    const matFoliage = new THREE.MeshPhongMaterial({ color: 0x4caf50, flatShading: true });
    const matStem = new THREE.MeshPhongMaterial({ color: 0x8d6e63, shininess: 5 });
    const matTransparent = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.1,
        transmission: 0.9,
        transparent: true,
        thickness: 0.2
    });
    const matInternal = new THREE.MeshPhongMaterial({ color: 0x90a4ae });
    const matInternalHEPA = new THREE.MeshPhongMaterial({ color: 0xe0e0e0, wireframe: true });
    const matInternalCarbon = new THREE.MeshPhongMaterial({ color: 0x37474f });
    const matSolar = createSolarTexture();
    const matDisplay = createDisplayCanvas();

    // BASE
    const baseGeo = new THREE.BoxGeometry(1.4, 0.7, 1.4);
    const baseMesh = new THREE.Mesh(baseGeo, matTransparent);
    baseMesh.position.y = 0.35;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    rootGroup.add(baseMesh);

    baseComponentsGroup = new THREE.Group();
    rootGroup.add(baseComponentsGroup);

    const filterHepa = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.4, 16), matInternalHEPA);
    filterHepa.position.set(-0.35, 0.35, -0.35);
    baseComponentsGroup.add(filterHepa);

    const filterCarbon = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.4, 16), matInternalCarbon);
    filterCarbon.position.set(0.35, 0.35, -0.35);
    baseComponentsGroup.add(filterCarbon);

    const battery = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.4), matInternal);
    battery.position.set(0, 0.35, 0.3);
    baseComponentsGroup.add(battery);

    // STEM
    const stemGeo = new THREE.CylinderGeometry(0.12, 0.16, 4.0, 16);
    const stemMesh = new THREE.Mesh(stemGeo, matStem);
    stemMesh.position.y = 0.7 + 2.0;
    stemMesh.castShadow = true;
    rootGroup.add(stemMesh);

    const bandGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.5, 24);
    const bandMesh = new THREE.Mesh(bandGeo, matDisplay);
    bandMesh.position.y = 0.7 + 2.0;
    stemDisplayGroup = new THREE.Group();
    stemDisplayGroup.add(bandMesh);
    rootGroup.add(stemDisplayGroup);

    // FOLIAGE
    foliageGroup = new THREE.Group();
    rootGroup.add(foliageGroup);
    const foliageCenter = new THREE.Vector3(0, 4.7, 0);

    function addLeaf(scale, offset) {
        const leafGeo = new THREE.DodecahedronGeometry(scale, 1);
        const leafMesh = new THREE.Mesh(leafGeo, matFoliage);
        leafMesh.position.copy(foliageCenter).add(offset);
        leafMesh.castShadow = true;
        foliageGroup.add(leafMesh);
        return leafMesh;
    }

    const leaves = [
        addLeaf(1.1, new THREE.Vector3(0, 0, 0)),
        addLeaf(0.8, new THREE.Vector3(0.6, 0.4, 0.2)),
        addLeaf(0.8, new THREE.Vector3(-0.6, 0.3, -0.2)),
        addLeaf(0.7, new THREE.Vector3(0.2, 0.8, -0.3)),
        addLeaf(0.6, new THREE.Vector3(-0.2, -0.5, 0.4))
    ];

    // SOLAR PANELS
    leaves.forEach((leaf, i) => {
        if (i < 3) {
            const solarGeo = new THREE.PlaneGeometry(0.35, 0.45);
            const solarMesh = new THREE.Mesh(solarGeo, matSolar);
            solarMesh.position.copy(leaf.position).add(new THREE.Vector3(0, 0.35 * leaf.scale.y, 0.1));
            solarMesh.rotation.x = -Math.PI / 3;
            foliageGroup.add(solarMesh);
        }
    });

    // CORD & PLUG
    const cordPoints = [
        new THREE.Vector3(0.6, 0.1, 0),
        new THREE.Vector3(1.3, 0.05, 0.4),
        new THREE.Vector3(2.2, 0.02, 0),
        new THREE.Vector3(2.2, 0.8, 0)
    ];
    const cordPath = new THREE.CatmullRomCurve3(cordPoints);
    const cordGeo = new THREE.TubeGeometry(cordPath, 32, 0.015, 8, false);
    const cordMat = new THREE.MeshPhongMaterial({ color: 0x212121 });
    const cordMesh = new THREE.Mesh(cordGeo, cordMat);
    rootGroup.add(cordMesh);

    const plugGeo = new THREE.BoxGeometry(0.08, 0.12, 0.08);
    const plugMesh = new THREE.Mesh(plugGeo, cordMat);
    plugMesh.position.set(2.2, 0.8, 0);
    rootGroup.add(plugMesh);
}

function createSolarTexture() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 64;
    canvas.height = 64;
    ctx.fillStyle = '#0d47a1';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#64b5f6';
    ctx.lineWidth = 1;
    for (let i = 0; i < 64; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 64);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(64, i);
        ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
}

function createDisplayCanvas() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#00e676';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PM2.5: 12', 128, 32);
    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshBasicMaterial({ map: texture });
}

function createOxygenParticles() {
    const positions = [];
    const velocities = [];
    const particleGeo = new THREE.BufferGeometry();
    const particleMat = new THREE.PointsMaterial({
        color: 0xb9f6ca,
        size: 0.12,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });

    for (let i = 0; i < particleCount; i++) {
        positions.push(
            (Math.random() - 0.5) * 3,
            4.5 + Math.random() * 2,
            (Math.random() - 0.5) * 3
        );
        velocities.push(
            (Math.random() - 0.5) * 0.01,
            (Math.random() * 0.01) + 0.005,
            (Math.random() - 0.5) * 0.01
        );
    }

    particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    oxygenParticles = new THREE.Points(particleGeo, particleMat);
    oxygenParticles.userData = { velocities: velocities };
    scene.add(oxygenParticles);
}

function updateOxygenParticles() {
    const positions = oxygenParticles.geometry.attributes.position.array;
    const velocities = oxygenParticles.userData.velocities;

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += velocities[i * 3];
        positions[i * 3 + 1] += velocities[i * 3 + 1];
        positions[i * 3 + 2] += velocities[i * 3 + 2];

        if (positions[i * 3 + 1] > 8) {
            positions[i * 3] = (Math.random() - 0.5) * 2;
            positions[i * 3 + 1] = 4.5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
        }
    }
    oxygenParticles.geometry.attributes.position.needsUpdate = true;
}

function onWindowResize() {
    const container = document.querySelector('.canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    if (oxygenParticles) updateOxygenParticles();
    renderer.render(scene, camera);
}

document.addEventListener('DOMContentLoaded', function() {
    init();
    animate();
});