## Pinterest Module

Pasta dedicada ao Pinterest, pronta para migracao dos seus comandos.

Arquivos:
- `commands/pinterest/crawler.js`: crawler principal (funcional)
- `commands/pinterest/index.js`: ponto de import

Import recomendado:

```js
import { fetchPinterestImages } from "../pinterest/index.js"
```

Uso rapido:

```js
const result = await fetchPinterestImages({
  queryOrUrl: "anime couple",
  maxImages: 2,
  maxPages: 6,
  pinterestEmail: process.env.PINTEREST_EMAIL,
  pinterestPassword: process.env.PINTEREST_PASSWORD,
  requireAuth: String(process.env.PINTEREST_REQUIRE_AUTH || "").trim() === "1",
});
```

Comando no bot:

```txt
.pin <termo|link>
.pinterest <termo|link>
```

Exemplos:

```txt
.pin anime casal
.pin https://br.pinterest.com/pin/99360735500167749/
```

Se o usuario enviar apenas `.pin` ou `.pinterest` sem argumento, o bot responde pedindo um termo ou link.

Obs:
- Modulo em ESM para uso direto em comandos carregados por `commandLoader`.
## Env

No arquivo `.env` da raiz do projeto:

```env
PINTEREST_EMAIL=
PINTEREST_PASSWORD=
PINTEREST_REQUIRE_AUTH=0
```

- `PINTEREST_REQUIRE_AUTH=1`: exige login funcionar.
- `PINTEREST_REQUIRE_AUTH=0`: se login falhar, tenta modo publico.
