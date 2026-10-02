/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Saida standalone: o `next build` passa a emitir `.next/standalone`, com um
   * `server.js` e apenas as dependencias que o runtime realmente alcanca,
   * resolvidas por analise estatica dos imports.
   *
   * E o que torna o ultimo estagio do Dockerfile viavel. Sem isso, a imagem de
   * producao teria de carregar a `node_modules` inteira — centenas de
   * megabytes de ferramenta de compilacao que nunca executam em producao, e
   * que sao superficie de ataque de graca.
   *
   * A Vercel ignora esta opcao (ela faz o proprio empacotamento), entao o
   * deploy atual nao muda.
   */
  output: 'standalone',
};

export default nextConfig;
