import http from 'http'

const port = Number(process.env.PORT || 3000)
const req = http.request(
  {
    host: '127.0.0.1',
    port,
    path: '/health',
    method: 'GET',
    timeout: 2000,
  },
  (res) => {
    if (res.statusCode === 200) {
      process.exit(0)
      return
    }
    process.exit(1)
  },
)

req.on('timeout', () => {
  req.destroy(new Error('timeout'))
})

req.on('error', () => {
  process.exit(1)
})

req.end()
