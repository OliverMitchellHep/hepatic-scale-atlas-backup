// Hand-set organelle layout on the cytosol floor (plan view, x sinusoid(-) → canaliculus(+)). Composed, not random,
// so the picture reads at a glance. Counts are far below real numbers (mitochondria ≈1,000–2,000 per hepatocyte);
// volume fractions (Alberts MBoC; Blouin 1977) are indicative only — see README.
import { V3 } from './util.js';
export function planLayout({ binucleate = false } = {}) {
  const L = {};
  L.nuclei = binucleate ? [{ c: V3(-2.0, 0, -1.0), r: 1.2 }, { c: V3(0.7, 0, -1.7), r: 1.2 }] : [{ c: V3(-0.8, 0, -0.9), r: 1.55 }];
  L.golgi = [{ c: V3(2.35, 0, 1.0), rot: 0 }];
  L.mito = binucleate
    ? [{ c: V3(-3.9, 0, -2.3), ang: 1.4, s: 0.85 }, { c: V3(-4.0, 0, 0.6), ang: 1.57, s: 0.8 }, { c: V3(1.2, 0, -3.3), ang: 0.2, s: 0.8 }, { c: V3(3.4, 0, -1.6), ang: 1.4, s: 0.8 }, { c: V3(-2.3, 0, 1.5), ang: 0.3, s: 0.7 }]
    : [{ c: V3(-3.95, 0, -1.7), ang: 1.4, s: 0.85 }, { c: V3(-3.8, 0, -3.2), ang: 0.15, s: 0.7 }, { c: V3(2.0, 0, -3.2), ang: 0.4, s: 0.8 }, { c: V3(3.5, 0, -1.4), ang: 1.45, s: 0.75 }, { c: V3(-4.0, 0, 0.0), ang: 1.57, s: 0.7 }];
  L.lyso = [{ c: V3(3.7, 0, 0.0), r: 0.2 }, { c: V3(3.55, 0, 3.0), r: 0.22 }, { c: V3(0.7, 0, 2.7), r: 0.17 }];
  L.perox = [{ c: V3(0.2, 0, -3.5), r: 0.2 }, { c: V3(-3.2, 0, 3.4), r: 0.19 }, { c: V3(3.9, 0, -3.0), r: 0.17 }];
  L.ld = [{ c: V3(-1.0, 0, 3.3), r: 0.42 }, { c: V3(-2.3, 0, 3.5), r: 0.27 }];
  L.glyc = [{ c: V3(3.0, 0, 2.7), r: 0.4 }, { c: V3(-3.5, 0, 1.7), r: 0.4 }];
  L.confetti = [[-1.5, 2.2, 0.1], [0.3, 1.9, 0.12], [1.4, -2.4, 0.13], [-3.0, -3.0, 0.1], [2.7, -3.0, 0.11], [0.0, 3.6, 0.1], [3.9, 1.6, 0.1], [-4.1, 2.3, 0.09]].map(([x, z, r]) => ({ x, z, r }));
  L.serSeeds = [[-3.5, 2.5], [-2.4, 2.2], [-4.0, 3.2]];
  return L;
}
