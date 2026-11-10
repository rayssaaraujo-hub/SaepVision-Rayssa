const express = require('express');
const session = require('express-session');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));
const uploadDir = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'saepvision-chave-local-2026',
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

db.serialize(() => {
  db.run(`PRAGMA foreign_keys = ON`);
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, nome_usuario TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL, senha TEXT NOT NULL, imagem_usuario TEXT, tipo TEXT NOT NULL CHECK(tipo IN ('fotografo','usuario'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS publicacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL,
    titulo TEXT NOT NULL, local TEXT NOT NULL, imagem TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS curtidas (
    id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL, publicacao_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, publicacao_id),
    FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY(publicacao_id) REFERENCES publicacoes(id) ON DELETE CASCADE
  )`);
  const seedPhotos = () => {
    db.get('SELECT COUNT(*) AS total FROM publicacoes', (pubErr, pubRow) => {
      if (pubErr || pubRow.total) return;
      const fotos = [
        [1, 'Fotografia 1', 'Local não informado', 'foto1.jpg'],
        [1, 'Fotografia 2', 'Local não informado', 'foto2.jpg'],
        [2, 'Fotografia 3', 'Local não informado', 'foto3.jpg'],
        [2, 'Fotografia 4', 'Local não informado', 'foto4.jpg'],
        [3, 'Fotografia 5', 'Local não informado', 'foto5.jpg'],
        [3, 'Fotografia 6', 'Local não informado', 'foto6.jpg'],
        [1, 'Fotografia 7', 'Local não informado', 'foto7.jpg'],
        [2, 'Fotografia 8', 'Local não informado', 'foto8.jpg'],
        [3, 'Fotografia 9', 'Local não informado', 'foto9.jpg']
      ];
      const pubStmt = db.prepare('INSERT INTO publicacoes(usuario_id,titulo,local,imagem) VALUES(?,?,?,?)');
      fotos.forEach(f => pubStmt.run(f));
      pubStmt.finalize(() => console.log('Fotografias de exemplo cadastradas.'));
    });
  };
  db.get("SELECT COUNT(*) AS total FROM usuarios", (err, row) => {
    if (err) return console.error(err);
    if (row.total) return seedPhotos();
    const csv = path.join(__dirname, 'anexos_prova', 'arquivo_csv', 'tb_usuario.csv');
    if (!fs.existsSync(csv)) {
      console.warn('CSV não encontrado; importe os usuários manualmente.');
      return seedPhotos();
    }
    const lines = fs.readFileSync(csv, 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/).slice(1);
    const stmt = db.prepare(`INSERT OR IGNORE INTO usuarios (id,nome,nome_usuario,email,senha,imagem_usuario,tipo) VALUES (?,?,?,?,?,?,?)`);
    for (const line of lines) {
      const c = line.split(',');
      if (c.length >= 7) stmt.run(Number(c[0]), c[1], c[2], c[3], bcrypt.hashSync(c[4], 10), c[5], c[6]);
    }
    stmt.finalize(() => {
      console.log('Usuários do CSV importados.');
      seedPhotos();
    });
  });
});

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'))
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = /^image\/(jpeg|png|gif|webp)$/.test(file.mimetype);
    cb(ok ? null : new Error('Formato inválido. Use JPG, JPEG, PNG, GIF ou WEBP.'), ok);
  }
});
const publicUser = u => ({ id:u.id, nome:u.nome, nome_usuario:u.nome_usuario, email:u.email, imagem_usuario:u.imagem_usuario, tipo:u.tipo });
const auth = (req,res,next) => req.session.user ? next() : res.status(401).json({ erro:'Faça login para continuar.' });
const photographer = (req,res,next) => req.session.user?.tipo === 'fotografo' ? next() : res.status(403).json({ erro:'Ação permitida somente para fotógrafos.' });

app.get('/api/me', (req,res) => res.json({ user: req.session.user || null }));
app.post('/api/login', (req,res) => {
  const { email, senha } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !senha) return res.status(400).json({ erro:'Informe um e-mail válido e a senha.' });
  db.get('SELECT * FROM usuarios WHERE lower(email)=lower(?)', [email], (err,u) => {
    if (err) return res.status(500).json({erro:'Erro no banco de dados.'});
    if (!u || !bcrypt.compareSync(senha,u.senha)) return res.status(401).json({erro:'Usuário não encontrado ou senha incorreta'});
    req.session.user = publicUser(u);
    res.json({ user:req.session.user });
  });
});
app.post('/api/logout', auth, (req,res) => req.session.destroy(() => res.json({ok:true})));

const publicationQuery = `SELECT p.id,p.titulo,p.local,p.imagem,p.created_at,
  u.id AS fotografo_id,u.nome AS fotografo,u.nome_usuario,u.imagem_usuario,
  COUNT(DISTINCT c.id) AS curtidas,
  MAX(CASE WHEN c.usuario_id = ? THEN 1 ELSE 0 END) AS curtida_por_mim
  FROM publicacoes p JOIN usuarios u ON u.id=p.usuario_id
  LEFT JOIN curtidas c ON c.publicacao_id=p.id`;
app.get('/api/publicacoes', (req,res) => {
  const q = (req.query.fotografo || '').trim();
  let sql = publicationQuery + ' WHERE 1=1';
  const params = [req.session.user?.id || 0];
  if (q) { sql += ' AND (u.nome LIKE ? OR u.nome_usuario LIKE ?)'; params.push(`%${q}%`,`%${q}%`); }
  sql += ' GROUP BY p.id ORDER BY p.created_at DESC';
  db.all(sql,params,(e,rows)=> e ? res.status(500).json({erro:'Erro ao carregar publicações.'}) : res.json(rows));
});
app.post('/api/curtidas/:id', auth, (req,res) => {
  const id = Number(req.params.id), uid = req.session.user.id;
  db.get('SELECT id FROM curtidas WHERE usuario_id=? AND publicacao_id=?',[uid,id],(e,row)=>{
    if (e) return res.status(500).json({erro:'Erro ao curtir.'});
    if (row) db.run('DELETE FROM curtidas WHERE id=?',[row.id],err=>err?res.status(500).json({erro:'Erro ao remover curtida.'}):res.json({curtido:false}));
    else db.run('INSERT OR IGNORE INTO curtidas(usuario_id,publicacao_id) VALUES(?,?)',[uid,id],err=>err?res.status(500).json({erro:'Erro ao curtir.'}):res.json({curtido:true}));
  });
});
app.get('/api/perfil', auth, photographer, (req,res) => {
  db.get(`SELECT COUNT(DISTINCT p.id) AS publicacoes, COUNT(c.id) AS likes
    FROM publicacoes p LEFT JOIN curtidas c ON c.publicacao_id=p.id WHERE p.usuario_id=?`,
    [req.session.user.id],(e,row)=>e?res.status(500).json({erro:'Erro ao carregar perfil.'}):res.json(row));
});
app.post('/api/publicacoes', auth, photographer, upload.single('imagem'), (req,res) => {
  const {titulo,local} = req.body;
  if (!titulo?.trim() || !local?.trim() || !req.file) return res.status(400).json({erro:'Preencha título, local e selecione uma imagem.'});
  db.run('INSERT INTO publicacoes(usuario_id,titulo,local,imagem) VALUES(?,?,?,?)',
    [req.session.user.id,titulo.trim(),local.trim(),'/uploads/'+req.file.filename],
    function(e){ e?res.status(500).json({erro:'Não foi possível cadastrar.'}):res.status(201).json({id:this.lastID}); });
});
app.delete('/api/publicacoes/:id', auth, photographer, (req,res) => {
  db.run('DELETE FROM publicacoes WHERE id=? AND usuario_id=?',[Number(req.params.id),req.session.user.id],
    function(e){ e?res.status(500).json({erro:'Erro ao excluir.'}):this.changes?res.json({ok:true}):res.status(404).json({erro:'Publicação não encontrada.'}); });
});
app.get('/api/minhas-publicacoes', auth, photographer, (req,res) => {
  db.all('SELECT id,titulo,local,imagem FROM publicacoes WHERE usuario_id=? ORDER BY created_at DESC',[req.session.user.id],(e,rows)=>e?res.status(500).json({erro:'Erro ao carregar.'}):res.json(rows));
});
app.use((err,req,res,next) => res.status(400).json({erro:err.message || 'Requisição inválida.'}));
app.listen(PORT,()=>console.log(`SAEPVision rodando em http://localhost:${PORT}`));
