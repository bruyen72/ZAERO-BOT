import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

/**
 * Faz scraping do Tenor para buscar GIFs sem API Key.
 * @param {string} term Termo de busca
 * @returns {Promise<string[]>} Lista de URLs de GIFs
 */
export async function scrapeTenor(term) {
  const query = term.trim().replace(/\s+/g, '-')
  const url = `https://tenor.com/search/${query}-gifs`
  
  console.log(`[TenorScraper] Scraping: ${url}`)
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    
    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`)
    const html = await res.text()
    const $ = cheerio.load(html)
    
    const results = new Set()
    
    // Tenta encontrar URLs de mídia diretamente no HTML
    // O Tenor muitas vezes coloca os dados em uma tag script ID "__NEXT_DATA__" ou similar
    const nextData = $('#__NEXT_DATA__').html()
    if (nextData) {
      try {
        const json = JSON.parse(nextData)
        // A estrutura do Next.js do Tenor varia, mas geralmente os resultados estão em props.pageProps
        const items = json?.props?.pageProps?.searchObj?.results || []
        for (const item of items) {
          const media = item?.media_formats?.gif?.url || item?.media_formats?.tinygif?.url
          if (media) results.add(media)
        }
      } catch (e) {
        console.warn('[TenorScraper] Falha ao parsear __NEXT_DATA__')
      }
    }
    
    // Fallback: Procura por imagens na página que contenham tenor.com/m
    $('img').each((i, el) => {
      const src = $(el).attr('src')
      if (src && src.includes('media.tenor.com') && (src.endsWith('.gif') || src.includes('/m/'))) {
        // Limpa a URL (remove redimensionamentos se houver)
        results.add(src.split('?')[0])
      }
    })

    // Fallback 2: Regex bruto no HTML se nada acima funcionar
    if (results.size === 0) {
      const regex = /https:\/\/media\.tenor\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.gif/g
      const matches = html.match(regex)
      if (matches) {
        matches.forEach(m => results.add(m))
      }
    }
    
    const finalUrls = Array.from(results)
    console.log(`[TenorScraper] Encontrados ${finalUrls.length} GIFs`)
    return finalUrls
  } catch (error) {
    console.error(`[TenorScraper] Erro: ${error.message}`)
    return []
  }
}

export default { scrapeTenor }
