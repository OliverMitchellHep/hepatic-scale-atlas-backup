// Shared material factory. All organelle materials are MeshPhysicalMaterial patched (onBeforeCompile) with:
//  - the cross-section cut (one wedge test in world space, shared uniforms)
//  - procedural bump (screen-derivative, no textures), faked sub-surface, membrane rim
//  - optional back-face "cap" colour (sections read as solid), fenestration holes, microvillus sway
//  - dim / highlight uniforms per material for hover, focus and isolate modes
// See STYLE_SPEC.md sections 4-5.
import * as THREE from 'three';

const NOISE = /* glsl */`
float h31(vec3 p){ p = fract(p*vec3(0.1031,0.1030,0.0973)); p += dot(p, p.yxz+33.33); return fract((p.x+p.y)*p.z); }
float vnoise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x), mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x), mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm3(vec3 p){ return vnoise(p)*0.5 + vnoise(p*2.03)*0.3 + vnoise(p*4.1)*0.2; }
`;

const PERTURB = /* glsl */`
vec3 perturbN( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
  vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
  vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
  vec3 vN = surf_norm;
  vec3 R1 = cross( vSigmaY, vN );
  vec3 R2 = cross( vN, vSigmaX );
  float fDet = dot( vSigmaX, R1 ) * faceDirection;
  vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
  return normalize( abs( fDet ) * surf_norm - vGrad );
}
`;

export function createShared() {
  return {
    uTime: { value: 0 }, uCutOn: { value: 1 }, uCutY: { value: 0.35 }, uCutZ: { value: 0.2 },
    uBumpK: { value: 1 }, uSssK: { value: 0.6 }, uSway: { value: 1 }, uRimK: { value: 1 },
  };
}

const col = (c) => new THREE.Color(c);

/**
 * opts: color, roughness, metalness, clearcoat, opacity, transparent, side, depthWrite,
 *  bump (0..), bumpFreq, sss (0..1), sssColor, rim (0..1), rimColor, cap (hex|null), holes ({t,freq}|null),
 *  sway (0..), domain ({sin,can,lat}), shell ({front,back}), emissive, emissiveIntensity, type (registry id), dimAlpha,
 *  capPlane ('floor'|'wall'), vertexColors, fog
 */
export function makeMaterial(shared, o = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color: col(o.color ?? '#ffffff'),
    roughness: o.roughness ?? 0.5,
    metalness: o.metalness ?? 0,
    clearcoat: o.clearcoat ?? 0,
    clearcoatRoughness: 0.35,
    transparent: !!o.transparent,
    opacity: o.opacity ?? 1,
    side: o.side ?? THREE.FrontSide,
    depthWrite: o.depthWrite ?? !o.transparent,
    vertexColors: !!(o.vertexColors || o.domain),
    emissive: col(o.emissive ?? '#000000'),
    emissiveIntensity: o.emissiveIntensity ?? 1,
    envMapIntensity: o.envMapIntensity ?? 0.6,
    blending: o.blending ?? THREE.NormalBlending,
    polygonOffset: !!o.polygonOffset, polygonOffsetFactor: o.polygonOffset ?? 0, polygonOffsetUnits: o.polygonOffset ?? 0,
  });
  m.userData.type = o.type || null;
  const own = {
    uDim: { value: 0 }, uHi: { value: 0 }, uHiCol: { value: col('#ffffff') },
    uBump: { value: o.bump ?? 0 }, uBumpFreq: { value: o.bumpFreq ?? 6 },
    uSss: { value: o.sss ?? 0 }, uSssCol: { value: col(o.sssColor ?? o.color ?? '#ffffff') },
    uRim: { value: o.rim ?? 0 }, uRimCol: { value: col(o.rimColor ?? o.color ?? '#ffffff') },
    uCapCol: { value: col(o.cap ?? '#ffffff') },
    uHoleT: { value: o.holes?.t ?? 0 }, uHoleF: { value: o.holes?.freq ?? 3 },
    uColSin: { value: col(o.domain?.sin ?? '#fff') }, uColCan: { value: col(o.domain?.can ?? '#fff') }, uColLat: { value: col(o.domain?.lat ?? '#fff') },
    uAF: { value: o.shell?.front ?? 0.2 }, uAB: { value: o.shell?.back ?? 0.3 },
    uSwayAmp: { value: o.sway ?? 0 }, uMeshCol: { value: col(o.meshTex ?? '#ffffff') },
  };
  m.userData.own = own;
  const defs = [];
  if (o.bump) defs.push('USE_BUMPN');
  if (o.cap) defs.push('USE_CAP');
  if (o.holes) defs.push('USE_HOLES');
  if (o.sway) defs.push('USE_SWAY');
  if (o.domain) defs.push('USE_DOMAIN');
  if (o.shell) defs.push('USE_SHELL');
  if (o.capPlane === 'floor') defs.push('CAP_FLOOR');
  if (o.capPlane === 'wall') defs.push('CAP_WALL');
  if (o.noCut) defs.push('NO_CUT');
  if (o.dimAlpha) defs.push('DIM_ALPHA');
  if (o.lsec) defs.push('USE_LSEC');
  if (o.meshTex) defs.push('USE_MESHTEX');
  if (o.wbump) defs.push('USE_WBUMP');
  if (o.mask) own.uMask = { value: o.mask };
  m.userData.key = defs.join('|');
  m.customProgramCacheKey = () => 'hl:' + m.userData.key;

  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared, own);
    const d = defs.map((x) => `#define ${x}`).join('\n');
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
${d}
uniform float uTime; uniform float uSway; uniform float uSwayAmp;
varying vec3 vWPos; varying vec3 vLPos;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_SWAY
{ float sh = max(position.y, 0.0);
  #ifdef USE_INSTANCING
  float ph = instanceMatrix[3].x*1.7 + instanceMatrix[3].y*2.3 + instanceMatrix[3].z*1.1;
  #else
  float ph = 0.0;
  #endif
  transformed.x += sin(uTime*1.3+ph)*sh*sh*0.10*uSway*uSwayAmp;
  transformed.z += cos(uTime*1.1+ph*1.3)*sh*sh*0.10*uSway*uSwayAmp; }
