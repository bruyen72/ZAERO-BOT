# Deploy por plataforma

## Render
- Arquivo atual mantido: `render.yaml` (sem alteracoes).

## Fly.io
- Config: `deploy/fly/fly.toml`
- Dockerfile: `deploy/fly/Dockerfile.fly` (Node 22)
- Deploy:

```bash
fly deploy --config deploy/fly/fly.toml
```

## Koyeb
- Dockerfile: `deploy/koyeb/Dockerfile.koyeb` (Node 22)
- No Koyeb, configure o caminho do Dockerfile como:

```text
deploy/koyeb/Dockerfile.koyeb
```
