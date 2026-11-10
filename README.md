# SAEPVision — execução no VS Code

## Requisitos
- Node.js LTS instalado
- VS Code

## Instalação
Abra esta pasta no VS Code. No terminal integrado (Terminal > Novo Terminal), execute:

```bash
npm install
npm start
```

Abra `http://localhost:3000` no navegador.

Na primeira execução, o servidor cria `database.sqlite`, importa automaticamente os seis usuários do CSV fornecido e cadastra as nove fotografias de exemplo para elas aparecerem na galeria.

O arquivo `mysql.sql` contém o modelo equivalente para MySQL 8+. Atenção: a aplicação entregue continua usando SQLite; o SQL MySQL é o esquema para migração/uso no MySQL Workbench.

## Acessos para teste
- fotografo1@email.com / 123456
- fotografo2@gmail.com / 123456
- fotografo3@gmail.com / 123456
- usuario1@gmail.com / 123456
- usuario2@gmail.com / 123456
- usuario3@gmail.com / 123456

## Observações
- Faça login para pesquisar fotógrafos e curtir publicações.
- Somente contas do tipo fotógrafo podem cadastrar e excluir publicações.
- As imagens de exemplo ficam em `public/assets`; novos uploads ficam em `public/uploads`.
- O banco SQLite é criado localmente na raiz do projeto.
