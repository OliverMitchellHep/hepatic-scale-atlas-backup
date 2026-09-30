// DOM UI (dark navy panels, light type — see STYLE_SPEC.md §2, §8). Pure DOM/CSS, no framework; all strings from data/labels.json.
const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const ICON = {
  solid: svg('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>'),
  layers: svg('<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 17.5l9 5 9-5" opacity=".5"/>'),
  focus: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>'),
  rotate: svg('<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v4.5h4.5"/>'),
  isolate: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>'),
  hide: svg('<path d="M3 3l18 18"/><path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c5 0 8.5 4.5 9.5 6a17 17 0 0 1-3.2 3.7M6.4 7.7A17 17 0 0 0 2.5 12c1 1.5 4.5 6 9.5 6 1.3 0 2.5-.3 3.6-.8"/><path d="M9.9 10a3 3 0 0 0 4.1 4.1"/>'),
  reset: svg('<path d="M4 4h3M4 4v3M20 4h-3M20 4v3M4 20h3M4 20v-3M20 20h-3M20 20v-3"/><path d="M12 8l5 8-3-1-2 3-2-3-3 1 5-8z" fill="currentColor" stroke="none"/>'),
  camera: svg('<path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4V8z"/><circle cx="12" cy="13" r="3.4"/>'),
  play: svg('<path d="M8 5.5v13l11-6.5-11-6.5z" fill="currentColor"/>'),
  pause: svg('<path d="M8 5.5v13M16 5.5v13" stroke-width="3"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  solo: svg('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/>', 'width="15" height="15"'),
  chev: svg('<path d="M6 9l6 6 6-6"/>', 'width="14" height="14"'),
};
export { ICON };

const shapeSvg = (shape, color, size = 14) => {
  const s = size, c = s / 2;
  let inner;
  switch (shape) {
    case 1: inner = `<path d="M${c} 1 L${s - 1} ${c} L${c} ${s - 1} L1 ${c} Z" fill="${color}"/>`; break;
    case 2: inner = `<circle cx="${c}" cy="${c}" r="${c - 2}" fill="none" stroke="${color}" stroke-width="2"/>`; break;
    case 3: inner = `<path d="M${c} 1 L${s - 1.5} ${c / 2 + 1.5} V${s - c / 2 - 1.5} L${c} ${s - 1} L1.5 ${s - c / 2 - 1.5} V${c / 2 + 1.5} Z" fill="${color}"/>`; break;
    case 4: inner = `<path d="M${c} 1.5 L${s - 1} ${s - 2} H1 Z" fill="${color}"/>`; break;
    default: inner = `<circle cx="${c}" cy="${c}" r="${c - 1.5}" fill="${color}"/>`;
  }
  return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" style="flex:none">${inner}</svg>`;
};

const CSS = (t) => `
.hl-root{position:relative;width:100%;height:100%;overflow:hidden;background:${t.bg};color:${t.text};font-family:${t.fontUi};font-size:13px;line-height:1.4;user-select:none;-webkit-user-select:none;touch-action:none}
.hl-root *{box-sizing:border-box}
.hl-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;outline:none}
.hl-ui{position:absolute;inset:0;pointer-events:none}
.hl-ui > *{pointer-events:auto}
.hl-card{background:${t.panel};border:1px solid ${t.panelBorder};border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.5);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.hl-cap{font-family:${t.fontDisplay};font-style:italic;text-transform:uppercase;letter-spacing:.18em;font-size:12px;color:${t.textFaint};margin:0 0 8px}
.hl-title{position:absolute;left:28px;top:18px;pointer-events:none!important}
.hl-title h1{font-family:${t.fontDisplay};font-weight:500;font-size:64px;line-height:1;margin:0;letter-spacing:-.01em;color:${t.text}}
.hl-title p{font-family:${t.fontDisplay};font-style:italic;font-size:22px;margin:6px 0 0;color:${t.textDim}}
.hl-tip{position:absolute;left:30px;top:132px;padding:12px 16px 10px;background:${t.note};border:1px solid ${t.noteBorder};border-radius:3px;transform:rotate(-1.4deg);font-family:${t.fontHand};font-size:17px;line-height:1.45;color:#eadfb8;box-shadow:0 6px 14px rgba(0,0,0,.45);pointer-events:none!important}
.hl-tip:before{content:"";position:absolute;left:38%;top:-9px;width:64px;height:16px;background:${t.noteBorder};opacity:.7;transform:rotate(1deg)}
.hl-left{position:absolute;left:20px;top:262px;bottom:78px;width:268px;display:flex;flex-direction:column;gap:10px;pointer-events:none!important}
.hl-left>*{pointer-events:auto}
.hl-right{position:absolute;right:20px;top:18px;bottom:20px;width:318px;display:flex;flex-direction:column;gap:10px;pointer-events:none!important}
.hl-right>*{pointer-events:auto}
.hl-pad{padding:12px 14px}
.hl-seg{display:flex;gap:8px}
.hl-seg button{flex:1;height:44px;display:grid;place-items:center;color:${t.textDim};background:rgba(255,255,255,.03);border:1px solid ${t.panelBorder};border-radius:12px;cursor:pointer;transition:.15s}
.hl-seg button:hover{color:${t.text};border-color:#34497f}
.hl-seg button.on{color:${t.text};background:color-mix(in srgb, ${t.accent} 22%, transparent);border-color:${t.accent}}
.hl-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0 0;margin-top:9px;border-top:1px dashed ${t.panelBorder};font-family:${t.fontDisplay};font-size:16px;color:${t.textDim}}
.hl-switch{position:relative;width:44px;height:24px;flex:none;border-radius:99px;background:#22315a;border:1px solid ${t.panelBorder};cursor:pointer;transition:.15s}
.hl-switch:after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#dbe4ff;transition:.15s}
.hl-switch.on{background:${t.accent}}
.hl-switch.on:after{left:22px}
.hl-tools{position:absolute;left:20px;bottom:20px;display:flex;padding:6px;gap:0}
.hl-tools button,.hl-shot button{display:flex;align-items:center;gap:8px;padding:8px 14px;background:none;border:0;color:${t.textDim};font:500 14px ${t.fontUi};cursor:pointer;border-radius:10px;border-right:1px solid ${t.panelBorder};transition:.15s}
.hl-tools button:last-child,.hl-shot button:last-child{border-right:0}
.hl-tools button:hover,.hl-shot button:hover{color:${t.text};background:rgba(255,255,255,.05)}
.hl-tools button.on{color:${t.text};background:color-mix(in srgb, ${t.accent} 25%, transparent)}
.hl-state{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);width:min(460px,calc(100% - 700px));min-width:320px;padding:10px 16px 12px}
.hl-state h4{margin:0 0 6px;display:flex;justify-content:space-between;align-items:baseline;font-family:${t.fontDisplay};font-style:italic;text-transform:uppercase;letter-spacing:.18em;font-size:12px;color:${t.textFaint};font-weight:500}
.hl-state h4 b{font-family:${t.fontUi};font-style:normal;text-transform:none;letter-spacing:0;font-size:13px;color:${t.text};font-weight:600}
.hl-range{width:100%;accent-color:${t.accent};margin:2px 0}
.hl-ends{display:flex;justify-content:space-between;font-size:11.5px;color:${t.textDim}}
.hl-hor{display:flex;gap:10px;margin-top:6px;font-size:11px;color:${t.textFaint};align-items:center}
.hl-hor i{display:block;height:5px;border-radius:4px;background:${t.accent}}
.hl-hor i.g{background:${t.accent2}}
.hl-hor span{flex:1;display:flex;align-items:center;gap:6px}
.hl-hor em{font-style:normal;flex:1;height:5px;background:#1a2748;border-radius:4px;overflow:hidden;display:block}
.hl-state p{margin:7px 0 0;font-size:11.5px;line-height:1.4;color:${t.textDim};max-height:3.9em;overflow:hidden}
.hl-pw h3,.hl-details h3,.hl-legend h3{margin:0}
.hl-pwlist{display:flex;flex-direction:column;gap:2px;max-height:calc(100vh - 470px);overflow:auto}
.hl-pwrow{display:flex;align-items:center;gap:8px;padding:6px 6px;border-radius:9px;cursor:pointer;border:1px solid transparent}
.hl-pwrow:hover{background:rgba(255,255,255,.04)}
.hl-pwrow.sel{border-color:${t.panelBorder};background:rgba(255,255,255,.05)}
.hl-pwrow .nm{flex:1;font-size:13px;color:${t.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hl-pwrow.off .nm{color:${t.textFaint};text-decoration:line-through}
.hl-dots{display:flex;gap:2px}
.hl-chk{width:18px;height:18px;border-radius:5px;border:1.5px solid #4a5f99;display:grid;place-items:center;flex:none;background:transparent;color:transparent;cursor:pointer;padding:0}
.hl-chk.on{background:${t.accent2};border-color:${t.accent2};color:#04202a}
.hl-solo{display:grid;place-items:center;width:26px;height:26px;border-radius:8px;background:none;border:1px solid transparent;color:${t.textFaint};cursor:pointer;padding:0}
.hl-solo:hover{color:${t.text}}
.hl-solo.on{color:${t.text};background:color-mix(in srgb, ${t.accent2} 30%, transparent);border-color:${t.accent2}}
.hl-flow{display:flex;flex-direction:column;gap:8px}
.hl-flow .r{display:flex;align-items:center;gap:10px;font-size:12px;color:${t.textDim}}
.hl-flow .r label{width:52px;flex:none}
.hl-flow .r input{flex:1;accent-color:${t.accent}}
.hl-pp{width:32px;height:30px;display:grid;place-items:center;border-radius:9px;background:rgba(255,255,255,.05);border:1px solid ${t.panelBorder};color:${t.text};cursor:pointer;padding:0}
.hl-details{flex:1;min-height:0;display:none;flex-direction:column;overflow:hidden}
.hl-details.show{display:flex}
.hl-details .hd{display:flex;align-items:flex-start;gap:10px;padding:14px 14px 8px}
.hl-details .hd .sw{width:12px;height:12px;border-radius:4px;flex:none;margin-top:8px}
.hl-details .hd h2{margin:0;font-family:${t.fontDisplay};font-weight:500;font-size:26px;line-height:1.1;flex:1}
.hl-x{background:none;border:0;color:${t.textDim};cursor:pointer;padding:2px}
.hl-x:hover{color:${t.text}}
.hl-details .bd{overflow:auto;padding:0 14px 14px;font-size:12.5px;color:${t.textDim}}
.hl-details .bd h5{margin:14px 0 4px;font-family:${t.fontDisplay};font-style:italic;text-transform:uppercase;letter-spacing:.16em;font-size:11.5px;color:${t.textFaint};font-weight:500}
.hl-details .bd p{margin:0;color:${t.text};opacity:.92}
.hl-details .bd ul{margin:0;padding-left:16px}
.hl-details .bd li{margin:2px 0}
.hl-details .bd .src{font-size:11px;color:${t.textFaint}}
.hl-details .bd .unc{color:#e8c66a}
.hl-details .bd a,.hl-details .bd .lnk{color:${t.accent2};cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.hl-var{display:flex;align-items:center;gap:8px;padding:4px 0}
.hl-var .b{flex:1;height:5px;background:#1a2748;border-radius:4px;position:relative;overflow:hidden}
.hl-var .b i{position:absolute;left:0;top:0;bottom:0;background:${t.accent2}}
.hl-legend .lg{max-height:230px;overflow:auto;padding-right:2px}
.hl-lgrow{display:flex;align-items:center;gap:8px;padding:2px 0;font-size:12px;color:${t.textDim}}
.hl-lgrow .g{display:flex;gap:3px;width:56px;flex:none}
.hl-lgcls{display:flex;align-items:center;gap:8px;padding:1px 0 1px 12px;font-size:11px;color:${t.textFaint}}
.hl-lghd{display:flex;align-items:center;justify-content:space-between;cursor:pointer}
.hl-shot{position:absolute;right:20px;bottom:20px;display:flex;padding:6px}
.hl-labels{position:absolute;inset:0;pointer-events:none!important;overflow:hidden}
.hl-lab{position:absolute;left:0;top:0;transform:translate(-50%,-100%);white-space:nowrap;font-size:12px;padding:3px 9px;border-radius:99px;background:rgba(9,17,38,.92);border:1px solid var(--c,#4a5f99);color:${t.text};box-shadow:0 4px 12px rgba(0,0,0,.5);will-change:transform}
.hl-lab.step{font-size:11px;padding:2px 8px;max-width:260px;overflow:hidden;text-overflow:ellipsis}
.hl-leader{position:absolute;width:1px;background:var(--c,#4a5f99);opacity:.7;transform-origin:0 0}
.hl-loading{position:absolute;inset:0;display:grid;place-items:center;background:#000;z-index:5;transition:opacity .5s}
.hl-loading div{text-align:center;font-family:${t.fontDisplay};font-size:26px;color:${t.textDim}}
.hl-loading small{display:block;font:12px ${t.fontUi};color:${t.textFaint};margin-top:8px}
.hl-loading .bar{width:220px;height:3px;background:#101a33;margin:14px auto 0;border-radius:3px;overflow:hidden}
.hl-loading .bar i{display:block;height:100%;width:0;background:${t.accent};transition:width .2s}
.hl-disc{position:absolute;left:50%;top:4px;transform:translateX(-50%);font-size:10.5px;color:${t.textFaint};pointer-events:none!important;white-space:nowrap}
.hl-hidden{display:none!important}
.hl-mob .hl-title h1{font-size:38px}.hl-mob .hl-title{left:14px;top:10px}.hl-mob .hl-title p{font-size:16px}
.hl-mob .hl-tip,.hl-mob .hl-disc{display:none}
.hl-mob .hl-left{left:10px;top:auto;bottom:130px;width:min(260px,calc(100% - 20px));max-height:45%;display:none}
.hl-mob .hl-right{right:10px;top:56px;bottom:auto;width:min(300px,calc(100% - 20px));max-height:calc(100% - 210px);overflow:auto;display:none}
.hl-mob.hl-show-left .hl-left{display:flex}.hl-mob.hl-show-right .hl-right{display:flex}
.hl-mobbar{display:none;position:absolute;right:10px;top:10px;gap:6px}
.hl-mob .hl-mobbar{display:flex}
.hl-mobbar button{height:38px;padding:0 12px;border-radius:12px;background:${t.panel};border:1px solid ${t.panelBorder};color:${t.textDim};font:500 12px ${t.fontUi};cursor:pointer}
.hl-mobbar button.on{color:${t.text};border-color:${t.accent}}
.hl-mob .hl-state p{display:none}
.hl-mob .hl-state{width:calc(100% - 20px);min-width:0;bottom:10px}
.hl-mob .hl-tools{display:none}.hl-mob .hl-shot{display:none}
`;

export class HepUI {
  constructor(root, { labels, molecules, pathways, states, style, api, fonts = true }) {
    this.root = root; this.L = labels; this.api = api; this.mol = molecules; this.pw = pathways; this.states = states;
    const t = style.tokens; this.t = t;
    if (fonts && !document.getElementById('hl-fonts')) {
      const l = document.createElement('link'); l.id = 'hl-fonts'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Cormorant+Garamond:ital,wght@0,500;1,400&family=Inter:wght@400;500;600&display=swap';
      document.head.appendChild(l);
    }
    const st = document.createElement('style'); st.textContent = CSS(t); root.appendChild(st); this.styleEl = st;
    this.labelsEl = document.createElement('div'); this.labelsEl.className = 'hl-labels'; root.appendChild(this.labelsEl);
    const ui = this.ui = document.createElement('div'); ui.className = 'hl-ui'; root.appendChild(ui);
    this._build();
    this._labels = new Map();
  }

  _build() {
    const { L, ui, api } = this;
    ui.innerHTML = `
      <div class="hl-title"><h1>${L.title}</h1><p>${L.subtitle}</p></div>
      <div class="hl-tip">${L.tip.map((x) => `<div>${x}</div>`).join('')}</div>
      <div class="hl-disc">${L.disclaimer}</div>
      <div class="hl-left">
        <div class="hl-card hl-pad hl-pw"><p class="hl-cap">${L.panels.pathways}</p><div class="hl-pwlist"></div></div>
      </div>
      <div class="hl-right">
        <div class="hl-card hl-pad hl-vm"><p class="hl-cap">${L.panels.viewMode}</p>
          <div class="hl-seg">${L.viewModes.map((m) => `<button data-m="${m.id}" title="${m.hint}">${ICON[m.id === 'solid' ? 'solid' : m.id === 'layers' ? 'layers' : 'focus']}</button>`).join('')}</div>
          <div class="hl-row"><span>${L.panels.crossSection}</span><div class="hl-switch on" data-sw="cut"></div></div>
          <div class="hl-row"><span>${L.panels.binucleate}</span><div class="hl-switch" data-sw="bin"></div></div>
        </div>
        <div class="hl-card hl-pad hl-flow"><div style="display:flex;align-items:center;gap:10px"><button class="hl-pp" data-pp title="Play / pause">${ICON.pause}</button><p class="hl-cap" style="margin:0;flex:1">${L.panels.playing}</p></div>
          <div class="r"><label>${L.panels.speed}</label><input type="range" min="0" max="3" step="0.05" value="1" data-fl="speed"></div>
          <div class="r"><label>${L.panels.density}</label><input type="range" min="0" max="1" step="0.01" value="0.85" data-fl="density"></div></div>
        <div class="hl-card hl-details"><div class="hd"><span class="sw"></span><h2></h2><button class="hl-x" title="Close">${ICON.close}</button></div><div class="bd"></div></div>
        <div class="hl-card hl-pad hl-legend"><div class="hl-lghd"><p class="hl-cap" style="margin:0">${L.panels.legend}</p><span class="hl-x">${ICON.chev}</span></div><div class="lg" style="margin-top:8px"></div></div>
      </div>
      <div class="hl-card hl-tools">
        <button data-t="rotate">${ICON.rotate}${L.toolbar.rotate}</button>
        <button data-t="isolate">${ICON.isolate}${L.toolbar.isolate}</button>
        <button data-t="hide">${ICON.hide}${L.toolbar.hideOthers}</button>
        <button data-t="reset">${ICON.reset}${L.toolbar.reset}</button>
      </div>
      <div class="hl-card hl-state"><h4><span>${L.panels.state}</span><b class="sn">Fed</b></h4>
        <input class="hl-range" type="range" min="0" max="1000" value="0"><div class="hl-ends"><span>${L.panels.fed}</span><span>${L.panels.fasted}</span></div>
        <div class="hl-hor"><span>${L.panels.insulin}<em><i class="ins" style="width:100%"></i></em></span><span>${L.panels.glucagon}<em><i class="g gl" style="width:10%"></i></em></span></div>
        <p class="sd"></p></div>
      <div class="hl-mobbar"><button data-mb="left">Pathways</button><button data-mb="right">Controls</button></div>
      <div class="hl-card hl-shot"><button data-t="shot">${ICON.camera}${L.toolbar.screenshot}</button></div>`;
    const q = (s) => ui.querySelector(s), qa = (s) => [...ui.querySelectorAll(s)];
    this.el = { details: q('.hl-details'), pwlist: q('.hl-pwlist'), lg: q('.hl-legend .lg'), sn: q('.sn'), sd: q('.sd'), range: q('.hl-range'), ins: q('.ins'), gl: q('.gl'), pp: q('[data-pp]'), left: q('.hl-left'), tip: q('.hl-tip') };
    qa('.hl-seg button').forEach((b) => b.addEventListener('click', () => api.setViewMode(b.dataset.m)));
    qa('[data-sw]').forEach((b) => b.addEventListener('click', () => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); (b.dataset.sw === 'cut' ? api.setCrossSection : api.setBinucleate)(on); }));
    qa('[data-fl]').forEach((i) => i.addEventListener('input', () => api.setFlow(i.dataset.fl, parseFloat(i.value))));
    this.el.pp.addEventListener('click', () => api.setPlaying(!this.playing));
    qa('[data-t]').forEach((b) => b.addEventListener('click', () => api.tool(b.dataset.t)));
    this.el.range.addEventListener('input', () => api.setMetabolicState(this.el.range.value / 1000));
    qa('[data-mb]').forEach((b) => b.addEventListener('click', () => { const c = 'hl-show-' + b.dataset.mb; const on = !this.root.classList.contains(c); this.root.classList.remove('hl-show-left', 'hl-show-right'); this.root.classList.toggle(c, on); qa('[data-mb]').forEach((x) => x.classList.toggle('on', x === b && on)); }));
    q('.hl-details .hl-x').addEventListener('click', () => api.select(null));
    q('.hl-lghd').addEventListener('click', () => { this.el.lg.classList.toggle('hl-hidden'); });
    this._buildPathways(); this._buildLegend();
    this.setState(0);
  }

  _fam(id) { return this.mol.classes.filter((c) => c.family === id); }
  _buildPathways() {
    const list = this.el.pwlist; list.innerHTML = '';
    this.pwRows = {};
    for (const p of this.pw.pathways) {
      const fams = [...new Set(p.variants.flatMap((v) => v.path.map((n) => n.mol)).filter(Boolean))];
      const dots = fams.slice(0, 4).map((m) => { const c = this.mol.classes.find((x) => x.id === m); return c ? shapeSvg(c.shape, c.color, 11) : ''; }).join('');
      const row = document.createElement('div'); row.className = 'hl-pwrow';
      row.innerHTML = `<button class="hl-chk on" title="Show / hide pathway">✓</button><span class="nm">${p.name}</span><span class="hl-dots">${dots}</span><button class="hl-solo" title="${this.L.panels.solo}">${ICON.solo}</button>`;
      const chk = row.querySelector('.hl-chk'), solo = row.querySelector('.hl-solo');
      chk.addEventListener('click', (e) => { e.stopPropagation(); this.api.setPathwayState(p.id, { enabled: !chk.classList.contains('on') }); });
      solo.addEventListener('click', (e) => { e.stopPropagation(); this.api.setPathwayState(p.id, { isolate: !solo.classList.contains('on') }); });
      row.addEventListener('click', () => this.api.selectPathway(p.id));
      list.appendChild(row); this.pwRows[p.id] = { row, chk, solo };
    }
  }
  syncPathway(id, st) {
    const r = this.pwRows[id]; if (!r) return;
    r.chk.classList.toggle('on', !!st.enabled); r.row.classList.toggle('off', !st.enabled);
    r.solo.classList.toggle('on', !!st.isolate);
  }
  markPathwaySelected(id) { for (const [k, r] of Object.entries(this.pwRows)) r.row.classList.toggle('sel', k === id); }

  _buildLegend() {
    const lg = this.el.lg; lg.innerHTML = '';
    for (const f of this.mol.families) {
      const cls = this._fam(f.id);
      const row = document.createElement('div'); row.className = 'hl-lgrow';
      row.innerHTML = `<span class="g">${cls.map((c) => `<span title="${c.label}" style="display:flex">${shapeSvg(c.shape, c.color, 14)}</span>`).join('')}</span><span>${f.label}</span>`;
      lg.appendChild(row);
      if (cls.length > 1) for (const c of cls) { const r = document.createElement('div'); r.className = 'hl-lgcls'; r.innerHTML = `${shapeSvg(c.shape, c.color, 10)}<span>${c.label}</span>`; lg.appendChild(r); }
    }
    const note = document.createElement('div'); note.className = 'hl-lgcls'; note.style.paddingTop = '6px'; note.innerHTML = '<span>Shape + colour identify class. Ring = lipoprotein / secreted protein.</span>'; lg.appendChild(note);
  }

  setState(s) {
    const st = this.states.stops; let a = st[0], b = st[st.length - 1];
    for (let i = 0; i < st.length - 1; i++) if (s >= st[i].s && s <= st[i + 1].s) { a = st[i]; b = st[i + 1]; }
    const k = b.s === a.s ? 0 : (s - a.s) / (b.s - a.s);
    const ins = a.insulin + (b.insulin - a.insulin) * k, glu = a.glucagon + (b.glucagon - a.glucagon) * k;
    const near = k < 0.5 ? a : b;
    this.el.sn.textContent = near.label; this.el.sd.textContent = near.text;
    this.el.ins.style.width = `${Math.round(ins * 100)}%`; this.el.gl.style.width = `${Math.round(glu * 100)}%`;
    this.el.range.value = Math.round(s * 1000);
  }
  setPlaying(p) { this.playing = p; this.el.pp.innerHTML = p ? ICON.pause : ICON.play; }
  setViewMode(m) { this.ui.querySelectorAll('.hl-seg button').forEach((b) => b.classList.toggle('on', b.dataset.m === m)); }
  setTool(name, on) { const b = this.ui.querySelector(`[data-t="${name}"]`); if (b) b.classList.toggle('on', on); }
  setSwitch(name, on) { const b = this.ui.querySelector(`[data-sw="${name}"]`); if (b) b.classList.toggle('on', on); }
  setMobile(m) { this.root.classList.toggle('hl-mob', m); }

  showDetails({ title, color, html }) {
    const d = this.el.details; d.classList.add('show'); if (this.root.classList.contains('hl-mob')) { this.root.classList.remove('hl-show-left'); this.root.classList.add('hl-show-right'); }
    d.querySelector('h2').textContent = title; d.querySelector('.sw').style.background = color;
    const bd = d.querySelector('.bd'); bd.innerHTML = html; bd.scrollTop = 0;
    bd.querySelectorAll('[data-pw]').forEach((a) => a.addEventListener('click', () => this.api.selectPathway(a.dataset.pw)));
    bd.querySelectorAll('[data-org]').forEach((a) => a.addEventListener('click', () => this.api.select(a.dataset.org)));
    bd.querySelectorAll('[data-solo]').forEach((a) => a.addEventListener('click', () => this.api.setPathwayState(a.dataset.solo, { isolate: true })));
  }
  hideDetails() { this.el.details.classList.remove('show'); }

  /** labels: [{key,x,y,text,color,step,visible}] in CSS px */
  setLabels(list) {
    const seen = new Set();
    for (const l of list) {
      seen.add(l.key);
      let e = this._labels.get(l.key);
      if (!e) { const el = document.createElement('div'); el.className = 'hl-lab' + (l.step ? ' step' : ''); el.textContent = l.text; el.style.setProperty('--c', l.color || '#4a5f99'); this.labelsEl.appendChild(el); e = { el, text: l.text }; this._labels.set(l.key, e); }
      if (e.text !== l.text) { e.el.textContent = l.text; e.text = l.text; }
      e.el.style.transform = `translate(${l.x.toFixed(1)}px,${l.y.toFixed(1)}px) translate(-50%,-100%)`;
    }
    for (const [k, e] of this._labels) if (!seen.has(k)) { e.el.remove(); this._labels.delete(k); }
  }

  dispose() { this.ui.remove(); this.labelsEl.remove(); this.styleEl.remove(); }
}
