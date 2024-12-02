import express from "express";
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import crypto from 'crypto';  // Importando crypto para hashing de senha

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const supabaseUrl = 'https://wqusqihaukuguamdfgvl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxdXNxaWhhdWt1Z3VhbWRmZ3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5ODQ3OTEsImV4cCI6MjA0ODU2MDc5MX0.5v8QUmoanjsUxNAN2jlCzw85z_1FEUVoxK02bfqCGQ4';
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para hash da senha
function hash_password(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Funções para interagir com o banco de dados (CRUD)

// Livros
async function criarLivro(nome, autor, descricao, quantidade, preco) {
    const { data, error } = await supabase
        .from('livros')
        .insert([{ nome, autor, descricao, quantidade, preco }]);
    if (error) console.error('Erro ao criar livro:', error);
}

async function lerLivros() {
    const { data, error } = await supabase.from('livros').select('*');
    if (error) console.error('Erro ao ler livros:', error);
    return data;
}

async function editarLivro(id, nome, autor, descricao, quantidade, preco) {
    const { data, error } = await supabase
        .from('livros')
        .update({ nome, autor, descricao, quantidade, preco })
        .match({ id });
    if (error) console.error('Erro ao editar livro:', error);
}

async function deletarLivro(id) {
    const { data, error } = await supabase
        .from('livros')
        .delete()
        .match({ id });
    if (error) console.error('Erro ao deletar livro:', error);
}

// Livros
app.get('/livros', async (req, res) => {
    const livros = await lerLivros();
    res.render('livros', { livros });
});

app.post('/livros/criar', async (req, res) => {
    const { nome, autor, descricao, quantidade, preco } = req.body;
    await criarLivro(nome, autor, descricao, quantidade, preco);
    res.redirect('/livros');
});

app.get('/livros/editar/:id', async (req, res) => {
    const livroId = parseInt(req.params.id);
    console.log("ID do livro a ser editado:", livroId);

    const { data, error } = await supabase
        .from('livros')
        .select('*')
        .eq('id', livroId)
        .single();

    if (error) {
        console.error("Erro ao buscar livro:", error.message);
        return res.status(404).send("Livro não encontrado");
    }

    if (!data) {
        return res.status(404).send("Livro não encontrado");
    }

    console.log("Livro encontrado:", data);
    res.render('editarLivro', { livro: data });
});

app.post('/livros/editar/:id', async (req, res) => {
    const { nome, autor, descricao, quantidade, preco } = req.body;
    await editarLivro(req.params.id, nome, autor, descricao, quantidade, preco);
    res.redirect('/livros');
});

app.get('/livros/deletar/:id', async (req, res) => {
    await deletarLivro(req.params.id);
    res.redirect('/livros');
});

// Clientes
async function criarCliente(nome, email, senha, cep, cpf) {
    const senhaHash = hash_password(senha);  // Aplica o hash na senha

    const { data, error } = await supabase
        .from('clientes')
        .insert([{ nome, email, senha: senhaHash, cep, cpf }]);

    if (error) console.error('Erro ao criar cliente:', error);
}

async function lerClientes() {
    const { data, error } = await supabase.from('clientes').select('*');
    if (error) {
        console.error('Erro ao ler clientes:', error);
        return [];
    }
    return data || [];
}

async function editarCliente(id, nome, email, senha, cep, cpf) {
    let senhaHash = undefined;
    if (senha) {
        senhaHash = hash_password(senha);  // Aplica o hash na senha se fornecida
    }

    const { data, error } = await supabase
        .from('clientes')
        .update({ nome, email, senha: senhaHash || null, cep, cpf })
        .match({ id });

    if (error) console.error('Erro ao editar cliente:', error);
}

async function deletarCliente(id) {
    const { data, error } = await supabase
        .from('clientes')
        .delete()
        .match({ id });

    if (error) console.error('Erro ao deletar cliente:', error);
}

// Clientes
app.get('/clientes', async (req, res) => {
    const clientes = await lerClientes();
    res.render('clientes', { clientes });
});

app.post('/clientes/criar', async (req, res) => {
    const { nome, email, senha, cep, cpf } = req.body;
    await criarCliente(nome, email, senha, cep, cpf);
    res.redirect('/clientes');
});

app.get('/clientes/editar/:id', async (req, res) => {
    const clienteId = parseInt(req.params.id);
    console.log("ID do cliente a editar:", clienteId);

    const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

    if (error) {
        console.error("Erro ao buscar cliente:", error.message);
        return res.status(404).send("Cliente não encontrado");
    }

    console.log("Cliente encontrado:", data);
    res.render('editarCliente', { cliente: data });
});

app.post('/clientes/editar/:id', async (req, res) => {
    const { nome, email, senha, cep, cpf } = req.body;
    await editarCliente(req.params.id, nome, email, senha, cep, cpf);
    res.redirect('/clientes');
});

app.get('/clientes/deletar/:id', async (req, res) => {
    await deletarCliente(req.params.id);
    res.redirect('/clientes');
});

// Funcionários
async function criarFuncionario(nome, email, senha) {
    const senhaHash = hash_password(senha);  // Aplica o hash na senha

    const { data, error } = await supabase
        .from('funcionarios')
        .insert([{ nome, email, senha: senhaHash }]);

    if (error) console.error('Erro ao criar funcionário:', error);
}

async function editarFuncionario(id, nome, email, senha) {
    let senhaHash = undefined;
    if (senha) {
        senhaHash = hash_password(senha);  // Aplica o hash na senha se fornecida
    }

    const { data, error } = await supabase
        .from('funcionarios')
        .update({ nome, email, senha: senhaHash || null })
        .match({ id });

    if (error) {
        console.error('Erro ao editar funcionário:', error);
    }
}

async function deletarFuncionario(id) {
    const { data, error } = await supabase
        .from('funcionarios')
        .delete()
        .match({ id });

    if (error) {
        console.error('Erro ao deletar funcionário:', error);
    }
}
async function lerFuncionarios() {
    const { data, error } = await supabase.from('funcionarios').select('*');
    if (error) console.error('Erro ao ler funcionários:', error);
    return data;
}

// Funcionários
app.get('/funcionarios', async (req, res) => {
    const funcionarios = await lerFuncionarios();
    res.render('funcionarios', { funcionarios });
});

app.post('/funcionarios/criar', async (req, res) => {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).send("Nome, email e senha são obrigatórios!");
    }

    await criarFuncionario(nome, email, senha);
    res.redirect('/funcionarios');
});

