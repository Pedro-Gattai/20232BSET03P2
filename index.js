const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.json());

const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run("CREATE TABLE cats (id INTEGER PRIMARY KEY, name TEXT, votes INT)");
  db.run("CREATE TABLE dogs (id INTEGER PRIMARY KEY, name TEXT, votes INT)");
});

const isValidName = (name) => {
  return typeof name === 'string' && name.trim().length > 0;
};

const insertAnimal = (type, name, res) => {
  if (!isValidName(name)) {
    return res.status(400).send("Nome inválido");
  }

  const insert = db.prepare(`INSERT INTO ${type} (name, votes) VALUES (?, 0)`);
  insert.run(name, function (err) {
    if (err) {
      res.status(500).send("Erro ao inserir no banco de dados");
    } else {
      res.status(201).json({ id: this.lastID, name, votes: 0 });
    }
  });
  insert.finalize();
};

app.post('/cats', (req, res) => {
  insertAnimal('cats', req.body.name, res);
});

app.post('/dogs', (req, res) => {
  insertAnimal('dogs', req.body.name, res);
});

app.post('/vote/:animalType/:id', (req, res) => {
  const { animalType, id } = req.params;
  if (!['cats', 'dogs'].includes(animalType)) {
    return res.status(400).send("Tipo de animal inválido");
  }
  db.get(`SELECT * FROM ${animalType} WHERE id = ?`, [id], (err, row) => {
    if (err || !row) {
      return res.status(404).send("Animal não encontrado");
    }
    db.run(`UPDATE ${animalType} SET votes = votes + 1 WHERE id = ?`, [id], (err) => {
      if (err) {
        return res.status(500).send("Erro ao atualizar voto");
      }
      res.status(200).send("Voto computado");
    });
  });
});

app.get('/cats', (req, res) => {
  db.all("SELECT * FROM cats", [], (err, rows) => {
    if (err) {
      return res.status(500).send("Erro ao consultar o banco de dados");
    }
    res.json(rows);
  });
});

app.get('/dogs', (req, res) => {
  db.all("SELECT * FROM dogs", [], (err, rows) => {
    if (err) {
      return res.status(500).send("Erro ao consultar o banco de dados");
    }
    res.json(rows);
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Ocorreu um erro!');
});

app.listen(port, () => {
  console.log(`Cats and Dogs Vote app listening at http://localhost:${port}`);
});