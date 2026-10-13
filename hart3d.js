// Het 3D-hart van Streamers met een Hart: een glazen hart dat in een hartslagritme klopt en zich
// vult met roze "vloeistof" tot het opgehaalde deel van het doel. Het vloeistofoppervlak blijft
// waterpas (clipping plane in wereldruimte), ook als het hart kantelt of meebeweegt met de muis.
// Kleine groene en gouden hartjes draaien eromheen, lichtvonkjes stijgen op.
//
//   const h = startHart(canvas, { fractie: 0.07, muis: true, hartjes: 9, vonken: true, afstand: 8.6 });
//   h.zetFractie(0.1);   // vullen tot 10%
//   h.pof();             // snelle draai + extra klop, bv. bij een nieuwe donatie
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const GROEN = 0x52c285, ROZE = 0xe23f73, GOUD = 0xf0b44a;

function hartVorm() {
    const s = new THREE.Shape();
    s.moveTo(0, -0.95); s.bezierCurveTo(-0.35, -0.6, -1.05, -0.2, -1.05, 0.32);
    s.bezierCurveTo(-1.05, 0.8, -0.65, 1.05, -0.35, 1.05); s.bezierCurveTo(-0.12, 1.05, 0, 0.88, 0, 0.72);
    s.bezierCurveTo(0, 0.88, 0.12, 1.05, 0.35, 1.05); s.bezierCurveTo(0.65, 1.05, 1.05, 0.8, 1.05, 0.32);
    s.bezierCurveTo(1.05, -0.2, 0.35, -0.6, 0, -0.95);
    return s;
}
function hartGeo(dik = 0.5, bol = 0.32) {
    const g = new THREE.ExtrudeGeometry(hartVorm(), { depth: dik, bevelEnabled: true, bevelThickness: bol, bevelSize: bol * 0.75, bevelSegments: 12, curveSegments: 48 });
    g.computeBoundingBox();
    const b = g.boundingBox;
    g.translate(-(b.max.x + b.min.x) / 2, -(b.max.y + b.min.y) / 2, -(b.max.z + b.min.z) / 2);
    g.computeVertexNormals();
    return g;
}