app.get('/funcionarios/editar/:id', async (req, res) => {
    const funcionarioId = parseInt(req.params.id);
    console.log("ID do funcionário a ser editado:", funcionarioId);

    const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('id', funcionarioId)
        .single();

    if (error) {
        console.error("Erro ao buscar funcionário:", error.message);
        return res.status(404).send("Funcionário não encontrado");
    }

    console.log("Funcionário encontrado:", data);
    res.render('editarFuncionario', { funcionario: data });
});

app.post('/funcionarios/editar/:id', async (req, res) => {
    const { nome, email, senha } = req.body;
    await editarFuncionario(req.params.id, nome, email, senha);
    res.redirect('/funcionarios');
});

app.get('/funcionarios/deletar/:id', async (req, res) => {
    await deletarFuncionario(req.params.id);
    res.redirect('/funcionarios');
});

// Vendas
async function criarVenda(cliente_id, funcionario_id, data_venda, valor_total) {
    // Certifique-se de que a data está no formato correto (YYYY-MM-DD)
    const dataFormatada = new Date(data_venda); // Converte para objeto Date
    if (isNaN(dataFormatada)) {
        console.error('Data inválida:', data_venda);
        return;
    }

    const { data, error } = await supabase
        .from('vendas')
        .insert([{ cliente_id, funcionario_id, data_venda, valor_total }]);
    if (error) {
        console.error('Erro ao criar venda:', error);
    } else {
        console.log('Venda criada com sucesso:', data);
    }
}



async function lerVendas() {
    const { data, error } = await supabase.from('vendas').select('*');
    if (error) {
        console.error('Erro ao ler vendas:', error);
        return [];
    }
    return data;
}



async function editarVenda(id, id_livro, qtd, preco, data_venda) {
    if (!qtd || !preco || isNaN(qtd) || isNaN(preco)) {
        console.error('Quantidade e preço são obrigatórios e devem ser números válidos');
        return;
    }

    const { data, error } = await supabase
        .from('vendas')
        .update({ id_livro, qtd, preco, data_venda })
        .match({ id });

    if (error) {
        console.error('Erro ao editar venda:', error);
    } else {
        console.log('Venda atualizada com sucesso:', data);
    }
}


