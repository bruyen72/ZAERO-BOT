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

function normalizePhoneNumber(input) {
    const original = input
    let digits = String(input || '').replace(/\D/g, '')
    if (!digits) return ''

    if (digits.startsWith('00')) digits = digits.slice(2)
    digits = digits.replace(/^0+/, '')

    // Caso comum no Brasil: 55 + 0 + DDD + numero.
    if (digits.startsWith('550')) {
        digits = `55${digits.slice(3)}`
    }

    if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
        digits = `55${digits}`
    }

    console.log('📞 [NORMALIZE]', original, '→', digits)
    return digits
}

// Iniciar verificação de status
function startStatusCheck() {
    if (statusInterval) clearInterval(statusInterval)
    console.log('🔍 [DEBUG] Iniciando verificação de status a cada 2 segundos')

    statusInterval = setInterval(async () => {
        try {
            const response = await fetch('/api/status')
            const data = await response.json()
            console.log('📡 [API] Status recebido:', data)
            updateStatus(data)
        } catch (err) {
            console.error('❌ [ERROR] Erro ao verificar status:', err)
        }
    }, 2000)
}

// Atualizar status visual
function updateStatus(data) {
    const { status, qr, code } = data
    console.log('🎨 [UI] Atualizando interface - Status:', status, '| QR:', !!qr, '| Code:', !!code)

    switch (status) {
        case 'connected':
            console.log('✅ [STATUS] WhatsApp CONECTADO!')
            pulse.className = 'pulse connected'
            statusText.textContent = '✅ Conectado'
            statusHelp.textContent = 'WhatsApp conectado com sucesso!'
            btnDisconnect.classList.remove('hidden')
            hideAllLoaders()
            hideAllContainers()
            disableButtons(false)
            break

        case 'connecting':
            console.log('⏳ [STATUS] Conectando ao WhatsApp...')
            pulse.className = 'pulse connecting'
            statusText.textContent = '⏳ Conectando...'
            statusHelp.textContent = 'Preparando conexão'
            btnDisconnect.classList.add('hidden')
            break

        case 'qr_ready':
            console.log('📱 [STATUS] QR Code pronto para escanear')
            pulse.className = 'pulse connecting'
            statusText.textContent = '📱 QR Code Pronto'
            statusHelp.textContent = 'Escaneie com seu WhatsApp'
            if (qr) {
                console.log('🔍 [DEBUG] Exibindo QR Code na tela')
                qrImage.src = qr
                qrContainer.classList.remove('hidden')
                qrLoader.classList.add('hidden')
            }
            break

        case 'code_ready':
        case 'waiting_for_pairing':
            console.log('🔑 [STATUS] Código de pareamento:', code)
            pulse.className = 'pulse connecting'
            statusText.textContent = '🔑 Código Gerado!'
            statusHelp.textContent = 'Digite o código no WhatsApp agora!'
            if (code) {
                console.log('🔍 [DEBUG] Exibindo código:', code)
                pairingCodeEl.textContent = code
                codeContainer.classList.remove('hidden')
                codeLoader.classList.add('hidden')
            }
            break

        case 'disconnected':
            console.log('🔌 [STATUS] Desconectado')
            pulse.className = 'pulse'
            statusText.textContent = 'Aguardando conexão'
            statusHelp.textContent = 'Escolha um método abaixo'
            btnDisconnect.classList.add('hidden')
            hideAllLoaders()
            // Só esconde containers se não houver código ou QR ativo
            if (!code && !qr) {
                console.log('🔍 [DEBUG] Escondendo containers (sem QR/Code ativo)')
                hideAllContainers()
            } else {
                console.log('⚠️ [DEBUG] Mantendo containers (QR/Code ainda ativo)')
            }
            disableButtons(false)
            break

        case 'error':
            console.error('❌ [STATUS] Erro na conexão')

            // ⚠️ FIX: Se QR Code existe, mostra mesmo com erro
            if (qr) {
                console.warn('⚠️ [FIX] Status = error MAS QR existe! Mostrando QR...')
                pulse.className = 'pulse connecting'
                statusText.textContent = '⚠️ QR Pronto (com avisos)'
                statusHelp.textContent = 'Escaneie rapidamente. Pode haver instabilidade.'
                qrImage.src = qr
                qrContainer.classList.remove('hidden')
                qrLoader.classList.add('hidden')
            } else {
                pulse.className = 'pulse'
                statusText.textContent = '❌ Erro'
                statusHelp.textContent = 'Algo deu errado, tente novamente'
            }
            hideAllLoaders()
            disableButtons(false)
            break

        default:
            console.warn('⚠️ [WARN] Status desconhecido:', status)
            console.warn('⚠️ [WARN] Dados completos:', data)
            break
    }
}

