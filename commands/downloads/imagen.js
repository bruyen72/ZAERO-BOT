import { createAxiosWithTimeout } from '../../lib/fetch-wrapper.js'
import { apiCache } from '../../lib/cache.js'

const axios = createAxiosWithTimeout(10000) // 10 segundos de timeout

export default {
  command: ['imagen', 'img', 'image'],
  category: 'search',
  run: async (client, m, args, usedPrefix, command) => {
    const text = args.join(' ')
    if (!text) {
      return client.reply(m.chat, `《✧》 Por favor insira um termo de pesquisa.`, m)
    }
    const bannedWords = [
  '+18', '18+', 'conteúdo adulto', 'conteúdo explícito', 'conteúdo sexual',
  'atriz pornô', 'ator pornô', 'estrela pornô', 'pornstar', 'vídeo xxx', 'xxx', 'x x x',
  'pornhub', 'xvideos', 'xnxx', 'redtube', 'brazzers', 'onlyfans', 'cam4', 'chaturbate',
  'myfreecams', 'bongacams', 'livejasmin', 'spankbang', 'tnaflix', 'hclips', 'fapello',
  'mia khalifa', 'lana rhoades', 'riley reid', 'abella danger', 'brandi love',
  'eva elfie', 'nicole aniston', 'janice griffith', 'alexis texas', 'lela star',
  'gianna michaels', 'adriana chechik', 'asa akira', 'mandy muse', 'kendra lust',
  'Jordi El Niño Polla', 'johnny sins', 'danny d', 'Manuel Ferrara', 'mark rockwell',
  'porno', 'porn', 'sexo', 'sex', 'desnudo', 'desnuda', 'erótico', 'erotico', 'erotika',
  'tetas', 'pechos', 'boobs', 'boob', 'nalgas', 'culo', 'culos', 'qlos', 'trasero',
  'pene', 'verga', 'vergota', 'pito', 'chocha', 'vagina', 'vaginas', 'Bichano', 'concha',
  'genital', 'genitales', 'masturbar', 'masturbação', 'masturbacion', 'gemidos',
  'gemir', 'orgia', 'orgy', 'trio', 'trio', 'gangbang', 'creampie', 'facial', 'cum',
  'milf', 'teen', 'incesto', 'incest', 'estupro', 'violacion', 'rape', 'bdsm',
  'hentai', 'tentacle', 'tentáculos', 'fetish', 'fetiche', 'sado', 'sadomaso',
  'camgirl', 'camsex', 'camshow', 'playboy', 'playgirl', 'playmate', 'striptease',
  'striptis', 'slut', 'puta', 'putas', 'perra', 'perras', 'whore', 'fuck', 'fucking',
  'fucked', 'cock', 'dick', 'pussy', 'ass', 'shemale', 'trans', 'transgênero',
  'transgenero', 'lesbian', 'lesbiana', 'gay', 'lgbt', 'explicit', 'hardcore',
  'softcore', 'nudista', 'nudismo', 'nudity', 'deepthroat', 'dp', 'double penetration',
  'analplay', 'analplug', 'rimjob', 'spank', 'spanking', 'lick', 'licking', '69',
  'doggystyle', 'reverse cowgirl', 'cowgirl', 'blowjob', 'bj', 'handjob', 'hj',
  'p0rn', 's3x', 'v@gina', 'c0ck', 'd1ck', 'fuk', 'fuking', 'fak', 'boobz', 'pusy',
  'azz', 'cumshot', 'sexcam', 'livecam', 'webcam', 'sexchat', 'sexshow', 'sexvideo',
  'sexvid', 'sexpics', 'sexphoto', 'seximage', 'sexgif', 'pornpic', 'pornimage',
  'pornvid', 'pornvideo', 'only fan', 'only-fans', 'only_fans', 'onlyfans.com',
  'mia khalifha', 'mia khalifah', 'mia khalifaa', 'mia khalif4', 'mia khal1fa',
  'mia khalifa +18', 'mia khalifa xxx', 'mia khalifa nua', 'mia khalifa porno'
  ]
    const lowerText = text.toLowerCase()
    const nsfwEnabled = global.db.data.chats[m.chat]?.nsfw === true
    if (!nsfwEnabled && bannedWords.some(word => lowerText.includes(word))) {
      return m.reply('《✧》 Este comando não *permite* pesquisas por conteúdo *+18* ou *NSFW*')
    }

    try {
      // ⚡ Reação imediata
      await m.react('🔍')

      // ⚡ Verifica cache (10 minutos)
      const cacheKey = `imagen_${text.toLowerCase()}`
      let results = apiCache.get(cacheKey)

      if (!results) {
        console.log('🔍 Buscando imagens para:', text)
        results = await getImageSearchResults(text)

        if (results.length > 0) {
          apiCache.set(cacheKey, results, 600) // Cache de 10 minutos
        }
      } else {
        console.log('✅ Usando cache para:', text)
      }

      // ⚡ Filtra URLs válidas (formato rápido, sem fazer requisições)
      const validUrls = results.filter(r =>
        r.url &&
        r.url.startsWith('http') &&
        /\.(jpe?g|png|gif|webp)$/i.test(r.url)
      )

      if (validUrls.length < 2) {
        await m.react('❌')
        return client.reply(m.chat, `《✧》 Nenhuma imagem encontrada para: *${text}*\n\n💡 Tente outro termo de pesquisa.`, m)
      }

      // ⚡ Baixa as 10 primeiras imagens em PARALELO (muito rápido!)
      const selectedUrls = validUrls.slice(0, 10)
      console.log(`📥 Baixando ${selectedUrls.length} imagens em paralelo...`)

      const downloadPromises = selectedUrls.map(async (r) => {
        try {
          const response = await axios.get(r.url, { responseType: 'arraybuffer' })
          return {
            type: 'image',
            data: Buffer.from(response.data),
            caption: `╔═══『 🖼️ GOOGLE IMAGENS 』═══╗
║
║ 🔍 *Pesquisa:* ${text}
║
╚═══『 ✧ ZÆRØ BOT ✧ 』═══╝`
          }
        } catch (err) {
          console.error(`❌ Falha ao baixar imagem:`, r.url.substring(0, 50))
          return null
        }
      })

      const downloadedImages = (await Promise.all(downloadPromises)).filter(img => img !== null)

      if (downloadedImages.length < 2) {
        await m.react('❌')
        return client.reply(m.chat, `《✧》 Não foi possível baixar imagens suficientes.\n\n💡 Tente outro termo de pesquisa.`, m)
      }

      console.log(`✅ ${downloadedImages.length} imagens baixadas com sucesso`)
      console.log(`📤 Enviando ${downloadedImages.length} imagens`)
      await client.sendAlbumMessage(m.chat, downloadedImages, { quoted: m })
      await m.react('✅')

    } catch (e) {
      console.error('❌ Erro no comando imagen:', e.message)
      await m.react('❌')
      await m.reply(`> Erro ao buscar imagens: *${e.message}*\n\n💡 Tente novamente em alguns instantes.`)
    }
  }
}

