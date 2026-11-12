# Separação de Notas

App estático (Vite + React + Tailwind CSS + Motion) que lê DANFEs (NF-e em PDF) **no próprio navegador** e separa os produtos por nome e alíquota de ICMS, mostrando a quantidade de cada grupo e estatísticas para conferência contábil.

## Recursos

- Arraste vários PDFs de uma vez; notas repetidas (mesma chave de acesso) são ignoradas.
- Agrupamento por **nome + NCM**, **código do produto** ou **somente NCM** — sempre separado por alíquota.
- Destaque de produtos que aparecem em mais de uma alíquota (ex.: 4% e 12%).
- Conferência automática: soma dos itens e do ICMS × totais impressos no DANFE.
- Matriz NCM × alíquota, origem da mercadoria (CST) e checagem de coerência origem × alíquota interestadual.
- Exportação CSV (padrão Excel pt-BR) da separação e de todos os itens.
- Nada é enviado para servidor; as notas ficam salvas só no `localStorage` do navegador.

> Funciona com PDFs que têm texto (gerados por sistema/Sefaz/fsist). PDFs digitalizados (imagem) não são lidos.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Publicar no GitHub Pages

1. Crie o repositório e envie o código para a branch `main`.
2. Em **Settings → Pages → Build and deployment**, escolha **Source: GitHub Actions**.
3. O workflow `.github/workflows/deploy.yml` faz o build e publica a cada push.

O `base: './'` no `vite.config.ts` faz o app funcionar em qualquer subcaminho (`https://usuario.github.io/repositorio/`).
