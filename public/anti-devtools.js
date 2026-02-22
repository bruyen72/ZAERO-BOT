// ===================================================================
// ANTI-DEVTOOLS - Proteção Contra Inspeção e Hackers
// ===================================================================

(function() {
  'use strict';

  // ===================================================================
  // DESABILITAR ATALHOS DE TECLADO PERIGOSOS
  // ===================================================================
  document.addEventListener('keydown', function(e) {
    // F12 - DevTools
    if (e.keyCode === 123) {
      e.preventDefault();
      showWarning();
      return false;
    }

    // Ctrl+Shift+I - DevTools
    if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
      e.preventDefault();
      showWarning();
      return false;
    }

    // Ctrl+Shift+J - Console
    if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
      e.preventDefault();
      showWarning();
      return false;
    }

    // Ctrl+Shift+C - Inspeção
    if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
      e.preventDefault();
      showWarning();
      return false;
    }

    // Ctrl+U - View Source
    if (e.ctrlKey && e.keyCode === 85) {
      e.preventDefault();
      showWarning();
      return false;
    }

    // Ctrl+S - Salvar página
    if (e.ctrlKey && e.keyCode === 83) {
      e.preventDefault();
      return false;
    }

    // Command+Option+I (Mac) - DevTools
    if (e.metaKey && e.altKey && e.keyCode === 73) {
      e.preventDefault();
      showWarning();
      return false;
    }

    // Command+Option+J (Mac) - Console
    if (e.metaKey && e.altKey && e.keyCode === 74) {
      e.preventDefault();
      showWarning();
      return false;
    }

    // Command+Option+C (Mac) - Inspeção
    if (e.metaKey && e.shiftKey && e.keyCode === 67) {
      e.preventDefault();
      showWarning();
      return false;
    }
  });

  // ===================================================================
  // DESABILITAR CLIQUE DIREITO
  // ===================================================================
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    showWarning();
    return false;
  });

  // ===================================================================
  // DETECTAR SE DEVTOOLS ESTÁ ABERTO
  // ===================================================================
  let devtoolsOpen = false;
  const threshold = 160;

  const detectDevTools = function() {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    const orientation = widthThreshold ? 'vertical' : 'horizontal';

    if (!(heightThreshold && widthThreshold) &&
        ((window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) ||
         widthThreshold || heightThreshold)) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        handleDevToolsOpen();
      }
    } else {
      devtoolsOpen = false;
    }
  };

  // Verificar a cada 500ms
  setInterval(detectDevTools, 500);

  // ===================================================================
  // DETECTAR DEBUGGER (via timing, sem debugger statement)
  // ===================================================================
  // Removido: debugger statement travava o navegador para todos os usuarios

  // ===================================================================
  // DETECTAR CONSOLE ABERTO
  // ===================================================================
  const consoleElement = document.createElement('div');
  Object.defineProperty(consoleElement, 'id', {
    get: function() {
      handleDevToolsOpen();
      return 'console-detector';
    }
  });

  setInterval(function() {
    console.log('%c', consoleElement);
    console.clear();
  }, 2000);

  // ===================================================================
  // PROTEGER CONTRA SELEÇÃO DE TEXTO
  // ===================================================================
  document.addEventListener('selectstart', function(e) {
    e.preventDefault();
    return false;
  });

  // ===================================================================
  // PROTEGER CONTRA DRAG & DROP
  // ===================================================================
  document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    return false;
  });

  // ===================================================================
  // LIMPAR CONSOLE CONSTANTEMENTE
  // ===================================================================
  setInterval(function() {
    console.clear();
  }, 100);

  // ===================================================================
  // OFUSCAR CONSOLE
  // ===================================================================
  console.log = function() {};
  console.error = function() {};
  console.warn = function() {};
  console.info = function() {};
  console.debug = function() {};
  console.trace = function() {};
  console.dir = function() {};
  console.dirxml = function() {};
  console.group = function() {};
  console.groupEnd = function() {};
  console.time = function() {};
  console.timeEnd = function() {};
  console.assert = function() {};
  console.profile = function() {};

  // ===================================================================
  // HANDLERS
  // ===================================================================
  function handleDevToolsOpen() {
    // Redirecionar para página vazia
    document.body.innerHTML = '';

    // Criar overlay de aviso
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #000;
      color: #ff0000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: monospace;
      font-size: 24px;
      z-index: 999999;
      flex-direction: column;
      gap: 20px;
      text-align: center;
      padding: 20px;
    `;

    overlay.innerHTML = `
      <div style="font-size: 48px; animation: pulse 1s infinite;">⚠️</div>
      <div style="font-weight: bold; text-shadow: 0 0 10px #ff0000;">ACESSO NÃO AUTORIZADO</div>
      <div style="font-size: 18px; max-width: 600px;">
        A tentativa de inspecionar esta página foi detectada e registrada.<br>
        DevTools não são permitidos nesta aplicação por motivos de segurança.
      </div>
      <div style="font-size: 14px; color: #999;">
        Esta ação foi registrada e reportada ao administrador.
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
      </style>
    `;

    document.body.appendChild(overlay);

    // Bloquear navegação
    setTimeout(function() {
      window.location.href = '/';
    }, 3000);
  }

  function showWarning() {
    // Criar overlay de aviso temporário
    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(255, 0, 0, 0.95);
      color: #fff;
      padding: 15px 25px;
      border-radius: 8px;
      font-family: sans-serif;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 5px 20px rgba(255, 0, 0, 0.5);
      animation: slideIn 0.3s;
    `;

    warning.innerHTML = `
      ⚠️ <strong>Ação Bloqueada</strong><br>
      <small>Inspeção não permitida</small>
      <style>
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `;

    document.body.appendChild(warning);

    setTimeout(function() {
      warning.remove();
    }, 3000);
  }

  // ===================================================================
  // PROTEGER CONTRA IFRAME
  // ===================================================================
  if (window.top !== window.self) {
    window.top.location = window.self.location;
  }

  // ===================================================================
  // DESABILITAR PRINT
  // ===================================================================
  window.addEventListener('beforeprint', function(e) {
    e.preventDefault();
    return false;
  });

  // ===================================================================
  // MENSAGEM NO CONSOLE (PARA QUEM CONSEGUIR ABRIR)
  // ===================================================================
  setTimeout(function() {
    console.log('%c⛔ PARE!', 'color: red; font-size: 50px; font-weight: bold;');
    console.log('%cEsta é uma função do navegador destinada a desenvolvedores.', 'font-size: 16px;');
    console.log('%cSe alguém disse para você copiar e colar algo aqui, é uma fraude.', 'font-size: 14px; color: orange;');
    console.log('%cColar qualquer coisa aqui pode comprometer sua segurança.', 'font-size: 14px; color: red;');
  }, 100);

})();
