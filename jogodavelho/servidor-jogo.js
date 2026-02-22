import express from 'express'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

let Server
try {
  ;({ Server } = await import('socket.io'))
} catch {
  console.error('[jogodavelho] Dependencia "socket.io" nao encontrada.')
  console.error('[jogodavelho] Rode: npm i socket.io')
  process.exit(1)
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
})

app.use(express.static(__dirname))

const partidas = new Map()

function gerarCodigoPartida() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

app.get('/criar-partida', (req, res) => {
  const codigo = gerarCodigoPartida()

  partidas.set(codigo, {
    codigo,
    jogadores: [],
    tabuleiro: ['', '', '', '', '', '', '', '', ''],
    jogadorAtual: 'X',
    status: 'aguardando',
    criador: null,
    convidado: null,
    criada_em: new Date()
  })

  limparPartidasAntigas()

  res.json({
    sucesso: true,
    codigo,
    url: `${req.protocol}://${req.get('host')}/partida/${codigo}`
  })
})

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'partidaonline.html'))
})

app.get('/partida/:codigo', (req, res) => {
  const codigo = String(req.params.codigo || '').toUpperCase()

  if (!partidas.has(codigo)) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Partida nao encontrada</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: #fff;
            padding: 32px;
            border-radius: 16px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
          }
          h1 { color: #d93025; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Partida nao encontrada</h1>
          <p>O codigo <strong>${codigo}</strong> nao existe ou expirou.</p>
        </div>
      </body>
      </html>
    `)
  }

  return res.sendFile(path.join(__dirname, 'partidaonline.html'))
})

io.on('connection', (socket) => {
  console.log('[jogodavelho] jogador conectado:', socket.id)

  socket.on('entrar-partida', (codigoRaw) => {
    const codigo = String(codigoRaw || '').toUpperCase()
    if (!partidas.has(codigo)) {
      socket.emit('erro', 'Partida nao encontrada')
      return
    }

    const partida = partidas.get(codigo)
    if (partida.jogadores.length >= 2) {
      socket.emit('erro', 'Partida ja esta cheia')
      return
    }

    socket.join(codigo)

    let simbolo = 'X'
    if (partida.jogadores.length === 0) {
      partida.criador = socket.id
    } else {
      simbolo = 'O'
      partida.convidado = socket.id
      partida.status = 'jogando'
    }

    partida.jogadores.push({ id: socket.id, simbolo })
    socket.data.partidaAtual = codigo
    socket.data.simbolo = simbolo

    socket.emit('partida-entrou', {
      simbolo,
      status: partida.status,
      tabuleiro: partida.tabuleiro,
      jogadorAtual: partida.jogadorAtual,
      jogadores: partida.jogadores.length
    })

    io.to(codigo).emit('jogadores-atualizados', {
      total: partida.jogadores.length,
      status: partida.status
    })
  })

  socket.on('fazer-jogada', (payload = {}) => {
    const codigo = socket.data.partidaAtual
    const partida = partidas.get(codigo)
    if (!partida) {
      socket.emit('erro', 'Partida nao encontrada')
      return
    }

    if (socket.data.simbolo !== partida.jogadorAtual) {
      socket.emit('erro', 'Nao e sua vez')
      return
    }

    const posicao = Number(payload.posicao)
    if (!Number.isInteger(posicao) || posicao < 0 || posicao > 8) {
      socket.emit('erro', 'Jogada invalida')
      return
    }

    if (partida.tabuleiro[posicao] !== '') {
      socket.emit('erro', 'Posicao ja ocupada')
      return
    }

    partida.tabuleiro[posicao] = socket.data.simbolo
    const vencedor = verificarVitoria(partida.tabuleiro)

    if (vencedor) {
      partida.status = 'finalizada'
      io.to(codigo).emit('partida-finalizada', {
        tipo: 'vitoria',
        vencedor,
        tabuleiro: partida.tabuleiro
      })
      return
    }

    if (!partida.tabuleiro.includes('')) {
      partida.status = 'finalizada'
      io.to(codigo).emit('partida-finalizada', {
        tipo: 'empate',
        tabuleiro: partida.tabuleiro
      })
      return
    }

    partida.jogadorAtual = partida.jogadorAtual === 'X' ? 'O' : 'X'
    io.to(codigo).emit('jogada-feita', {
      posicao,
      simbolo: socket.data.simbolo,
      proximoJogador: partida.jogadorAtual,
      tabuleiro: partida.tabuleiro
    })
  })

  socket.on('nova-partida', () => {
    const codigo = socket.data.partidaAtual
    const partida = partidas.get(codigo)
    if (!partida) return

    partida.tabuleiro = ['', '', '', '', '', '', '', '', '']
    partida.jogadorAtual = 'X'
    partida.status = 'jogando'

    io.to(codigo).emit('partida-resetada', {
      tabuleiro: partida.tabuleiro,
      jogadorAtual: partida.jogadorAtual
    })
  })

  socket.on('disconnect', () => {
    const codigo = socket.data.partidaAtual
    if (!codigo || !partidas.has(codigo)) return

    const partida = partidas.get(codigo)
    partida.jogadores = partida.jogadores.filter((j) => j.id !== socket.id)

    io.to(codigo).emit('jogador-saiu', {
      jogadores: partida.jogadores.length
    })

    if (partida.jogadores.length === 0) {
      partidas.delete(codigo)
    }
  })
})

function verificarVitoria(tabuleiro) {
  const combinacoes = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ]

  for (const combo of combinacoes) {
    const [a, b, c] = combo
    if (tabuleiro[a] && tabuleiro[a] === tabuleiro[b] && tabuleiro[a] === tabuleiro[c]) {
      return { simbolo: tabuleiro[a], posicoes: combo }
    }
  }
  return null
}

function limparPartidasAntigas() {
  const agora = Date.now()
  const umaHoraMs = 60 * 60 * 1000

  for (const [codigo, partida] of partidas.entries()) {
    if (agora - new Date(partida.criada_em).getTime() > umaHoraMs) {
      partidas.delete(codigo)
    }
  }
}

setInterval(limparPartidasAntigas, 10 * 60 * 1000)

const PORT = Number(process.env.JOGODAVELHA_PORT || process.env.PORT || 3001)
server.listen(PORT, () => {
  console.log(`[jogodavelho] servidor online na porta ${PORT}`)
})
