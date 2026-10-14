import * as THREE from 'three';

// Align the planet with the ring's negative Z axis, preserving its original
// distance (and therefore apparent size) in the baked sky.
export const PLANET_POSITION = Object.freeze([0, 0, -Math.hypot(1400, 450, 3400)]);

// The planet and stars are rendered only once into a cubemap, then used as a
// static backdrop. No image requests, animation, or per-frame planet shading.
export function createSky(renderer) {
  const sky = new THREE.Scene();
  sky.background = new THREE.Color('#030710');
  let seed = 73415;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const positions = [], colors = [];
  for (let i = 0; i < 9500; i++) {
    const z = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const radial = Math.sqrt(1 - z * z);
    positions.push(9000 * radial * Math.cos(angle), 9000 * z, 9000 * radial * Math.sin(angle));
    const brightness = 0.35 + random() * 0.65;
    colors.push(brightness, brightness * (0.8 + random() * 0.2), brightness * (0.7 + random() * 0.3));
  }
  const stars = new THREE.BufferGeometry();
  stars.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  stars.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  sky.add(new THREE.Points(stars, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true })));
  const planetMaterial = new THREE.ShaderMaterial({
    vertexShader: `varying vec3 localNormal;
      void main(){localNormal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying vec3 localNormal;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
        mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){vec3 n=normalize(localNormal);
        float turbulence=noise(n*18.0)*0.6+noise(n*47.0)*0.25+noise(n*110.0)*0.15;
        float bands=sin(n.y*63.0+turbulence*9.0)+0.45*sin(n.y*139.0+turbulence*7.0);
        vec3 cream=vec3(0.86,0.73,0.56),rust=vec3(0.40,0.22,0.14);
        vec3 color=mix(rust,cream,smoothstep(-1.25,1.25,bands));
        color=mix(color,vec3(0.97,0.89,0.72),0.25*noise(n*80.0));
        float storm=exp(-pow((n.y+0.19)*19.0,2.0)-pow((n.x-0.22)*8.0,2.0));
        color=mix(color,vec3(0.55,0.23,0.12),storm*0.8);
        float light=max(dot(n,normalize(vec3(-0.8,0.6,1.0))),0.0);
        color*=0.035+0.965*pow(light,0.65);
        gl_FragColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(2200, 128, 96), planetMaterial);
  planet.position.fromArray(PLANET_POSITION);
  planet.rotation.z = -0.24;
  sky.add(planet);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(2240, 96, 64), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 n;varying vec3 viewDir;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);n=normalize(normalMatrix*normal);viewDir=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
    fragmentShader: `varying vec3 n;varying vec3 viewDir;void main(){float rim=pow(1.0-max(0.0,dot(normalize(n),normalize(viewDir))),5.0);gl_FragColor=vec4(0.38,0.62,1.0,rim*0.35);}`,
  }));
  atmosphere.position.copy(planet.position);
  sky.add(atmosphere);
  const target = new THREE.WebGLCubeRenderTarget(1024, { type: THREE.HalfFloatType });
  const camera = new THREE.CubeCamera(1, 14000, target);
  camera.update(renderer, sky);
  sky.traverse((object) => { object.geometry?.dispose(); if (object.material) object.material.dispose(); });
  return target.texture;
}
