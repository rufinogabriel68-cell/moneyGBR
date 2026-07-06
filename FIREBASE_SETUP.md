# 🔥 Como conectar o FinançasPro ao Firebase (Firestore)

O sistema já está preparado para funcionar **com** ou **sem** Firebase:

- **Sem credenciais configuradas** → funciona em **modo local (memória)**. Os dados existem enquanto o servidor está rodando (ótimo para testar). O cabeçalho mostra um selo âmbar "Modo local".
- **Com credenciais configuradas** → todos os dados são salvos no **Firestore** de verdade e persistem para sempre. O cabeçalho mostra o selo verde "Firebase conectado".

---

## Passo 1 — Criar o projeto no Firebase
1. Acesse https://console.firebase.google.com/
2. Clique em **Adicionar projeto** e siga os passos (pode desativar o Google Analytics).

## Passo 2 — Ativar o Firestore
1. No menu lateral, vá em **Build → Firestore Database**.
2. Clique em **Criar banco de dados**.
3. Escolha o modo **Produção** (ou Teste, se for só experimentar).
4. Escolha a região (ex.: `southamerica-east1` — São Paulo).

## Passo 3 — Gerar a chave da Service Account (Admin)
1. Vá em **⚙️ Configurações do projeto → Contas de serviço**.
2. Clique em **Gerar nova chave privada** → será baixado um arquivo `.json`.
3. Abra esse arquivo. Você vai usar 3 campos:
   - `project_id`
   - `client_email`
   - `private_key`

## Passo 4 — Configurar as variáveis de ambiente
No seu ambiente (arquivo `.env` local **ou** nos "Secrets/Environment Variables" da plataforma), adicione:

```env
FIREBASE_PROJECT_ID=valor-do-project_id
FIREBASE_CLIENT_EMAIL=valor-do-client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...conteúdo...\n-----END PRIVATE KEY-----\n"
```

> ⚠️ Importante sobre a `FIREBASE_PRIVATE_KEY`:
> - Copie o valor **exatamente** como está no JSON (com os `\n`).
> - Coloque entre **aspas duplas**.
> - Se sua plataforma tiver problema com quebras de linha, você pode **converter a chave para base64** e colar o resultado — o sistema detecta e decodifica automaticamente.
>   - No terminal: `base64 -w0 chave.pem` (Linux) ou `base64 -i chave.pem` (Mac).

## Passo 5 — Reiniciar / rebuildar
Depois de salvar as variáveis, rebuilde/reinicie o app. Pronto! O selo no topo ficará **verde "Firebase conectado"** e os dados passam a ser gravados no Firestore.

---

## Coleções criadas automaticamente no Firestore
O sistema cria e usa estas coleções:
- `transactions` — receitas e despesas (PF e PJ)
- `debts` — dívidas
- `savings_goals` — metas / cofrinhos
- `reimbursements` — acertos PF ↔ PJ
- `daily_balances` — **histórico de saldo diário** (a nova aba "Saldo Diário")

Você não precisa criar nada manualmente — na primeira execução o sistema já popula dados de exemplo.

## Regras de segurança do Firestore
Como usamos o **Admin SDK no servidor** (Server Actions do Next.js), o acesso é feito com credencial de administrador — as regras do Firestore para o cliente web **não afetam** este backend. Se você **não** for usar acesso direto pelo navegador, pode manter o Firestore fechado:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false; // acesso só via servidor (Admin SDK)
    }
  }
}
```

---

## Dúvidas comuns
- **"Continua no modo local mesmo com as variáveis"** → confira se os 3 nomes estão exatos (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) e se a private key está entre aspas.
- **"Erro de private key"** → provavelmente os `\n` foram perdidos. Use a opção base64.
- **Os dados sumiram** → você estava no modo local (memória). Configure o Firebase para persistência permanente.