export function startHart(canvas, { fractie = 0, muis: volgMuis = true, hartjes: aantalHartjes = 9, vonken = true, afstand = 8.6 } = {}) {
    const rustig = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.localClippingEnabled = true;
    const scene = new THREE.Scene();
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, afstand);

    const houder = new THREE.Group();
    scene.add(houder);

    // glazen schil
    // (geen transmission: het canvas is transparant, dan valt er niks te breken en wordt het grijs)
    const glas = { color: 0xd9ffe9, roughness: 0.04, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.7, iridescenceIOR: 1.35,
        transparent: true, opacity: 0.1, depthWrite: false, envMapIntensity: 2.2, specularIntensity: 1 };
    const binnenkant = new THREE.Mesh(hartGeo(), new THREE.MeshPhysicalMaterial({ ...glas, side: THREE.BackSide, opacity: 0.06 }));
    const schil = new THREE.Mesh(hartGeo(), new THREE.MeshPhysicalMaterial(glas));
    binnenkant.renderOrder = 1; schil.renderOrder = 3;
    houder.add(binnenkant, schil);

    // vloeistof: iets kleiner hart, afgesneden door een horizontaal vlak op vulhoogte
    const vlak = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const vloeistof = new THREE.Mesh(hartGeo(0.38, 0.27), new THREE.MeshPhysicalMaterial({
        color: ROZE, emissive: ROZE, emissiveIntensity: 0.35, roughness: 0.25, clearcoat: 1, side: THREE.DoubleSide,
        clippingPlanes: [vlak], sheen: 0.6, sheenColor: new THREE.Color(0xffc2d6),
    }));
    vloeistof.scale.setScalar(0.86);
    vloeistof.renderOrder = 2;
    houder.add(vloeistof);

    // gloed achter het hart
    const gloedTex = (() => {
        const c = document.createElement('canvas'); c.width = c.height = 128;
        const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(c);
    })();
    const gloed = new THREE.Sprite(new THREE.SpriteMaterial({ map: gloedTex, color: ROZE, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    gloed.scale.setScalar(5.5); gloed.position.z = -1.2;
    scene.add(gloed);

    // kleine hartjes die eromheen draaien
    const klein = hartGeo(0.25, 0.14);
    const hartjes = Array.from({ length: aantalHartjes }, (_, i) => {
        const k = [GROEN, GOUD, GROEN, ROZE][i % 4];
        const m = new THREE.Mesh(klein, new THREE.MeshPhysicalMaterial({ color: k, emissive: k, emissiveIntensity: 0.15, roughness: 0.2, metalness: k === GOUD ? 0.8 : 0.2, clearcoat: 1 }));
        m.scale.setScalar(0.14 + (i % 3) * 0.05);
        scene.add(m);
        return { m, hoek: (i / aantalHartjes) * Math.PI * 2, straal: 2.1 + (i % 3) * 0.35, hoogte: ((i % 5) - 2) * 0.45, snel: 0.25 + (i % 4) * 0.06 };
    });

    // opstijgende vonkjes
    const N = 160, pos = new Float32Array(N * 3), sn = new Float32Array(N);
    for (let i = 0; i < N; i++) { pos.set([(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 7, -2 + Math.random() * 3], i * 3); sn[i] = 0.15 + Math.random() * 0.4; }
    const vg = new THREE.BufferGeometry(); vg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    if (vonken) scene.add(new THREE.Points(vg, new THREE.PointsMaterial({ size: 0.06, map: gloedTex, color: 0xffe3a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

    // licht
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const lRoze = new THREE.PointLight(ROZE, 40, 20); lRoze.position.set(-2.5, 1.5, 3); scene.add(lRoze);
    const lGroen = new THREE.PointLight(GROEN, 45, 20); lGroen.position.set(2.8, -1.4, 2.6); scene.add(lGroen);
    const zon = new THREE.DirectionalLight(0xffffff, 1.6); zon.position.set(1.5, 3, 4); scene.add(zon);

    function maat() {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    maat();
    new ResizeObserver(maat).observe(canvas);

    const muis = { x: 0, y: 0 }, doel = { x: 0, y: 0 };
    if (volgMuis) addEventListener('pointermove', e => { doel.x = e.clientX / innerWidth - 0.5; doel.y = e.clientY / innerHeight - 0.5; });

    let doelFractie = fractie, huidigFractie = 0, spin = 0, draai = 0, extraKlop = 0;
    const doos = new THREE.Box3();
    const klok = new THREE.Clock();
    renderer.setAnimationLoop(() => {
        const dt = Math.min(klok.getDelta(), 0.1), t = rustig ? 1.2 : klok.elapsedTime;
        muis.x += (doel.x - muis.x) * 0.05; muis.y += (doel.y - muis.y) * 0.05;
        // hartslag: lub-dub elke 1,1 s
        const f = (t % 1.1) / 1.1;
        const slag = rustig ? 0 : Math.exp(-Math.pow((f - 0.08) / 0.05, 2)) * 0.07 + Math.exp(-Math.pow((f - 0.28) / 0.06, 2)) * 0.045;
        spin *= Math.pow(0.05, dt); draai += dt * spin; extraKlop *= Math.pow(0.02, dt);
        // na een pof weer netjes naar voren draaien (veelvoud van een hele slag)
        if (spin < 1.5) draai += (Math.round(draai / (Math.PI * 2)) * Math.PI * 2 - draai) * Math.min(1, dt * 3);
        houder.scale.setScalar(1.22 * (1 + slag + extraKlop * 0.25));
        houder.rotation.y = Math.sin(t * 0.5) * 0.35 + muis.x * 0.8 + draai;
        houder.rotation.x = Math.sin(t * 0.37) * 0.08 + muis.y * 0.4;
        houder.position.y = Math.sin(t * 0.8) * 0.08;
        gloed.material.opacity = 0.45 + slag * 3;

        // vullen tot het doel, met een zacht golvend oppervlak
        huidigFractie += (doelFractie - huidigFractie) * Math.min(1, dt * 1.2);
        houder.updateMatrixWorld(true);
        doos.setFromObject(vloeistof, true);
        const vul = Math.min(1, Math.max(0, huidigFractie));
        const y = doos.min.y + (doos.max.y - doos.min.y) * (vul * 0.96 + 0.02);
        const golf = rustig ? 0 : Math.sin(t * 2.2) * 0.035;
        vlak.normal.set(Math.sin(t * 1.3) * 0.04 * (rustig ? 0 : 1), -1, 0).normalize();
        vlak.constant = y + golf;
        vloeistof.visible = vul > 0.005;

        hartjes.forEach(h => {
            const a = h.hoek + t * h.snel;
            h.m.position.set(Math.cos(a) * h.straal, h.hoogte + Math.sin(t + h.hoek * 2) * 0.15, Math.sin(a) * h.straal * 0.6);
            h.m.rotation.y = a * 2; h.m.rotation.z = Math.sin(t + h.hoek) * 0.3;
        });
        if (!rustig) {
            for (let i = 0; i < N; i++) { pos[i * 3 + 1] += sn[i] * dt; if (pos[i * 3 + 1] > 3.5) pos[i * 3 + 1] = -3.5; }
            vg.attributes.position.needsUpdate = true;
        }
        renderer.render(scene, camera);
    });
    return { zetFractie: f => { doelFractie = f; }, pof: () => { spin = 16; extraKlop = 1; } };
}
