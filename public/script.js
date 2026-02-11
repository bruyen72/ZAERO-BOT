// Elementos do DOM
const statusIndicator = document.getElementById('statusIndicator')
const statusText = document.getElementById('statusText')
const statusHelp = document.getElementById('statusHelp')
const pulse = document.querySelector('.pulse')

const qrContainer = document.getElementById('qrContainer')
const qrImage = document.getElementById('qrImage')
const qrLoader = document.getElementById('qrLoader')
const btnQR = document.getElementById('btnQR')

const codeContainer = document.getElementById('codeContainer')
const pairingCodeEl = document.getElementById('pairingCode')
const codeLoader = document.getElementById('codeLoader')
const phoneInput = document.getElementById('phoneNumber')
const btnCode = document.getElementById('btnCode')

const btnDisconnect = document.getElementById('btnDisconnect')

// Estado
let statusInterval = null

// Iniciar verificação de status
function startStatusCheck() {
    if (statusInterval) clearInterval(statusInterval)

    statusInterval = setInterval(async () => {
        try {
            const response = await fetch('/api/status')
            const data = await response.json()
            updateStatus(data)
        } catch (err) {
            console.error('Erro ao verificar status:', err)
        }
    }, 2000)
}

// Atualizar status visual
function updateStatus(data) {
    const { status, qr, code } = data

    switch (status) {
        case 'connected':
            pulse.className = 'pulse connected'
            statusText.textContent = '✅ Conectado'
            statusHelp.textContent = 'WhatsApp conectado com sucesso!'
            btnDisconnect.classList.remove('hidden')
            hideAllLoaders()
            hideAllContainers()
            disableButtons(false)
            break

        case 'connecting':
            pulse.className = 'pulse connecting'
            statusText.textContent = '⏳ Conectando...'
            statusHelp.textContent = 'Preparando conexão'
            btnDisconnect.classList.add('hidden')
            break

        case 'qr_ready':
            pulse.className = 'pulse connecting'
            statusText.textContent = '📱 QR Code Pronto'
            statusHelp.textContent = 'Escaneie com seu WhatsApp'
            if (qr) {
                qrImage.src = qr
                qrContainer.classList.remove('hidden')
                qrLoader.classList.add('hidden')
            }
            break

        case 'code_ready':
            pulse.className = 'pulse connecting'
            statusText.textContent = '🔑 Código Gerado!'
            statusHelp.textContent = 'Digite o código no WhatsApp agora!'
            if (code) {
                pairingCodeEl.textContent = code
                codeContainer.classList.remove('hidden')
                codeLoader.classList.add('hidden')
            }
            break

        case 'disconnected':
            pulse.className = 'pulse'
            statusText.textContent = 'Aguardando conexão'
            statusHelp.textContent = 'Escolha um método abaixo'
            btnDisconnect.classList.add('hidden')
            hideAllLoaders()
            hideAllContainers()
            disableButtons(false)
            break

        case 'error':
            pulse.className = 'pulse'
            statusText.textContent = '❌ Erro'
            statusHelp.textContent = 'Algo deu errado, tente novamente'
            hideAllLoaders()
            disableButtons(false)
            break
    }
}

// Conectar via QR Code
async function connectViaQR() {
    try {
        btnQR.disabled = true
        btnCode.disabled = true
        qrLoader.classList.remove('hidden')
        qrContainer.classList.add('hidden')

        const response = await fetch('/api/connect/qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })

        const data = await response.json()

        if (!data.success) {
            throw new Error(data.error || 'Erro ao conectar')
        }

        console.log('Gerando QR Code...')
    } catch (err) {
        alert('Erro ao gerar QR Code: ' + err.message)
        qrLoader.classList.add('hidden')
        btnQR.disabled = false
        btnCode.disabled = false
    }
}

// Conectar via Código
async function connectViaCode() {
    try {
        const phoneNumber = phoneInput.value.trim()

        if (!phoneNumber) {
            alert('Por favor, insira seu número do WhatsApp')
            phoneInput.focus()
            return
        }

        // Validar número
        const cleanNumber = phoneNumber.replace(/\D/g, '')
        if (cleanNumber.length < 10) {
            alert('Número inválido!\n\nUse apenas números com código do país.\nExemplo: 5511999999999')
            phoneInput.focus()
            return
        }

        btnCode.disabled = true
        btnQR.disabled = true
        codeLoader.classList.remove('hidden')
        codeContainer.classList.add('hidden')

        statusText.textContent = '⏳ Gerando código...'
        statusHelp.textContent = 'Aguarde alguns segundos'

        const response = await fetch('/api/connect/code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber })
        })

        const data = await response.json()

        if (!data.success) {
            throw new Error(data.error || 'Erro ao gerar código')
        }

        console.log('✅ Solicitação enviada, aguarde o código...')
    } catch (err) {
        alert('Erro ao gerar código: ' + err.message)
        codeLoader.classList.add('hidden')
        btnCode.disabled = false
        btnQR.disabled = false
        statusText.textContent = 'Aguardando conexão'
        statusHelp.textContent = 'Tente novamente'
    }
}

// Desconectar
async function disconnect() {
    if (!confirm('Deseja desconectar o bot do WhatsApp?')) {
        return
    }

    try {
        btnDisconnect.disabled = true

        const response = await fetch('/api/disconnect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })

        const data = await response.json()

        if (data.success) {
            alert('✅ Bot desconectado com sucesso!')
            location.reload()
        } else {
            throw new Error(data.error || 'Erro ao desconectar')
        }
    } catch (err) {
        alert('Erro ao desconectar: ' + err.message)
        btnDisconnect.disabled = false
    }
}

// Helpers
function hideAllLoaders() {
    qrLoader.classList.add('hidden')
    codeLoader.classList.add('hidden')
}

function hideAllContainers() {
    qrContainer.classList.add('hidden')
    codeContainer.classList.add('hidden')
}

function disableButtons(disabled) {
    btnQR.disabled = disabled
    btnCode.disabled = disabled
}

// Formatar input de telefone
phoneInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '')
    e.target.value = value
})

// Iniciar ao carregar página
window.addEventListener('load', () => {
    startStatusCheck()
    console.log('✧ ZÆRØ BOT ✧ - Interface carregada')
})

// Limpar interval ao fechar página
window.addEventListener('beforeunload', () => {
    if (statusInterval) clearInterval(statusInterval)
})
