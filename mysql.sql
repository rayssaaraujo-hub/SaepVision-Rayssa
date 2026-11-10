
CREATE DATABASE IF NOT EXISTS saepvision
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE saepvision;

CREATE TABLE IF NOT EXISTS tb_usuario (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  nome_usuario VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(180) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  imagem_usuario VARCHAR(255),
  tipo ENUM('usuario','fotografo') NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tb_publicacao (
  id_publicacao INT AUTO_INCREMENT PRIMARY KEY,
  titulo_imagem VARCHAR(180) NOT NULL,
  local_foto VARCHAR(180) NOT NULL,
  id_usuario INT NOT NULL,
  url_fotografia VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_publicacao_usuario FOREIGN KEY (id_usuario)
    REFERENCES tb_usuario(id_usuario) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tb_curtida (
  id_curtida INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_publicacao INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_curtida_usuario_publicacao UNIQUE (id_usuario,id_publicacao),
  CONSTRAINT fk_curtida_usuario FOREIGN KEY (id_usuario)
    REFERENCES tb_usuario(id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_curtida_publicacao FOREIGN KEY (id_publicacao)
    REFERENCES tb_publicacao(id_publicacao) ON DELETE CASCADE
);

