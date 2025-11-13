const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, 'duelias.db'), (err) => {
            if (err) {
                console.error('Erro ao conectar com o banco de dados:', err);
            } else {
                console.log('✅ Conectado ao SQLite');
                this.initDatabase();
            }
        });
    }

    async initDatabase() {
        try {
            await this.runAsync(`
                CREATE TABLE IF NOT EXISTS usuarios
                (
                    id
                    INTEGER
                    PRIMARY
                    KEY
                    AUTOINCREMENT,
                    tipoUsuario
                    INTEGER
                    DEFAULT
                    0,
                    email
                    VARCHAR
                (
                    50
                ) UNIQUE NOT NULL,
                    senha VARCHAR
                (
                    100
                ) NOT NULL,
                    mudaSenha INTEGER DEFAULT 1,
                    liberacao INTEGER DEFAULT 1,
                    ativo INTEGER DEFAULT 1,
                    excluido_em DATETIME DEFAULT NULL,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
            `);

            await this.runAsync(`
                CREATE TABLE IF NOT EXISTS perfis
                (
                    id
                    INTEGER
                    PRIMARY
                    KEY
                    AUTOINCREMENT,
                    userID
                    INTEGER
                    NOT
                    NULL,
                    nome
                    VARCHAR
                (
                    50
                ) NOT NULL,
                    contato VARCHAR
                (
                    11
                ),
                    foto VARCHAR
                (
                    255
                ),
                    FOREIGN KEY
                (
                    userID
                ) REFERENCES usuarios
                (
                    id
                ) ON DELETE CASCADE
                    )
            `);

            await this.runAsync(`
                CREATE TABLE IF NOT EXISTS servicos
                (
                    id
                    INTEGER
                    PRIMARY
                    KEY
                    AUTOINCREMENT,
                    nome
                    VARCHAR
                (
                    50
                ) NOT NULL,
                    descricao TEXT,
                    preco DECIMAL
                (
                    10,
                    2
                ),
                    duracao INTEGER,
                    ativo INTEGER DEFAULT 1
                    )
            `);

            await this.runAsync(`
                CREATE TABLE IF NOT EXISTS agendamentos
                (
                    id
                    INTEGER
                    PRIMARY
                    KEY
                    AUTOINCREMENT,
                    userID
                    INTEGER
                    NOT
                    NULL,
                    servicoID
                    INTEGER
                    NOT
                    NULL,
                    date
                    TEXT
                    NOT
                    NULL,
                    time
                    TEXT
                    NOT
                    NULL,
                    observacoes
                    TEXT,
                    status
                    VARCHAR
                (
                    20
                ) DEFAULT 'agendado',
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY
                (
                    userID
                ) REFERENCES usuarios
                (
                    id
                ),
                    FOREIGN KEY
                (
                    servicoID
                ) REFERENCES servicos
                (
                    id
                )
                    )
            `);

            await this.runAsync(`
                CREATE TABLE IF NOT EXISTS estabelecimentos
                (
                    id
                    INTEGER
                    PRIMARY
                    KEY
                    AUTOINCREMENT,
                    nome
                    VARCHAR
                (
                    100
                ) NOT NULL,
                    endereco VARCHAR
                (
                    255
                ) NOT NULL,
                    contato VARCHAR
                (
                    20
                ),
                    ativo INTEGER DEFAULT 1
                    )
            `);

            await this.runAsync(`
                CREATE TABLE IF NOT EXISTS refresh_tokens
                (
                    id
                    INTEGER
                    PRIMARY
                    KEY
                    AUTOINCREMENT,
                    userID
                    INTEGER
                    NOT
                    NULL,
                    token
                    TEXT
                    NOT
                    NULL
                    UNIQUE,
                    expiresAt
                    DATETIME
                    NOT
                    NULL,
                    createdAt
                    DATETIME
                    DEFAULT
                    CURRENT_TIMESTAMP,
                    FOREIGN
                    KEY
                (
                    userID
                ) REFERENCES usuarios
                (
                    id
                ) ON DELETE CASCADE
                    )
            `);

            await this.runAsync(`
                CREATE TABLE IF NOT EXISTS password_resets
                (
                    id
                    INTEGER
                    PRIMARY
                    KEY
                    AUTOINCREMENT,
                    userID
                    INTEGER
                    NOT
                    NULL,
                    token
                    TEXT
                    NOT
                    NULL
                    UNIQUE,
                    expiresAt
                    DATETIME
                    NOT
                    NULL,
                    usedAt
                    DATETIME,
                    createdAt
                    DATETIME
                    DEFAULT
                    CURRENT_TIMESTAMP,
                    FOREIGN
                    KEY
                (
                    userID
                ) REFERENCES usuarios
                (
                    id
                ) ON DELETE CASCADE
                    )
            `);

            console.log('✅ Tabelas criadas/verificadas com sucesso');

            const adminExists = await this.getAsync('SELECT id FROM usuarios WHERE email = ?', ['admin@gmail.com']);

            if (!adminExists) {
                const hashedPassword = await bcrypt.hash('admin123', 10);
                const result = await this.runAsync(
                    'INSERT INTO usuarios (email, senha, tipoUsuario, mudaSenha, liberacao, ativo) VALUES (?, ?, 1, 0, 1, 1)',
                    ['admin@gmail.com', hashedPassword]
                );

                await this.runAsync(
                    'INSERT INTO perfis (userID, nome, contato) VALUES (?, ?, ?)',
                    [result.lastID, 'Administrador', '11999999999']
                );

                console.log('✅ Usuário admin criado com sucesso');
            }

            const servicesExist = await this.getAsync('SELECT id FROM servicos LIMIT 1');

            if (!servicesExist) {
                const defaultServices = [
                    ['Corte de Cabelo', 'Corte moderno e estilizado', 30.00, 30],
                    ['Barba', 'Aparar e modelar barba', 20.00, 20],
                    ['Sobrancelha', 'Design de sobrancelhas', 15.00, 15],
                    ['Pézinho', 'Acertar as laterais', 10.00, 10]
                ];

                for (const service of defaultServices) {
                    await this.runAsync(
                        'INSERT INTO servicos (nome, descricao, preco, duracao) VALUES (?, ?, ?, ?)',
                        service
                    );
                }

                console.log('✅ Serviços padrão criados com sucesso');
            }

            const estabExists = await this.getAsync('SELECT id FROM estabelecimentos LIMIT 1');

            if (!estabExists) {
                await this.runAsync(
                    'INSERT INTO estabelecimentos (nome, endereco, contato) VALUES (?, ?, ?)',
                    ['Duelias Barbearia', 'Rua Principal, 123', '(11) 9999-9999']
                );

                console.log('✅ Estabelecimento padrão criado com sucesso');
            }

            // Criar índices
            await this.runAsync(`CREATE INDEX IF NOT EXISTS idx_resets_user ON password_resets(userID);`);
            await this.runAsync(`CREATE INDEX IF NOT EXISTS idx_ag_user ON agendamentos(userID);`);
            await this.runAsync(`CREATE INDEX IF NOT EXISTS idx_ag_data ON agendamentos(data);`);

        } catch (error) {
            console.error('❌ Erro ao inicializar banco de dados:', error);
        }
    }

    runAsync(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({lastID: this.lastID, changes: this.changes});
                }
            });
        });
    }

    getAsync(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    allAsync(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    run(sql, params = [], callback) {
        return this.db.run(sql, params, callback);
    }

    get(sql, params = [], callback) {
        return this.db.get(sql, params, callback);
    }

    all(sql, params = [], callback) {
        return this.db.all(sql, params, callback);
    }

    close() {
        this.db.close();
    }
}

module.exports = new Database();