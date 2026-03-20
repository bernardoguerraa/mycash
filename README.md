# MyCash 💰

Plataforma de gestão financeira pessoal com rastreamento automatizado de despesas, metas financeiras e assistente de IA para orientação financeira.

## 🚀 Tecnologias Utilizadas

### Frontend
- **React 19** com TypeScript
- **Vite** para build rápido
- **Tailwind CSS** para estilização
- **React Router DOM** para navegação
- **Lucide React** para ícones
- **Zustand** para gerenciamento de estado
- **React Hook Form + Zod** para formulários e validação

### Backend & BaaS
- **Supabase** para banco de dados e autenticação
- **Supabase Edge Functions** para funções serverless

### IA & Utilitários
- **Google Generative AI (Gemini)** para o assistente financeiro
- **ESLint + Prettier** para código limpo

## 📁 Estrutura do Projeto

```
src/
├── components/     # Componentes UI reutilizáveis
├── lib/           # Utilitários e cliente Supabase
├── hooks/         # Hooks customizados React
├── types/         # Interfaces TypeScript
└── ...
supabase/
├── functions/     # Edge Functions (Deno/TypeScript)
└── ...
```

## 🛠️ Configuração do Ambiente

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/bernardoguerraa/mycash.git
   cd mycash
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```
   
   Preencha o arquivo `.env` com:
   - `VITE_SUPABASE_URL` - URL do seu projeto Supabase
   - `VITE_SUPABASE_ANON_KEY` - Chave anônima do Supabase
   - `GEMINI_API_KEY` - API key do Google Gemini

4. **Inicie o ambiente local Supabase:**
   ```bash
   npx supabase start
   ```

5. **Execute o projeto:**
   ```bash
   npm run dev
   ```

## 🏗️ Status do Projeto

- ✅ Setup inicial completo
- ✅ Estrutura de pastas organizada
- ✅ Dependências instaladas
- ✅ Ambiente Supabase configurado
- ✅ Edge Functions preparadas
- 🔄 **Em andamento:** Modelagem do banco de dados e RLS

## 🎯 Próximos Passos

- [ ] Modelagem do banco de dados
- [ ] Configuração de Row Level Security (RLS)
- [ ] Autenticação de usuários
- [ ] Interface de transações
- [ ] Sistema de metas financeiras
- [ ] Assistente de IA integrado

## 📝 Contribuição

Sinta-se à vontade para abrir issues e pull requests para melhorar o projeto!

## 📄 Licença

Este projeto está sob licença MIT.