// ⚡ Busca em PARALELO nas APIs (muito mais rápido!)
async function getImageSearchResults(query) {
  const endpoints = [
    { name: 'Stellar', url: `${global.APIs.stellar.url}/search/googleimagen?query=${encodeURIComponent(query)}&key=${global.APIs.stellar.key}`, extractor: res => res.data?.map(d => ({ url: d.url, title: d.title || null })) || [] },
    { name: 'Siputzx', url: `${global.APIs.siputzx.url}/api/images?query=${encodeURIComponent(query)}`, extractor: res => res.data?.map(d => ({ url: d.url, title: null })) || [] },
    { name: 'Delirius', url: `${global.APIs.delirius.url}/search/gimage?query=${encodeURIComponent(query)}`, extractor: res => res.data?.map(d => ({ url: d.url, title: d.origin?.title || null })) || [] },
    { name: 'ApiFaa', url: `${global.APIs.apifaa.url}/faa/google-image?query=${encodeURIComponent(query)}`, extractor: res => res.result?.map(u => ({ url: u, title: null })) || [] }
  ]

  console.log(`🔍 Testando ${endpoints.length} APIs para: ${query}`)

  // ⚡ Testa TODAS as APIs em PARALELO (muito mais rápido!)
  const promises = endpoints.map(async ({ name, url, extractor }) => {
    try {
      console.log(`📡 Tentando API ${name}...`)
      const res = await axios.get(url)
      const results = extractor(res.data)
      console.log(`✅ API ${name}: ${results.length} imagens`)
      return { name, results, error: null }
    } catch (err) {
      console.error(`❌ API ${name} falhou:`, err.message)
      return { name, results: [], error: err.message }
    }
  })

  const allResults = await Promise.all(promises)

  // ⚡ Mostra resumo de todas as APIs
  console.log('📊 Resumo das APIs:')
  allResults.forEach(({ name, results, error }) => {
    if (error) {
      console.log(`   ❌ ${name}: ${error}`)
    } else {
      console.log(`   ✅ ${name}: ${results.length} imagens`)
    }
  })

  // ⚡ Retorna a primeira API que funcionou
  for (const { name, results } of allResults) {
    if (results?.length > 0) {
      console.log(`✨ Usando resultados da API ${name}`)
      return results
    }
  }

  console.error('❌ Nenhuma API retornou resultados!')
  return []
}