#endif`)
      .replace('#include <project_vertex>', `#include <project_vertex>
{ vec4 wp_ = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  wp_ = instanceMatrix * wp_;
  #endif
  vWPos = (modelMatrix * wp_).xyz; vLPos = transformed; }`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
${d}
uniform float uTime, uCutOn, uCutY, uCutZ, uDim, uHi, uBump, uBumpFreq, uSss, uRim, uHoleT, uHoleF, uAF, uAB;
uniform float uBumpK, uSssK, uRimK;
uniform vec3 uHiCol, uSssCol, uRimCol, uCapCol, uColSin, uColCan, uColLat, uMeshCol;
varying vec3 vWPos; varying vec3 vLPos;
${NOISE}
${PERTURB}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
#ifndef NO_CUT
  #ifdef CAP_FLOOR
  if (uCutOn < 0.5 || vWPos.z < uCutZ) discard;
  #elif defined(CAP_WALL)
  if (uCutOn < 0.5 || vWPos.y < uCutY) discard;
  #else
  if (uCutOn > 0.5 && vWPos.y > uCutY && vWPos.z > uCutZ) discard;
  #endif
#endif
#ifdef USE_HOLES
  if (fbm3(vLPos*uHoleF) < uHoleT) discard;
#endif`)
      .replace('#include <color_fragment>', `#include <color_fragment>
#ifdef USE_DOMAIN
  diffuseColor.rgb = uColSin*vColor.r + uColCan*vColor.g + uColLat*vColor.b;
#endif
#ifdef USE_SHELL
  diffuseColor.a = gl_FrontFacing ? uAF : uAB;
#endif
#ifdef USE_MESHTEX
  { float rr = 1.0 - abs(2.0*fbm3(vWPos*1.7)-1.0); float rr2 = 1.0 - abs(2.0*fbm3(vWPos*3.1+7.0)-1.0);
    float ln = smoothstep(0.90, 0.985, max(rr, rr2*0.96));
    diffuseColor.rgb = mix(diffuseColor.rgb*(0.85+0.3*fbm3(vWPos*0.9)), uMeshCol, ln*0.75); diffuseColor.a = mix(diffuseColor.a, min(1.0, diffuseColor.a+0.35), ln); }
#endif
#ifdef USE_CAP
  if (!gl_FrontFacing) { float cn = fbm3(vLPos*5.0); diffuseColor.rgb = uCapCol*(0.88+0.24*cn); }
#endif`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
#ifdef USE_BUMPN
  {
    #ifdef USE_WBUMP
    vec3 bp = vWPos*uBumpFreq*0.35;
    #else
    vec3 bp = vLPos*uBumpFreq;
    #endif
    float fw = length(fwidth(bp)); float fade = 1.0/(1.0+fw*2.5);
    float hh = (vnoise(bp)*0.65 + vnoise(bp*2.3+3.1)*0.35) * uBump*uBumpK*fade;
    vec2 dH = vec2(dFdx(hh), dFdy(hh));
    normal = perturbN( -vViewPosition, normal, dH*14.0, faceDirection ); }
#endif`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{ float ndv_ = clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);
  float fr_ = pow(1.0-ndv_, 2.5);
  totalEmissiveRadiance += uSssCol * uSss * uSssK * (0.18 + fr_);
  totalEmissiveRadiance += uRimCol * uRim * uRimK * pow(1.0-ndv_, 3.0);
  totalEmissiveRadiance += uHiCol * uHi * (0.30 + fr_*0.9);
  #ifdef USE_SHELL
  diffuseColor.a = clamp(diffuseColor.a + uRim*uRimK*pow(1.0-ndv_, 3.0)*0.55 + uHi*0.25, 0.0, 1.0);
  #endif
  #ifdef USE_CAP
  if (!gl_FrontFacing) totalEmissiveRadiance = uCapCol*0.22;
  #endif
}`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb*0.14, uDim);
#ifdef DIM_ALPHA
gl_FragColor.a *= mix(1.0, 0.3, uDim);
#endif`);
    m.userData.shader = shader;
  };
  return m;
}

/** Dim / highlight helpers over a list of materials. */
export function setDim(mats, v) { for (const m of mats) m.userData.own.uDim.value = v; }
export function setHi(mats, v, color) {
  for (const m of mats) { m.userData.own.uHi.value = v; if (color) m.userData.own.uHiCol.value.set(color); }
}
