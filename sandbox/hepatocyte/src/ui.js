// DOM UI: dark navy panels, light type (STYLE_SPEC.md §2, §8). Deliberately minimal: title, numbered "how it works" guide
// (doubles as the legend), section/binucleate switches, play/speed, tool strip, details panel. Strings come from data/labels.json.
const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
export const ICON = {
  rotate: svg('<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v4.5h4.5"/>'),
  isolate: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>'),
  hide: svg('<path d="M3 3l18 18"/><path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c5 0 8.5 4.5 9.5 6a17 17 0 0 1-3.2 3.7M6.4 7.7A17 17 0 0 0 2.5 12c1 1.5 4.5 6 9.5 6 1.3 0 2.5-.3 3.6-.8"/><path d="M9.9 10a3 3 0 0 0 4.1 4.1"/>'),
  reset: svg('<path d="M4 4h3M4 4v3M20 4h-3M20 4v3M4 20h3M4 20v-3M20 20h-3M20 20v-3"/><path d="M12 8l5 8-3-1-2 3-2-3-3 1 5-8z" fill="currentColor" stroke="none"/>'),
  camera: svg('<path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4V8z"/><circle cx="12" cy="13" r="3.4"/>'),
  play: svg('<path d="M8 5.5v13l11-6.5-11-6.5z" fill="currentColor"/>'),
  pause: svg('<path d="M8 5.5v13M16 5.5v13" stroke-width="3"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
};

const CSS = (t) => `
.hl-root{position:relative;width:100%;height:100%;overflow:hidden;background:${t.bg};color:${t.text};font-family:${t.fontUi};font-size:13px;line-height:1.4;user-select:none;-webkit-user-select:none;touch-action:none}
.hl-root *{box-sizing:border-box}
.hl-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;outline:none}
.hl-ui{position:absolute;inset:0;pointer-events:none}.hl-ui>*{pointer-events:auto}
.hl-card{background:${t.panel};border:1px solid ${t.panelBorder};border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.5);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.hl-pad{padding:14px 16px}
.hl-cap{font-family:${t.fontDisplay};font-style:italic;text-transform:uppercase;letter-spacing:.18em;font-size:12px;color:${t.textFaint};margin:0 0 10px}
.hl-title{position:absolute;left:28px;top:18px;pointer-events:none!important}
.hl-title h1{font-family:${t.fontDisplay};font-weight:500;font-size:60px;line-height:1;margin:0;letter-spacing:-.01em}
.hl-title p{font-family:${t.fontDisplay};font-style:italic;font-size:21px;margin:6px 0 0;color:${t.textDim}}
.hl-tip{position:absolute;left:30px;top:112px;font-size:12.5px;color:${t.textFaint};pointer-events:none!important}
.hl-left{position:absolute;left:20px;top:150px;width:290px}
.hl-right{position:absolute;right:20px;top:18px;bottom:20px;width:310px;display:flex;flex-direction:column;gap:10px;pointer-events:none!important}.hl-right>*{pointer-events:auto}
.hl-row{display:flex;align-items:center;justify-content:space-between;gap:10px;font-family:${t.fontDisplay};font-size:16px;color:${t.textDim}}
.hl-row+.hl-row{margin-top:10px;padding-top:10px;border-top:1px dashed ${t.panelBorder}}
.hl-switch{position:relative;width:44px;height:24px;flex:none;border-radius:99px;background:#22315a;border:1px solid ${t.panelBorder};cursor:pointer}
.hl-switch:after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#dbe4ff;transition:left .15s}
.hl-switch.on{background:${t.accent}}.hl-switch.on:after{left:22px}
.hl-flow{display:flex;align-items:center;gap:10px;font-size:12px;color:${t.textDim}}
.hl-flow input{flex:1;accent-color:${t.accent}}
.hl-pp{width:34px;height:32px;display:grid;place-items:center;border-radius:9px;background:rgba(255,255,255,.05);border:1px solid ${t.panelBorder};color:${t.text};cursor:pointer;padding:0}
.hl-steps{display:flex;flex-direction:column;gap:12px;margin:0;padding:0;list-style:none}
.hl-steps li{display:flex;gap:12px;align-items:flex-start;font-size:13.5px;line-height:1.35;color:${t.text}}
.hl-steps .n{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font:600 13px ${t.fontUi};color:#061024}
.hl-dir{margin-top:14px;padding-top:10px;border-top:1px dashed ${t.panelBorder};font-size:12px;color:${t.textDim}}
.hl-dir div{display:flex;align-items:center;gap:8px;margin-top:4px}
.hl-tools{position:absolute;left:20px;bottom:20px;display:flex;padding:6px}
.hl-tools button,.hl-shot button{display:flex;align-items:center;gap:8px;padding:8px 14px;background:none;border:0;color:${t.textDim};font:500 14px ${t.fontUi};cursor:pointer;border-radius:10px;border-right:1px solid ${t.panelBorder}}
.hl-tools button:last-child,.hl-shot button:last-child{border-right:0}
.hl-tools button:hover,.hl-shot button:hover{color:${t.text};background:rgba(255,255,255,.05)}
.hl-tools button.on{color:${t.text};background:color-mix(in srgb, ${t.accent} 25%, transparent)}
.hl-shot{position:absolute;right:20px;bottom:20px;display:flex;padding:6px}
.hl-details{flex:1;min-height:0;display:none;flex-direction:column;overflow:hidden}.hl-details.show{display:flex}
.hl-details .hd{display:flex;align-items:flex-start;gap:10px;padding:14px 14px 8px}
.hl-details .hd .sw{width:12px;height:12px;border-radius:4px;flex:none;margin-top:8px}
.hl-details .hd h2{margin:0;font-family:${t.fontDisplay};font-weight:500;font-size:26px;line-height:1.1;flex:1}
.hl-x{background:none;border:0;color:${t.textDim};cursor:pointer;padding:2px}.hl-x:hover{color:${t.text}}
.hl-details .bd{overflow:auto;padding:0 14px 14px;font-size:12.5px;color:${t.textDim}}
.hl-details .bd h5{margin:14px 0 4px;font-family:${t.fontDisplay};font-style:italic;text-transform:uppercase;letter-spacing:.16em;font-size:11.5px;color:${t.textFaint};font-weight:500}
.hl-details .bd p{margin:0;color:${t.text};opacity:.92}.hl-details .bd ul{margin:0;padding-left:16px}.hl-details .bd li{margin:2px 0}
.hl-details .bd .src{font-size:11px;color:${t.textFaint}}.hl-details .bd .unc{color:#e8c66a}
.hl-labels{position:absolute;inset:0;pointer-events:none!important;overflow:hidden}
.hl-lab{position:absolute;left:0;top:0;white-space:nowrap;font-size:12px;padding:3px 10px;border-radius:99px;background:rgba(9,17,38,.92);border:1px solid var(--c,#4a5f99);color:${t.text};box-shadow:0 4px 12px rgba(0,0,0,.5);will-change:transform}
.hl-lab.ctx{font-size:11px;color:${t.textDim};background:rgba(9,17,38,.7)}
.hl-lab b{display:inline-grid;place-items:center;width:17px;height:17px;border-radius:50%;margin-right:6px;background:var(--c);color:#061024;font-size:11px}
.hl-loading{position:absolute;inset:0;display:grid;place-items:center;background:#000;z-index:5;transition:opacity .5s}
.hl-loading div{text-align:center;font-family:${t.fontDisplay};font-size:26px;color:${t.textDim}}
.hl-loading small{display:block;font:12px ${t.fontUi};color:${t.textFaint};margin-top:8px}
.hl-loading .bar{width:220px;height:3px;background:#101a33;margin:14px auto 0;border-radius:3px;overflow:hidden}.hl-loading .bar i{display:block;height:100%;width:0;background:${t.accent}}
.hl-disc{position:absolute;left:50%;top:4px;transform:translateX(-50%);font-size:10.5px;color:${t.textFaint};pointer-events:none!important;white-space:nowrap}
.hl-mobbar{display:none;position:absolute;right:10px;top:10px;gap:6px}
.hl-mobbar button{height:38px;padding:0 12px;border-radius:12px;background:${t.panel};border:1px solid ${t.panelBorder};color:${t.textDim};font:500 12px ${t.fontUi};cursor:pointer}
.hl-mob .hl-title h1{font-size:36px}.hl-mob .hl-title{left:14px;top:10px}.hl-mob .hl-title p{font-size:15px}
.hl-mob .hl-tip,.hl-mob .hl-disc,.hl-mob .hl-tools,.hl-mob .hl-shot{display:none}
.hl-mob .hl-left{left:10px;top:auto;bottom:10px;width:calc(100% - 20px)}
.hl-mob .hl-steps{gap:6px}.hl-mob .hl-steps li{font-size:12px}.hl-mob .hl-dir{display:none}
.hl-mob .hl-mobbar{display:flex}
.hl-mob .hl-right{display:none;right:10px;top:56px;bottom:auto;width:min(300px,calc(100% - 20px));max-height:calc(100% - 200px);overflow:auto}
.hl-mob.hl-show-right .hl-right{display:flex}
`;

export class HepUI {
  constructor(root, { labels, molecules, pathways, style, api, fonts = true }) {
    this.root = root; this.L = labels; this.api = api; this.mol = molecules; this.pw = pathways.pathways[0];
    const t = style.tokens; this.t = t;
    if (fonts && !document.getElementById('hl-fonts')) {
      const l = document.createElement('link'); l.id = 'hl-fonts'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,400&family=Inter:wght@400;500;600&display=swap'; document.head.appendChild(l);
    }
    const st = document.createElement('style'); st.textContent = CSS(t); root.appendChild(st); this.styleEl = st;
    this.labelsEl = document.createElement('div'); this.labelsEl.className = 'hl-labels'; root.appendChild(this.labelsEl);
    const ui = this.ui = document.createElement('div'); ui.className = 'hl-ui'; root.appendChild(ui);
    this._labels = new Map(); this._build();
  }
  _build() {
    const { L, ui, api } = this, cls = (id) => this.mol.classes.find((c) => c.id === id);
    const steps = this.pw.stages.map((s) => `<li><span class="n" style="background:${cls(s.mol).color}">${s.n}</span><span>${s.label}</span></li>`).join('');
    ui.innerHTML = `
      <div class="hl-title"><h1>${L.title}</h1><p>${L.subtitle}</p></div>
      <div class="hl-tip">${L.tip[0]}</div>
      <div class="hl-disc">${L.disclaimer}</div>
      <div class="hl-left"><div class="hl-card hl-pad"><p class="hl-cap">How it works</p><ol class="hl-steps">${steps}</ol>
        <div class="hl-dir"><div><span style="color:#ff8f8f">●</span> ${L.context.bloodflow}: one way along the sinusoid</div><div><span style="color:${cls('bile').color}">●</span> Bile flows the opposite way</div></div></div></div>
      <div class="hl-right">
        <div class="hl-card hl-pad"><div class="hl-row"><span>${L.panels.crossSection}</span><div class="hl-switch on" data-sw="cut"></div></div>
          <div class="hl-row"><span>${L.panels.binucleate}</span><div class="hl-switch" data-sw="bin"></div></div>
          <div class="hl-row"><span class="hl-flow" style="flex:1;gap:8px"><button class="hl-pp" data-pp title="Play / pause"></button><input type="range" min="0" max="3" step="0.05" value="1" data-fl="speed" title="Speed"></span></div></div>
        <div class="hl-card hl-details"><div class="hd"><span class="sw"></span><h2></h2><button class="hl-x" title="Close">${ICON.close}</button></div><div class="bd"></div></div>
      </div>
      <div class="hl-mobbar"><button data-mb>Controls</button></div>
      <div class="hl-card hl-tools"><button data-t="rotate">${ICON.rotate}${L.toolbar.rotate}</button><button data-t="isolate">${ICON.isolate}${L.toolbar.isolate}</button><button data-t="hide">${ICON.hide}${L.toolbar.hideOthers}</button><button data-t="reset">${ICON.reset}${L.toolbar.reset}</button></div>
      <div class="hl-card hl-shot"><button data-t="shot">${ICON.camera}${L.toolbar.screenshot}</button></div>`;
    const q = (s) => ui.querySelector(s), qa = (s) => [...ui.querySelectorAll(s)];
    this.el = { details: q('.hl-details'), pp: q('[data-pp]') };
    qa('[data-sw]').forEach((b) => b.addEventListener('click', () => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); (b.dataset.sw === 'cut' ? api.setCrossSection : api.setBinucleate)(on); }));
    q('[data-fl]').addEventListener('input', (e) => api.setFlow('speed', parseFloat(e.target.value)));
    this.el.pp.addEventListener('click', () => api.setPlaying(!this.playing));
    qa('[data-t]').forEach((b) => b.addEventListener('click', () => api.tool(b.dataset.t)));
    q('[data-mb]').addEventListener('click', () => this.root.classList.toggle('hl-show-right'));
    q('.hl-details .hl-x').addEventListener('click', () => api.select(null));
    this.setPlaying(true);
  }
  setPlaying(p) { this.playing = p; this.el.pp.innerHTML = p ? ICON.pause : ICON.play; }
  setTool(name, on) { const b = this.ui.querySelector(`[data-t="${name}"]`); if (b) b.classList.toggle('on', on); }
  setSwitch(name, on) { const b = this.ui.querySelector(`[data-sw="${name}"]`); if (b) b.classList.toggle('on', on); }
  setMobile(m) { this.root.classList.toggle('hl-mob', m); }
  showDetails({ title, color, html }) {
    const d = this.el.details; d.classList.add('show'); if (this.root.classList.contains('hl-mob')) this.root.classList.add('hl-show-right');
    d.querySelector('h2').textContent = title; d.querySelector('.sw').style.background = color;
    const bd = d.querySelector('.bd'); bd.innerHTML = html; bd.scrollTop = 0;
    bd.querySelectorAll('[data-org]').forEach((a) => a.addEventListener('click', () => this.api.select(a.dataset.org)));
  }
  hideDetails() { this.el.details.classList.remove('show'); }
  /** labels: [{key,x,y,text,color,ctx,n}] (CSS px) */
  setLabels(list) {
    const seen = new Set();
    for (const l of list) {
      seen.add(l.key); let e = this._labels.get(l.key);
      if (!e) { const el = document.createElement('div'); el.className = 'hl-lab' + (l.ctx ? ' ctx' : ''); el.style.setProperty('--c', l.color || '#4a5f99'); el.innerHTML = (l.n ? `<b>${l.n}</b>` : '') + l.text; this.labelsEl.appendChild(el); e = { el }; this._labels.set(l.key, e); }
      e.el.style.transform = `translate(${l.x.toFixed(1)}px,${l.y.toFixed(1)}px) translate(-50%,-100%)`;
    }
    for (const [k, e] of this._labels) if (!seen.has(k)) { e.el.remove(); this._labels.delete(k); }
  }
  dispose() { this.ui.remove(); this.labelsEl.remove(); this.styleEl.remove(); }
}