async function deletarVenda(id) {
    const { data, error } = await supabase
        .from('vendas')
        .delete()
        .match({ id });
    if (error) console.error('Erro ao deletar venda:', error);
}

app.get('/vendas', async (req, res) => {
    const { data, error } = await supabase.from('vendas').select('*');
    if (error) {
        console.error('Erro ao carregar vendas:', error);
        return res.status(500).send('Erro ao carregar vendas');
    }
    res.render('vendas', { vendas: data });  // Passando as vendas para a view
});



app.post('/vendas/criar', async (req, res) => {
    const { livro_id, quantidade, preco, data_venda } = req.body;

    // Verifique se o campo de data está presente e é válido
    if (!data_venda) {
        return res.status(400).send('Data da venda é obrigatória');
    }

    // Processar a venda com os dados recebidos
    const { data, error } = await supabase
        .from('vendas')
        .insert([{ id_livro: livro_id, qtd: quantidade, preco: preco, data_venda: data_venda }]);

    if (error) {
        console.error('Erro ao criar venda:', error);
        return res.status(500).send('Erro ao criar venda');
    }

    res.redirect('/vendas');
});

app.post('/vendas/editar/:id', async (req, res) => {
    const { livro_id, quantidade, preco, data_venda } = req.body;
    
    // Verificar se quantidade e preco são números válidos
    if (isNaN(quantidade) || quantidade <= 0) {
        return res.status(400).send('Quantidade inválida.');
    }
    if (isNaN(preco) || preco <= 0) {
        return res.status(400).send('Preço inválido.');
    }

    // Atualizar a venda
    await editarVenda(parseInt(req.params.id), livro_id, quantidade, preco, data_venda);
    res.redirect('/vendas');
});



// Rota para exibir o formulário de edição de venda
app.get('/vendas/editar/:id', async (req, res) => {
    // Obtemos a venda pelo ID
    const venda = await supabase.from('vendas').select('*').eq('id', req.params.id).single();
    
    // Se não encontrar a venda, retornar erro ou redirecionar
    if (!venda.data) {
        return res.status(404).send('Venda não encontrada');
    }

    // Renderiza o formulário de edição passando os dados da venda
    res.render('editarVenda', { venda: venda.data });
});



app.get('/vendas/deletar/:id', async (req, res) => {
    await deletarVenda(req.params.id);
    res.redirect('/vendas');
});

// // Registros
// async function criarRegistro(data, id_usuario, id_funcionario) {
//     const { data: registroData, error } = await supabase
//         .from('registros')
//         .insert([{ data, id_usuario, id_funcionario }]);
//     if (error) console.error('Erro ao criar registro:', error);
// }

// async function lerRegistros() {
//     const { data, error } = await supabase.from('registros').select('*');
//     if (error) console.error('Erro ao ler registros:', error);
//     return data;
// }

// async function editarRegistro(id, data, id_usuario, id_funcionario) {
//     const { data: registroData, error } = await supabase
//         .from('registros')
//         .update({ data, id_usuario, id_funcionario })
//         .match({ id });
//     if (error) console.error('Erro ao editar registro:', error);
// }

// async function deletarRegistro(id) {
//     const { data, error } = await supabase
//         .from('registros')
//         .delete()
//         .match({ id });
//     if (error) console.error('Erro ao deletar registro:', error);
// }


// // Registros
// app.get('/registros', async (req, res) => {
//     const registros = await lerRegistros();
//     res.render('registros', { registros });
// });

// app.post('/registros/criar', async (req, res) => {
//     const { venda_id, livro_id, quantidade, valor_total } = req.body;
//     await criarRegistro(venda_id, livro_id, quantidade, valor_total);
//     res.redirect('/registros');
// });

// app.get('/registros/editar/:id', async (req, res) => {
//     const registro = await supabase.from('Registros').select('*').eq('id', parseInt(req.params.id)).single();
//     res.render('editarRegistro', { registro: registro.data });
// });

