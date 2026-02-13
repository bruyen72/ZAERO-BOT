// ===================================================================
// LOGIN.JS - Sistema de Autenticacao do ZAERO BOT
// ===================================================================

class LoginSystem {
  constructor() {
    this.init();
  }

  init() {
    this.setupParticles();
    this.setupEventListeners();
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
    const form = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    togglePassword?.addEventListener('click', () => {
      const type = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = type;

      const eyeIcon = document.getElementById('eyeIcon');
      if (type === 'text') {
        eyeIcon.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
        `;
      } else {
        eyeIcon.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
        `;
      }
    });
  }

  // ===================================================================
  // LOGIN HANDLER
  // ===================================================================
  async handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const btnLogin = document.getElementById('btnLogin');
    const btnText = document.getElementById('btnText');

    this.hideError();

    if (!username || !password) {
      this.showError('Por favor, preencha todos os campos');
      return;
    }

    btnLogin.disabled = true;
    btnText.innerHTML = '<div class="spinner"></div>Autenticando...';

    try {
      const response = await fetch('/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Usuario ou senha incorretos');
      }

      btnText.innerHTML = 'Autenticado! Redirecionando...';
      const redirectTo = typeof data.redirectTo === 'string' ? data.redirectTo : '/connect';

      setTimeout(() => {
        window.location.href = redirectTo;
      }, 700);
    } catch (error) {
      console.error('Erro no login:', error);
      this.showError(error.message || 'Erro ao autenticar. Verifique suas credenciais.');

      btnLogin.disabled = false;
      btnText.innerHTML = 'ENTRAR';

      document.getElementById('password').value = '';
      document.getElementById('password').focus();
    }
  }

  // ===================================================================
  // ERROR HANDLING
  // ===================================================================
  showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.add('show');

      setTimeout(() => {
        this.hideError();
      }, 5000);
    }
  }

  hideError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
      errorDiv.classList.remove('show');
    }
  }
}

// ===================================================================
// INITIALIZE
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
  window.loginSystem = new LoginSystem();
});
