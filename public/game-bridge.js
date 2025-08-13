// public/game-bridge.js
(function(){
  const frame = document.getElementById('game-frame');
  const fpsBox = document.getElementById('fps');

  // ===== Fit-to-window with zoom-out (no stretch) =====
  // We read the game's designed base resolution (fallback 1280x720) and compute a uniform scale.
  let baseW = 1280, baseH = 720; // update if your game advertises a different base size via postMessage
  function applyScale(){
    if (!frame) return;
    const wrap = frame.parentElement.getBoundingClientRect();
    const scale = Math.min(wrap.width / baseW, wrap.height / baseH);

    // Size iframe to base, then scale it; center it in wrapper
    frame.style.width = baseW + 'px';
    frame.style.height = baseH + 'px';
    frame.style.transform = `scale(${scale})`;

    const xPad = (wrap.width - baseW * scale) / 2;
    const yPad = (wrap.height - baseH * scale) / 2;
    frame.style.left = `${xPad}px`;
    frame.style.top = `${yPad}px`;
  }
  window.addEventListener('resize', applyScale);
  window.addEventListener('orientationchange', applyScale);

  // Ask the game for its base resolution (optional)
  function requestGameMeta(){
    try{
      frame.contentWindow.postMessage({type:'gc:GetMeta'}, location.origin);
    }catch{}
  }
  frame.addEventListener('load', ()=>{
    applyScale();
    requestGameMeta();
  });

  // ===== FPS overlay (click-through) =====
  // If the game sends us frame ticks, use that; else fall back to local rAF.
  let last = performance.now(), frames = 0, fps = 60;
  let tickTimer = null;
  function localFpsLoop(t){
    frames++;
    if (t - last >= 1000){
      fps = frames;
      fpsBox.textContent = `FPS — ${fps}`;
      frames = 0; last = t;
    }
    requestAnimationFrame(localFpsLoop);
  }
  requestAnimationFrame(localFpsLoop);

  // ===== God Controller bridge =====
  function sendGC(command){
    // Free-form text command; the game parses it internally
    try{
      frame.contentWindow.postMessage({type:'gc:Command', command}, location.origin);
    }catch(e){
      console.warn('GC send failed', e);
    }
  }
  window.GameBridge = { sendGC };

  // ===== Listen to messages FROM game =====
  window.addEventListener('message', (ev)=>{
    if (ev.origin !== location.origin) return;
    const data = ev.data || {};
    switch(data.type){
      case 'game:Meta': {
        if (data.baseWidth && data.baseHeight){
          baseW = data.baseWidth; baseH = data.baseHeight;
          applyScale();
        }
        break;
      }
      case 'game:FPSTick': {
        // If the game sends its FPS, prefer that
        if (typeof data.fps === 'number'){
          fpsBox.textContent = `FPS — ${Math.round(data.fps)}`;
        }
        break;
      }
      case 'game:Notify': {
        // Surface small notifications into the God Controller chat
        const messages = document.getElementById('messages');
        if (messages){
          const div = document.createElement('div');
          div.className = 'msg assistant';
          div.textContent = `[Game] ${data.text}`;
          messages.appendChild(div);
          messages.scrollTop = messages.scrollHeight;
        }
        break;
      }
      default: break;
    }
  });

})();
