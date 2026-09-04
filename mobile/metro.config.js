// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/**
 * O app importa a camada de dominio de `../src/domain`, compartilhada com o
 * web. Por padrao o Metro so enxerga arquivos dentro de `mobile/`, entao essa
 * pasta precisa entrar em `watchFolders` — sem isso o bundle falha com
 * "Unable to resolve module".
 *
 * So o `watchFolders` muda. Uma versao anterior desta config tambem travava
 * `nodeModulesPaths` e ligava `disableHierarchicalLookup`, para impedir que o
 * Metro subisse ate o `node_modules` da raiz (onde vive o React 18 do Next).
 * Isso quebrou o bundle: pacotes aninhados como `expo-asset` deixaram de ser
 * encontrados. A protecao era desnecessaria — a pasta compartilhada e
 * TypeScript puro, sem uma unica dependencia externa, entao nao ha o que
 * resolver fora de `mobile/node_modules`.
 *
 * Por que compartilhar em vez de duplicar: enquanto havia duas copias das
 * regras, elas divergiram. O app aceitava aporte em meta ja concluida, somava
 * sem arredondar centavos e tratava "12abc" como 12. Copia de regra de
 * negocio nao envelhece bem.
 */

const projectRoot = __dirname;
const dominioCompartilhado = path.resolve(projectRoot, '..', 'src', 'domain');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [dominioCompartilhado];

module.exports = config;
