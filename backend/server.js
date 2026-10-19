
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, "../frontend")));

const DB_FILE = path.join(__dirname, "db.json");

// =====================================================
// BANCO DE DADOS JSON
// =====================================================

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

  const db = JSON.parse(
    fs.readFileSync(DB_FILE, "utf8")
  );

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
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

// =====================================================
// CLASSIFICAÇÃO DEMONSTRATIVA DE RISCO
// Não substitui avaliação profissional.
// Não é um protocolo clínico validado.
// =====================================================

function classificarRisco(sintoma, temperatura) {
  const vermelhos = [
    "infarto",
    "avc",
    "convulsao",
    "hemorragia",
    "falta_ar_grave"
  ];

  const amarelos = [
    "febre",
    "vomito",
    "diarreia",
    "falta_ar_moderada"
  ];

  const sintomasLeves = [
    "dor_leve",
    "resfriado",
    "coriza",
    "tosse"
  ];

  if (!sintoma) {
    return {
      risco: "avaliacao_necessaria",
      motivo:
        "Sintoma não informado. É necessária avaliação antes da classificação."
    };
  }

  // Sinais de alerta selecionados no formulário.
  if (vermelhos.includes(sintoma)) {
    return {
      risco: "vermelho",
      motivo:
        "Sinal de alerta selecionado. Priorizar avaliação imediata."
    };
  }

  // Alertas demonstrativos de temperatura.
  // A temperatura isolada não determina a gravidade clínica.
  if (
    temperatura !== null &&
    (temperatura < 35 || temperatura >= 40)
  ) {
    return {
      risco: "vermelho",
      motivo:
        "Temperatura em faixa de alerta. É necessária avaliação imediata."
    };
  }

  if (amarelos.includes(sintoma)) {
    return {
      risco: "amarelo",
      motivo:
        "Sintoma que requer avaliação prioritária neste modelo demonstrativo."
    };
  }

  if (temperatura !== null && temperatura >= 38) {
    return {
      risco: "amarelo",
      motivo:
        "Temperatura elevada registrada. Requer avaliação profissional prioritária."
    };
  }

  if (sintomasLeves.includes(sintoma) && temperatura !== null) {
    return {
      risco: "verde",
      motivo:
        "Nenhum alerta automático foi identificado pelos dados informados. A avaliação profissional continua necessária."
    };
  }

  return {
    risco: "avaliacao_necessaria",
    motivo:
      "Dados insuficientes para uma classificação demonstrativa segura."
  };
}

// =====================================================
// LOGIN
// =====================================================

app.post("/login", (req, res) => {
  try {
    const db = readDB();

    const user = db.usuarios.find(user =>
      user.usuario === req.body.usuario &&
      user.senha === req.body.senha
    );

    if (!user) {
      return res.status(401).json({
        erro: "Login inválido"
      });
    }

    res.json(user);
  } catch (erro) {
    console.error("Erro no login:", erro);

    res.status(500).json({
      erro: "Erro ao realizar login"
    });
  }
});

// =====================================================
// ATENDIMENTO - CADASTRAR PACIENTE
// =====================================================

app.post("/atendimento", (req, res) => {
  try {
    const db = readDB();

    const paciente = {
      id: Date.now(),

      // DADOS PESSOAIS
      nome: req.body.nome || "",
      documento: req.body.documento || "",
      rg: req.body.rg || "",
      datadenascimento: req.body.datadenascimento || "",
      sexo: req.body.sexo || "",
      nomemae: req.body.nomemae || "",
      estadocivil: req.body.estadocivil || "",

      // ENDEREÇO E CONTATO
      endereco: req.body.endereco || "",
      telefone: req.body.telefone || "",
      email: req.body.email || "",

      // CONTATO DE EMERGÊNCIA
      contatoemergencia: req.body.contatoemergencia || "",
      telefoneemergencia: req.body.telefoneemergencia || "",
      parentesco: req.body.parentesco || "",

      // ATENDIMENTO
      tipo: req.body.tipo || "",
      convenio: req.body.convenio || "",
      numerocarteirinha: req.body.numerocarteirinha || "",

      // CONTROLE DO SISTEMA
      status: "triagem",
      createdAt: new Date().toISOString()
    };

    if (!paciente.nome.trim()) {
      return res.status(400).json({
        erro: "Informe o nome do paciente"
      });
    }

    db.pacientes.push(paciente);

    writeDB(db);

    res.status(201).json(paciente);
  } catch (erro) {
    console.error("Erro ao cadastrar paciente:", erro);

    res.status(500).json({
      erro: "Erro ao salvar paciente"
    });
  }
});

// =====================================================
// LISTAR PACIENTES
// =====================================================