// app.post('/registros/editar/:id', async (req, res) => {
//     const { venda_id, livro_id, quantidade, valor_total } = req.body;
//     await editarRegistro(parseInt(req.params.id), venda_id, livro_id, quantidade, valor_total);
//     res.redirect('/registros');
// });

// app.get('/registros/deletar/:id', async (req, res) => {
//     await deletarRegistro(req.params.id);
//     res.redirect('/registros');
// });

// Função para criar uma nova mensagem
async function criarMensagem(usuario_id, conteudo) {
    const { data, error } = await supabase
        .from('messages')
        .insert([{ usuario_id, conteudo }]);
    if (error) console.error('Erro ao criar mensagem:', error);
    return data;
}

// Função para ler todas as mensagens
// Função para ler todas as mensagens
// Função para ler todas as mensagens
async function lerMensagens() {
    const { data, error } = await supabase
        .from('messages') // nome correto da tabela
        .select('*')
        .order('created_at', { ascending: true }); // Substituir 'data' por 'created_at'
    
    if (error) {
        console.error('Erro ao ler mensagens:', error);
        return []; // Retorna um array vazio caso haja erro
    }

    return data || []; // Retorna um array vazio caso não haja mensagens
}

// Função para buscar uma mensagem pelo ID
async function lerMensagemPorId(id) {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('id', id) // Verifique se o campo está correto
        .single(); // 'single' garante que apenas um item será retornado

    if (error) {
        console.error('Erro ao buscar mensagem:', error);
        return null; // Retorna null em caso de erro
    }

    return data; // Retorna os dados da mensagem encontrada
}


// Função para editar uma mensagem existente
async function editarMensagem(id, sender_name, message) {
    const { data, error } = await supabase
        .from('messages')
        .update({ sender_name, message })
        .eq('id', id);  // O critério de busca é o ID

    if (error) {
        console.error('Erro ao editar mensagem:', error);
        return false;
    }

    return true;  // Retorna verdadeiro caso a edição tenha sido bem-sucedida
}


// Função para deletar uma mensagem
async function deletarMensagem(id) {
    const { data, error } = await supabase
        .from('messages')
        .delete()
        .match({ id });
    if (error) console.error('Erro ao deletar mensagem:', error);
    return data;
}

app.get('/mensagens', async (req, res) => {
    const mensagens = await lerMensagens();
    console.log(mensagens); // Verifique o conteúdo da variável mensagens
    res.render('mensagens', { mensagens });
});



app.post('/mensagens/criar', async (req, res) => {
    const { usuario_id, conteudo } = req.body;
    if (!usuario_id || !conteudo) {
        return res.status(400).send('Usuário e conteúdo são obrigatórios!');
    }

    await criarMensagem(usuario_id, conteudo);
    res.redirect('/mensagens');
});

app.get('/mensagens/editar/:id', async (req, res) => {
    const mensagemId = parseInt(req.params.id);  // Pega o ID da URL

    // Verifica se o ID da mensagem é válido
    if (isNaN(mensagemId)) {
        return res.status(400).send("ID inválido.");
    }

    // Tenta buscar a mensagem com o ID fornecido
    const mensagem = await lerMensagemPorId(mensagemId);

    if (!mensagem) {
        return res.status(404).send("Mensagem não encontrada.");
    }

    // Renderiza a página de edição passando a mensagem encontrada
    res.render('editarMensagem', { mensagem });
});


app.post('/mensagens/editar/:id', async (req, res) => {
    const mensagemId = parseInt(req.params.id);  // Captura o ID da URL
    const { sender_name, message } = req.body;  // Captura os dados do formulário

    // Verifica se o ID e os dados são válidos
    if (!sender_name || !message) {
        return res.status(400).send("Nome do remetente e mensagem são obrigatórios!");
    }

    // Tenta editar a mensagem no banco de dados
    const sucesso = await editarMensagem(mensagemId, sender_name, message);

    if (!sucesso) {
        return res.status(500).send("Erro ao salvar a edição da mensagem.");
    }

    // Se a edição for bem-sucedida, redireciona para a página de mensagens
    res.redirect('/mensagens');
});

app.get('/mensagens/deletar/:id', async (req, res) => {
    await deletarMensagem(req.params.id);
    res.redirect('/mensagens');
});

// Iniciar o servidor
app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000...");
});
