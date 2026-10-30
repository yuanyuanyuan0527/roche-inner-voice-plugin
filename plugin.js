(() => {
  "use strict";

  const KEY = "roche_inner_voice_archive_v1";
  const APP_ID = "roche-inner-voice-archive";
  const STYLE_ID = APP_ID + "-style";
  const BTN_ID = APP_ID + "-button";
  const PANEL_ID = APP_ID + "-panel";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch (_) { return []; }
  }
  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data.slice(-2000)));
  }

  function text(el) {
    return (el?.innerText || el?.textContent || "").trim();
  }

  function detectCharacter(card) {
    const selectors = [
      "[data-character-name]", "[data-char-name]",
      ".character-name", ".char-name", ".name",
      "[class*='character'][class*='name']"
    ];
    for (const s of selectors) {
      const x = card.querySelector(s);
      const t = text(x);
      if (t) return t;
    }
    return card.getAttribute("data-character") ||
           card.getAttribute("data-char") ||
           "未知角色";
  }

  function cleanContent(card) {
    const clone = card.cloneNode(true);
    clone.querySelectorAll("button,svg,img,script,style").forEach(x => x.remove());
    return text(clone);
  }

  function collect(card) {
    const content = cleanContent(card);
    if (!content) return;

    const character = detectCharacter(card);
    const data = load();

    const last = data[data.length - 1];
    if (last &&
        last.character === character &&
        last.content === content) return;

    data.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      character,
      content,
      time: new Date().toISOString()
    });
    save(data);
  }

  function scan(root = document) {
    root.querySelectorAll?.(".inner-voice-card").forEach(collect);
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${BTN_ID}{
        position:fixed;right:16px;bottom:78px;z-index:2147483646;
        border:0;border-radius:18px;padding:9px 13px;
        background:rgba(255,255,255,.94);color:#554b46;
        box-shadow:0 4px 18px rgba(0,0,0,.14);
        font-size:13px;font-weight:600;
      }
      #${PANEL_ID}{
        position:fixed;inset:0;z-index:2147483647;
        display:none;background:rgba(30,25,22,.28);
        backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
        padding:18px;box-sizing:border-box;
      }
      #${PANEL_ID}.show{display:block}
      .riv-box{
        max-width:680px;height:min(82vh,760px);margin:5vh auto 0;
        background:rgba(255,250,247,.97);border-radius:22px;
        box-shadow:0 14px 45px rgba(0,0,0,.2);overflow:hidden;
        color:#463d39;display:flex;flex-direction:column;
      }
      .riv-head{padding:16px 18px;border-bottom:1px solid #eee3df;
        display:flex;align-items:center;gap:10px}
      .riv-title{font-size:17px;font-weight:700;flex:1}
      .riv-close,.riv-clear{border:0;background:none;color:#8a7770;padding:6px}
      .riv-tools{padding:10px 14px;border-bottom:1px solid #eee3df}
      .riv-search{width:100%;box-sizing:border-box;border:1px solid #e4d8d3;
        border-radius:12px;padding:9px 11px;background:white;outline:none}
      .riv-list{overflow:auto;padding:10px 14px 18px}
      .riv-item{padding:12px 13px;margin:7px 0;background:white;
        border:1px solid #eee4e0;border-radius:14px}
      .riv-meta{font-size:12px;color:#9a8982;margin-bottom:6px}
      .riv-content{font-size:14px;line-height:1.65;white-space:pre-wrap}
      .riv-empty{padding:50px 20px;text-align:center;color:#a2918a}
    `;
    document.head.appendChild(style);
  }

  function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString();
  }

  function renderPanel(filter = "") {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    const data = load().reverse();
    const q = filter.trim().toLowerCase();
    const rows = data.filter(x =>
      !q ||
      x.character.toLowerCase().includes(q) ||
      x.content.toLowerCase().includes(q)
    );

    panel.querySelector(".riv-list").innerHTML = rows.length
      ? rows.map(x => `
          <div class="riv-item">
            <div class="riv-meta">${escapeHtml(x.character)} · ${escapeHtml(formatTime(x.time))}</div>
            <div class="riv-content">${escapeHtml(x.content)}</div>
          </div>
        `).join("")
      : `<div class="riv-empty">还没有保存到心声档案的内容</div>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }

  function ensureUI() {
    if (document.getElementById(BTN_ID)) return;
    ensureStyle();

    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.textContent = "心声档案";
    btn.addEventListener("click", () => {
      const panel = document.getElementById(PANEL_ID);
      panel.classList.add("show");
      renderPanel();
    });
    document.body.appendChild(btn);

    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="riv-box">
        <div class="riv-head">
          <div class="riv-title">心声档案</div>
          <button class="riv-clear">清空</button>
          <button class="riv-close">关闭</button>
        </div>
        <div class="riv-tools">
          <input class="riv-search" placeholder="搜索角色或心声内容">
        </div>
        <div class="riv-list"></div>
      </div>`;
    document.body.appendChild(panel);

    panel.addEventListener("click", e => {
      if (e.target === panel) panel.classList.remove("show");
      if (e.target.classList.contains("riv-close")) panel.classList.remove("show");
      if (e.target.classList.contains("riv-clear")) {
        if (confirm("确定清空全部心声档案吗？")) {
          save([]); renderPanel(panel.querySelector(".riv-search").value);
        }
      }
    });
    panel.querySelector(".riv-search").addEventListener("input", e => renderPanel(e.target.value));
  }

  function boot() {
    ensureUI();
    scan();

    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        m.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            if (node.matches?.(".inner-voice-card")) collect(node);
            scan(node);
          }
        });
      }
    });
    observer.observe(document.documentElement, {childList:true, subtree:true});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, {once:true});
  } else {
    boot();
  }
})();