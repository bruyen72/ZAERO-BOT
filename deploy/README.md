# Deploy por plataforma

## Render
- Arquivo atual mantido: `render.yaml` (sem alteracoes).

## Fly.io
- Config: `deploy/fly/fly.toml`
- Dockerfile: `deploy/fly/Dockerfile.fly` (Node 22)
- Deploy (obrigatorio usar config separado):

```bash
fly deploy --config deploy/fly/fly.toml
```

- Build-only:

```bash
fly deploy --build-only --push --config deploy/fly/fly.toml
```

- Atalho via npm:

```bash
npm run deploy:fly
```

## Koyeb
- Dockerfile: `deploy/koyeb/Dockerfile.koyeb` (Node 22)
- No Koyeb, configure:
  - Builder: `Docker` (nao Buildpack)
  - Dockerfile path: `deploy/koyeb/Dockerfile.koyeb`

```text
Builder: Docker
Dockerfile path: deploy/koyeb/Dockerfile.koyeb
```

- Validacao local do package.json:

```text
npm run check:package-json
```