app.get("/pacientes", (req, res) => {
  try {
    const db = readDB();

    res.json(db.pacientes);
  } catch (erro) {
    console.error("Erro ao buscar pacientes:", erro);

    res.status(500).json({
      erro: "Erro ao buscar pacientes"
    });
  }
});

// =====================================================
// TRIAGEM
// =====================================================

app.post("/triagem", (req, res) => {
  try {
    const db = readDB();

    const nome = String(req.body.nome || "").trim();
    const sintoma = String(req.body.sintoma || "").trim();
    const alergia = String(req.body.alergia || "").trim();
    const observacao = String(req.body.observacao || "").trim();

    if (!nome) {
      return res.status(400).json({
        erro: "Informe o nome do paciente"
      });
    }

    if (!sintoma) {
      return res.status(400).json({
        erro: "Selecione um sintoma"
      });
    }

    let temperatura = null;

    const temperaturaEnviada =
      req.body.temperatura !== undefined &&
      req.body.temperatura !== null &&
      String(req.body.temperatura).trim() !== "";

    if (temperaturaEnviada) {
      temperatura = Number(req.body.temperatura);

      if (
        !Number.isFinite(temperatura) ||
        temperatura < 25 ||
        temperatura > 45
      ) {
        return res.status(400).json({
          erro: "Temperatura inválida. Confira o valor informado."
        });
      }
    }

    // O risco enviado pelo navegador é ignorado.
    // A classificação é calculada no servidor.
    const classificacao = classificarRisco(
      sintoma,
      temperatura
    );

    const triagem = {
      id: Date.now(),

      nome,
      sintoma,
      temperatura,
      alergia,
      observacao,

      risco: classificacao.risco,
      motivoRisco: classificacao.motivo,

      status: "aguardando_medico",

      createdAt: new Date().toISOString()
    };

    db.triagens.push(triagem);

    writeDB(db);

    res.status(201).json(triagem);
  } catch (erro) {
    console.error("Erro ao salvar triagem:", erro);

    res.status(500).json({
      erro: "Erro ao salvar triagem"
    });
  }
});

// =====================================================
// LISTAR TRIAGENS
// =====================================================

app.get("/triagens", (req, res) => {
  try {
    const db = readDB();

    res.json(db.triagens);
  } catch (erro) {
    console.error("Erro ao buscar triagens:", erro);

    res.status(500).json({
      erro: "Erro ao buscar triagens"
    });
  }
});

// =====================================================
// MÍDIA INDOOR - TV
// =====================================================

app.post("/tv/chamar", (req, res) => {
  try {
    const db = readDB();

    const chamada = {
      id: Date.now().toString(),

      localTipo: req.body.localTipo || "",
      localNumero: req.body.localNumero || "",
      paciente: req.body.paciente || "",

      hora: new Date().toLocaleTimeString(
        "pt-BR",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      )
    };

    db.tv_chamada = chamada;

    db.tv_historico.unshift(chamada);

    if (db.tv_historico.length > 5) {
      db.tv_historico.pop();
    }

    writeDB(db);

    res.json(chamada);
  } catch (erro) {
    console.error("Erro ao chamar paciente:", erro);

    res.status(500).json({
      erro: "Erro ao chamar paciente na TV"
    });
  }
});

// =====================================================
// CONSULTAR CHAMADA DA TV
// =====================================================

app.get("/tv/chamada", (req, res) => {
  try {
    const db = readDB();

    res.json({
      chamada: db.tv_chamada,
      historico: db.tv_historico
    });
  } catch (erro) {
    console.error("Erro ao consultar chamada:", erro);

    res.status(500).json({
      erro: "Erro ao consultar chamada"
    });
  }
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
  try {
    const db = readDB();

    const consulta = {
      id: Date.now(),

      paciente: req.body.paciente || "",
      diagnostico: req.body.diagnostico || "",
      medicacao: req.body.medicacao || "",
      obs: req.body.obs || "",

      createdAt: new Date().toISOString()
    };

    db.consultas.push(consulta);

    writeDB(db);

    res.status(201).json(consulta);
  } catch (erro) {
    console.error("Erro ao salvar consulta:", erro);

    res.status(500).json({
      erro: "Erro ao salvar consulta"
    });
  }
});

// =====================================================
// MEDICAÇÕES / CONSULTAS
// =====================================================

app.get("/medicacoes", (req, res) => {
  try {
    const db = readDB();

    res.json(db.consultas);
  } catch (erro) {
    console.error("Erro ao buscar consultas:", erro);

    res.status(500).json({
      erro: "Erro ao buscar consultas"
    });
  }
});

// =====================================================
// START
// =====================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    "Hospital Pro rodando na porta " + PORT
  );
});