// Conectar via QR Code
async function connectViaQR() {
    console.log('📱 [ACTION] Iniciando conexão via QR Code')
    try {
        btnQR.disabled = true
        btnCode.disabled = true
        qrLoader.classList.remove('hidden')
        qrContainer.classList.add('hidden')

        console.log('📡 [API] Enviando requisição POST /api/connect/qr')
        const response = await fetch('/api/connect/qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })

        const data = await response.json()
        console.log('📡 [API] Resposta recebida:', data)

        if (!data.success) {
            throw new Error(data.error || 'Erro ao conectar')
        }

        console.log('✅ [SUCCESS] Solicitação enviada, aguardando QR Code...')
    } catch (err) {
        console.error('❌ [ERROR] Erro ao gerar QR Code:', err)
        alert('Erro ao gerar QR Code: ' + err.message)
        qrLoader.classList.add('hidden')
        btnQR.disabled = false
        btnCode.disabled = false
    }
}

// Conectar via Código
async function connectViaCode() {
    console.log('🔑 [ACTION] Iniciando conexão via Código de Pareamento')
    try {
        const phoneNumber = phoneInput.value.trim()
        console.log('📞 [DEBUG] Número digitado:', phoneNumber)

        if (!phoneNumber) {
            console.warn('⚠️ [WARN] Número vazio')
            alert('Por favor, insira seu número do WhatsApp')
            phoneInput.focus()
            return
        }

        // Validar número
        const cleanNumber = normalizePhoneNumber(phoneNumber)
        console.log('📞 [DEBUG] Número normalizado:', cleanNumber, '(tamanho:', cleanNumber.length + ')')

        if (cleanNumber.length < 12 || cleanNumber.length > 15) {
            console.error('❌ [ERROR] Número inválido - tamanho:', cleanNumber.length)
            alert('Numero invalido.\n\nUse DDI + DDD + numero (sem + e sem espacos).\nExemplo: 5511912345678')
            phoneInput.focus()
            return
        }
        phoneInput.value = cleanNumber

        btnCode.disabled = true
        btnQR.disabled = true
        codeLoader.classList.remove('hidden')
        codeContainer.classList.add('hidden')

        statusText.textContent = '⏳ Gerando código...'
        statusHelp.textContent = 'Aguarde alguns segundos'

        console.log('📡 [API] Enviando requisição POST /api/connect/code')
        console.log('📡 [API] Payload:', { phoneNumber: cleanNumber })

        const response = await fetch('/api/connect/code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: cleanNumber })
        })

        const data = await response.json()
        console.log('📡 [API] Resposta recebida:', data)

        if (!data.success) {
            throw new Error(data.error || 'Erro ao gerar código')
        }

        console.log('✅ [SUCCESS] Solicitação enviada, aguardando código do servidor...')
        console.log('⏱️ [DEBUG] O código pode levar até 7 segundos para aparecer (delays do Baileys)')
    } catch (err) {
        console.error('❌ [ERROR] Erro ao gerar código:', err)
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
    console.log('🔌 [ACTION] Solicitando desconexão')
    if (!confirm('Deseja desconectar o bot do WhatsApp?')) {
        console.log('⚠️ [WARN] Desconexão cancelada pelo usuário')
        return
    }

    try {
        btnDisconnect.disabled = true

        console.log('📡 [API] Enviando requisição POST /api/disconnect')
        const response = await fetch('/api/disconnect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })

        const data = await response.json()
        console.log('📡 [API] Resposta recebida:', data)

        if (data.success) {
            console.log('✅ [SUCCESS] Bot desconectado, recarregando página...')
            alert('✅ Bot desconectado com sucesso!')
            location.reload()
        } else {
            throw new Error(data.error || 'Erro ao desconectar')
        }
    } catch (err) {
        console.error('❌ [ERROR] Erro ao desconectar:', err)
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
    console.log('═══════════════════════════════════════════')
    console.log('✧ ZÆRØ BOT ✧ - Interface carregada')
    console.log('═══════════════════════════════════════════')
    console.log('🔍 [INFO] Logs detalhados ativados!')
    console.log('📋 [INFO] Legenda dos logs:')
    console.log('   🔍 [DEBUG]   - Informações de debug')
    console.log('   📡 [API]     - Requisições e respostas')
    console.log('   🎨 [UI]      - Mudanças visuais')
    console.log('   ✅ [SUCCESS] - Operações bem-sucedidas')
    console.log('   ❌ [ERROR]   - Erros')
    console.log('   ⚠️ [WARN]    - Avisos')
    console.log('   📱 [ACTION]  - Ações do usuário')
    console.log('   🔑 [STATUS]  - Mudanças de status')
    console.log('═══════════════════════════════════════════')
    startStatusCheck()
})

// Limpar interval ao fechar página
window.addEventListener('beforeunload', () => {
    console.log('🔌 [INFO] Fechando página, limpando timers...')
    if (statusInterval) clearInterval(statusInterval)
})
