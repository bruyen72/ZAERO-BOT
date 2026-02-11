import moment from 'moment'
moment.locale('es')

export default {
  command: ['setbirth'],
  category: 'profile',
  run: async (client, m, args, usedPrefix, command) => {
    const user = global.db.data.users[m.sender]
    const currentYear = new Date().getFullYear()
    const input = args.join(' ')
    if (!input)return m.reply(`《✧》 Você deve inserir uma data válida para seu aniversário.\n✐ Exemplos:\n> ${usedPrefix + command} *01/01/2000* (dia/mês/ano)\n> ${usedPrefix + command} *01/01* (dia/mês/ano)`)    
    const birth = validarFechaNacimiento(input, currentYear, usedPrefix, command)
    if (typeof birth === 'string' && birth.startsWith('✦'))
      return m.reply(birth)
    if (!birth)
      return m.reply(`《✧》Data inválida. Usar > *${usedPrefix + command} 01/01/2000*`)
    user.birth = birth
    return m.reply(`✎ Sua data de nascimento foi definida como: *${user.birth}*`)
  },
}

function validarFechaNacimiento(text, currentYear, usedPrefix, command) {
  const formatos = ['DD/MM/YYYY', 'DD/MM', 'D MMM', 'D MMM YYYY']
  let fecha = null
  for (const formato of formatos) {
    const f = moment(text, formato, true)
    if (f.isValid()) {
      fecha = f
      break
    }
  }
  if (!fecha) return null
  if (!/\d{4}/.test(text)) {
    fecha.year(currentYear)
  }
  const año = fecha.year()
  const edad = currentYear - año
  if (año > currentYear) {
    return `✦ O ano não pode ser maior que ${currentYear}. Exemplo: ${usedPrefix + command} 01/12/${currentYear}`
  }
  if (edad > 120) {
    return `✦ A data estabelecida é inválida.`
  }
  if (!fecha.isValid()) return null
  const diaSemana = fecha.format('dddd')
  const dia = fecha.date()
  const mes = fecha.format('MMMM')
  return `${diaSemana}, ${dia} de ${mes} de ${año}`
}