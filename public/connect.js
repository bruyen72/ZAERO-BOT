// ===================================================================
// CONNECT.JS - Interface de Conexão do ZÆRØ BOT
// ===================================================================

class BotConnection {
  constructor() {
    this.statusInterval = null;
    this.qrRefreshInterval = null;
    this.authRedirected = false;
    this.init();
  }

  init() {
    this.setupParticles();
    this.setupEventListeners();
    this.checkConnectionStatus();
  }

  // ===================================================================
  // AUTHENTICATION
  // ===================================================================
  getAuthToken() {
    return localStorage.getItem('botAuthToken');
  }

  safeRedirectToLogin() {
    if (this.authRedirected) return;
    if (window.location.pathname === '/login') return;
    this.authRedirected = true;
    window.location.href = '/login';
  }

  clearSession() {
    localStorage.removeItem('botAuthToken');
    localStorage.removeItem('botAuthExpiry');
  }

  getAuthHeaders() {
    const token = this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  // ===================================================================
  // PARTICLES ANIMATION
  // ===================================================================
  setupParticles() {
    const particlesRoot = document.getElementById('particles');
    if (!particlesRoot) return;

    const colors = ['#ff1919', '#ff5b1a', '#ff8c1a', '#ff3f3f', '#e31212'];

    for (let i = 0; i < 50; i++) {
      const particle = document.createElement('span');
      const size = Math.random() * 6 + 2;
      const alpha = Math.floor((Math.random() * 0.7 + 0.2) * 255)
        .toString(16)
        .padStart(2, '0');
      const color = colors[Math.floor(Math.random() * colors.length)];

      particle.className = 'particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.animationDuration = `${Math.random() * 8 + 5}s`;
      particle.style.animationDelay = `${Math.random() * 10}s`;
      particle.style.background = `radial-gradient(circle, ${color}${alpha}, transparent 70%)`;

      if (size > 5) {
        particle.style.filter = 'blur(1px)';
      }

      particlesRoot.appendChild(particle);
    }
  }

  // ===================================================================
  // EVENT LISTENERS
  // ===================================================================
  setupEventListeners() {
    // Method selection buttons
    document.getElementById('btnQRCode')?.addEventListener('click', () => {
      this.showQRCodeMethod();
    });

    document.getElementById('btnPairingCode')?.addEventListener('click', () => {
      this.showPairingCodeMethod();
    });

    // Back buttons
    document.getElementById('btnBackFromQR')?.addEventListener('click', () => {
      this.showMethodSelection();
    });

    document.getElementById('btnBackFromCode')?.addEventListener('click', () => {
      this.showMethodSelection();
    });

    // Refresh QR Code
    document.getElementById('btnRefreshQR')?.addEventListener('click', () => {
      this.generateQRCode();
    });

    // Generate pairing code
    document.getElementById('btnGenerateCode')?.addEventListener('click', () => {
      this.generatePairingCode();
    });

    // Phone input - format as user types
    document.getElementById('phoneNumber')?.addEventListener('input', (e) => {
      this.formatPhoneInput(e.target);
    });

    // Phone input - enter key
    document.getElementById('phoneNumber')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.generatePairingCode();
      }
    });

    // Disconnect button
    document.getElementById('btnDisconnect')?.addEventListener('click', () => {
      this.disconnect();
    });

    // Dashboard button
    document.getElementById('btnDashboard')?.addEventListener('click', () => {
      window.location.href = '/';
    });
  }

  // ===================================================================
  // VIEW MANAGEMENT
  // ===================================================================
  showMethodSelection() {
    this.hideAllPanels();
    document.getElementById('methodSelection')?.classList.remove('hidden');
    this.updateStatus('waiting', 'Aguardando conexão...');
    this.stopStatusCheck();
  }

  showQRCodeMethod() {
    this.hideAllPanels();
    document.getElementById('qrPanel')?.classList.remove('hidden');
    this.updateStatus('connecting', 'Gerando QR Code...');
    this.generateQRCode();
    this.startStatusCheck();
  }

  showPairingCodeMethod() {
    this.hideAllPanels();
    document.getElementById('codePanel')?.classList.remove('hidden');
    this.updateStatus('waiting', 'Digite seu número...');
    document.getElementById('phoneNumber')?.focus();
  }

  showConnectedPanel(userInfo) {
    this.hideAllPanels();
    document.getElementById('connectedPanel')?.classList.remove('hidden');
    this.updateStatus('connected', 'Conectado com sucesso!');

    // Update user info
    if (userInfo) {
      document.getElementById('connectedName').textContent = userInfo.name || 'Usuário';
    }

    this.stopStatusCheck();
  }

  hideAllPanels() {
    document.getElementById('methodSelection')?.classList.add('hidden');
    document.getElementById('qrPanel')?.classList.add('hidden');
    document.getElementById('codePanel')?.classList.add('hidden');
    document.getElementById('connectedPanel')?.classList.add('hidden');
  }

  // ===================================================================
  // STATUS MANAGEMENT
  // ===================================================================
  updateStatus(state, text) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.getElementById('statusText');

    if (statusText) statusText.textContent = text;

    if (statusDot) {
      statusDot.classList.remove('connected', 'connecting');
      if (state === 'connected') {
        statusDot.classList.add('connected');
      } else if (state === 'connecting') {
        statusDot.classList.add('connecting');
      }
    }
  }

  showStatusError(message) {
    this.updateStatus('waiting', message);
    const statusIndicator = document.getElementById('statusIndicator');
    if (statusIndicator) statusIndicator.classList.add('status-error');
  }

  async readJsonSafe(response) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  async fetchStatus() {
    const response = await fetch('/api/status', {
      headers: this.getAuthHeaders()
    });

    const data = await this.readJsonSafe(response);
    if (!response.ok) {
      const error = new Error(data.message || `HTTP ${response.status}`);
      error.status = response.status;
      error.payload = data;
      throw error;
    }

    return data;
  }

  handleStatusFailure(error) {
    const status = Number(error?.status || 0);
    const authFailure = status === 401 || status === 403;
    const statusLabel = status ? ` (HTTP ${status})` : '';
    const message = authFailure
      ? `Sessao expirada. Faca login novamente${statusLabel}.`
      : `Falha ao verificar status${statusLabel}.`;

    this.stopStatusCheck();
    this.showStatusError(message);

    if (authFailure) {
      this.clearSession();
      this.safeRedirectToLogin();
    }
  }

  // ===================================================================
  // QR CODE GENERATION
  // ===================================================================
  async generateQRCode() {
    const qrLoading = document.getElementById('qrLoading');
    const qrDisplay = document.getElementById('qrDisplay');
    const qrCode = document.getElementById('qrCode');

    // Show loading
    qrLoading?.classList.remove('hidden');
    qrDisplay?.classList.add('hidden');

    try {
      const response = await fetch('/api/qr', {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          this.handleStatusFailure({ status: response.status, payload: data });
          return;
        }
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      if (data.success && data.qr) {
        // Hide loading, show QR
        qrLoading?.classList.add('hidden');
        qrDisplay?.classList.remove('hidden');

        // Display QR code
        if (qrCode) {
          // Check if it's a data URL (image) or SVG
          if (data.qr.startsWith('data:image')) {
            qrCode.innerHTML = `<img src="${data.qr}" alt="QR Code" />`;
          } else if (data.qr.startsWith('<svg')) {
            qrCode.innerHTML = data.qr;
          } else {
            // Use QRCode library to generate from string
            qrCode.innerHTML = '';
            new QRCode(qrCode, {
              text: data.qr,
              width: 300,
              height: 300,
              colorDark: '#000000',
              colorLight: '#ffffff'
            });
          }
        }

        this.updateStatus('connecting', 'Escaneie o QR Code...');

        // Auto-refresh QR after 30 seconds (QR codes expire)
        this.qrRefreshInterval = setTimeout(() => {
          this.generateQRCode();
        }, 30000);

      } else {
        throw new Error(data.message || 'Erro ao gerar QR Code');
      }

    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      this.showError('Erro ao gerar QR Code. Tente novamente.');
      qrLoading?.classList.add('hidden');
    }
  }

  // ===================================================================
  // PAIRING CODE GENERATION
  // ===================================================================
  formatPhoneInput(input) {
    let value = input.value.replace(/\D/g, '');

    if (value && !value.startsWith('+')) {
      if (value.length <= 13) {
        // Brazil format
        if (value.length >= 2) {
          value = `+${value.slice(0, 2)} ${value.slice(2)}`;
        }
        if (value.length >= 6) {
          value = `${value.slice(0, 6)} ${value.slice(6)}`;
        }
        if (value.length >= 12) {
          value = `${value.slice(0, 12)}-${value.slice(12)}`;
        }
      }
    }

    input.value = value;
  }

  async generatePairingCode() {
    const phoneInput = document.getElementById('phoneNumber');
    const phoneNumber = phoneInput?.value.replace(/\D/g, '');

    if (!phoneNumber || phoneNumber.length < 10) {
      this.showError('Digite um número de WhatsApp válido');
      phoneInput?.focus();
      return;
    }

    this.updateStatus('connecting', 'Gerando código...');

    try {
      const response = await fetch('/api/pairing-code', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ phoneNumber })
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          this.handleStatusFailure({ status: response.status, payload: data });
          return;
        }
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      if (data.success && data.code) {
        // Display pairing code
        this.displayPairingCode(data.code);
        this.updateStatus('connecting', 'Digite o código no WhatsApp...');
        this.startStatusCheck();
      } else {
        throw new Error(data.message || 'Erro ao gerar código');
      }

    } catch (error) {
      console.error('Erro ao gerar código:', error);
      this.showError('Erro ao gerar código. Verifique o número e tente novamente.');
      this.updateStatus('waiting', 'Digite seu número...');
    }
  }

  displayPairingCode(code) {
    const display = document.getElementById('pairingCodeDisplay');
    const codeSegments = document.querySelectorAll('.code-segment');

    if (code && code.length === 8) {
      const part1 = code.slice(0, 4);
      const part2 = code.slice(4, 8);

      codeSegments[0].textContent = part1;
      codeSegments[1].textContent = part2;

      display?.classList.remove('hidden');
    }
  }

  // ===================================================================
  // CONNECTION STATUS
  // ===================================================================
  async checkConnectionStatus() {
    try {
      const data = await this.fetchStatus();

      if (data.connected) {
        this.showConnectedPanel(data.user);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      this.handleStatusFailure(error);
    }
  }

  startStatusCheck() {
    this.stopStatusCheck();
    const statusIndicator = document.getElementById('statusIndicator');
    if (statusIndicator) statusIndicator.classList.remove('status-error');
    this.statusInterval = setInterval(async () => {
      try {
        const data = await this.fetchStatus();

        if (data.connected) {
          this.showConnectedPanel(data.user);
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
        this.handleStatusFailure(error);
      }
    }, 2000); // Check every 2 seconds
  }

  stopStatusCheck() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
    if (this.qrRefreshInterval) {
      clearTimeout(this.qrRefreshInterval);
      this.qrRefreshInterval = null;
    }
  }

  // ===================================================================
  // DISCONNECT
  // ===================================================================
  async disconnect() {
    if (!confirm('Tem certeza que deseja desconectar o bot?')) {
      return;
    }

    this.updateStatus('waiting', 'Desconectando...');

    try {
      const response = await fetch('/api/disconnect', {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          this.handleStatusFailure({ status: response.status, payload: data });
          return;
        }
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      if (data.success) {
        this.showMethodSelection();
        this.showSuccess('Bot desconectado com sucesso!');
      } else {
        throw new Error(data.message || 'Erro ao desconectar');
      }

    } catch (error) {
      console.error('Erro ao desconectar:', error);
      this.showError('Erro ao desconectar. Tente novamente.');
    }
  }

  // ===================================================================
  // NOTIFICATIONS
  // ===================================================================
  showError(message) {
    // Simple alert for now - can be replaced with a toast notification
    alert('❌ ' + message);
  }

  showSuccess(message) {
    alert('✅ ' + message);
  }
}

// ===================================================================
// INITIALIZE
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
  window.botConnection = new BotConnection();
});
