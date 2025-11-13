## Esquema do Banco de Dados - Barbearia Duelias

### Tabela: USUARIOS
- **ID**: INTEGER, PRIMARY KEY, AUTOINCREMENT
- **tipoUsuario**: INTEGER (0: usuário, 1: administrador)
- **email**: VARCHAR(50), UNIQUE, NOT NULL
- **senha**: VARCHAR(100), NOT NULL (armazenar hash)
- **mudaSenha**: INTEGER (0: não, 1: sim)
- **liberacao**: INTEGER (0: inativo, 1: ativo)
- **createdAt**: DATETIME DEFAULT CURRENT_TIMESTAMP

### Tabela: PERFIS (CORRIGIDO: nome no plural)
- **ID**: INTEGER, PRIMARY KEY, AUTOINCREMENT
- **userID**: INTEGER, FOREIGN KEY (referencia USUARIOS.ID)
- **nome**: VARCHAR(50), NOT NULL
- **contato**: VARCHAR(11)
- **foto**: VARCHAR(255)

### Tabela: SERVICOS
- **ID**: INTEGER, PRIMARY KEY, AUTOINCREMENT
- **nome**: VARCHAR(50), NOT NULL
- **descricao**: TEXT
- **preco**: DECIMAL(10,2)
- **duracao**: INTEGER
- **ativo**: INTEGER DEFAULT 1

### Tabela: AGENDAMENTOS
- **ID**: INTEGER, PRIMARY KEY, AUTOINCREMENT
- **userID**: INTEGER, FOREIGN KEY (referencia USUARIOS.ID)
- **servicoID**: INTEGER, FOREIGN KEY (referencia SERVICOS.ID)
- **data**: DATETIME, NOT NULL
- **observacoes**: TEXT
- **status**: VARCHAR(20) DEFAULT 'agendado'
- **createdAt**: DATETIME DEFAULT CURRENT_TIMESTAMP

### Tabela: ESTABELECIMENTOS
- **ID**: INTEGER, PRIMARY KEY, AUTOINCREMENT
- **nome**: VARCHAR(100), NOT NULL
- **endereco**: VARCHAR(255), NOT NULL
- **contato**: VARCHAR(20)
- **ativo**: INTEGER DEFAULT 1