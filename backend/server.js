```js
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, "../frontend")));

const DB_FILE = path.join(__dirname, "db.json");

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return {
      usuarios: [],
      pacientes: [],
      triagens: [],
      consultas: [],
      tv_chamada: null,
      tv_historico: []
    };
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE));

  if (!db.tv_chamada) db.tv_chamada = null;
  if (!db.tv_historico) db.tv_historico = [];
  if (!db.pacientes) db.pacientes = [];
  if (!db.triagens) db.triagens = [];
  if (!db.consultas) db.consultas = [];
  if (!db.usuarios) db.usuarios = [];

  return db;
}

function writeDB(data) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(data, null, 2)
  );
}


// =====================================================
// LOGIN
// =====================================================

app.post("/login", (req, res) => {

  const db = readDB();

  const user = db.usuarios.find(u =>
    u.usuario === req.body.usuario &&
    u.senha === req.body.senha
  );

  if (!user) {
    return res.status(401).json({
      erro: "Login inválido"
    });
  }

  res.json(user);
});


// =====================================================
// ATENDIMENTO - CADASTRAR PACIENTE
// =====================================================

app.post("/atendimento", (req, res) => {

  const db = readDB();

  const paciente = {

    id: Date.now(),

    // DADOS PESSOAIS

    nome: req.body.nome,

    documento: req.body.documento,

    rg: req.body.rg,

    datadenascimento:
      req.body.datadenascimento,

    sexo:
      req.body.sexo,

    nomemae:
      req.body.nomemae,

    estadocivil:
      req.body.estadocivil,


    // ENDEREÇO E CONTATO

    endereco:
      req.body.endereco,

    telefone:
      req.body.telefone,

    email:
      req.body.email,


    // CONTATO DE EMERGÊNCIA

    contatoemergencia:
      req.body.contatoemergencia,

    telefoneemergencia:
      req.body.telefoneemergencia,

    parentesco:
      req.body.parentesco,


    // ATENDIMENTO

    tipo:
      req.body.tipo,

    convenio:
      req.body.convenio,

    numerocarteirinha:
      req.body.numerocarteirinha,


    // CONTROLE DO SISTEMA

    status: "triagem",

    createdAt: new Date()

  };


  db.pacientes.push(paciente);

  writeDB(db);

  res.json(paciente);

});


// =====================================================
// LISTAR PACIENTES
// =====================================================

app.get("/pacientes", (req, res) => {

  const db = readDB();

  res.json(db.pacientes);

});


// =====================================================
// TRIAGEM
// =====================================================

app.post("/triagem", (req, res) => {

  const db = readDB();

  let risco = req.body.risco;


  if (req.body.temperatura >= 39) {

    risco = "vermelho";

  }

  else if (req.body.temperatura >= 38) {

    risco = "amarelo";

  }

  else if (!risco) {

    risco = "verde";

  }


  const triagem = {

    id: Date.now(),

    nome: req.body.nome,

    sintoma:
      req.body.sintoma,

    temperatura:
      req.body.temperatura,

    alergia:
      req.body.alergia,

    observacao:
      req.body.observacao,

    risco: risco,

    status:
      "aguardando_medico",

    createdAt:
      new Date()

  };


  db.triagens.push(triagem);

  writeDB(db);

  res.json(triagem);

});


// =====================================================
// LISTAR TRIAGENS
// =====================================================

app.get("/triagens", (req, res) => {

  const db = readDB();

  res.json(db.triagens);

});


// =====================================================
// MÍDIA INDOOR - TV
// =====================================================

app.post("/tv/chamar", (req, res) => {

  const db = readDB();


  const chamada = {

    id:
      Date.now().toString(),

    localTipo:
      req.body.localTipo,

    localNumero:
      req.body.localNumero,

    paciente:
      req.body.paciente,

    hora:
      new Date().toLocaleTimeString(
        "pt-BR",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      )

  };


  db.tv_chamada = chamada;

  db.tv_historico.unshift(
    chamada
  );


  if (
    db.tv_historico.length > 5
  ) {

    db.tv_historico.pop();

  }


  writeDB(db);

  res.json(chamada);

});


// =====================================================
// CONSULTAR CHAMADA DA TV
// =====================================================

app.get("/tv/chamada", (req, res) => {

  const db = readDB();

  res.json({

    chamada:
      db.tv_chamada,

    historico:
      db.tv_historico

  });

});


// =====================================================
// LISTA DE MEDICAÇÕES
// =====================================================

app.get("/lista-medicacoes", (req, res) => {

  res.json([

    "Dipirona",

    "Paracetamol",

    "Ibuprofeno",

    "Amoxicilina",

    "Azitromicina",

    "Loratadina",

    "Omeprazol",

    "Buscopan",

    "Dramin",

    "Soro fisiológico"

  ]);

});


// =====================================================
// CONSULTA MÉDICA
// =====================================================

app.post("/consulta", (req, res) => {

  const db = readDB();


  const consulta = {

    id: Date.now(),

    paciente:
      req.body.paciente,

    diagnostico:
      req.body.diagnostico,

    medicacao:
      req.body.medicacao,

    obs:
      req.body.obs,

    createdAt:
      new Date()

  };


  db.consultas.push(
    consulta
  );

  writeDB(db);

  res.json(consulta);

});


// =====================================================
// MEDICAÇÕES / CONSULTAS
// =====================================================

app.get("/medicacoes", (req, res) => {

  const db = readDB();

  res.json(db.consultas);

});


// =====================================================
// START
// =====================================================

const PORT =
  process.env.PORT || 3000;


app.listen(PORT, () => {

  console.log(
    `🏥 Hospital Pro rodando em http://localhost:${PORT}`
  );

});
```
