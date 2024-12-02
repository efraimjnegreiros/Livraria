from flask import Flask, render_template, request, redirect, url_for, session, flash
from flask_socketio import SocketIO, join_room
from flask_session import Session
from supabase import create_client, Client
import hashlib
from datetime import date

# Configuração do Flask
app = Flask(__name__)
app.secret_key = "sua_chave_secreta"
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

SUPABASE_URL = "https://wqusqihaukuguamdfgvl.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxdXNxaWhhdWt1Z3VhbWRmZ3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5ODQ3OTEsImV4cCI6MjA0ODU2MDc5MX0.5v8QUmoanjsUxNAN2jlCzw85z_1FEUVoxK02bfqCGQ4"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Configuração do Socket.IO
socketio = SocketIO(app, cors_allowed_origins="*")

# Função para hash de senha
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# Rota de registro (Cadastro de Clientes)
@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        nome = request.form["nome"]
        email = request.form["email"]
        password = request.form["password"]
        hashed_password = hash_password(password)

        # Verificar se o usuário já existe
        existing_user = supabase.table("clientes").select("*").eq("email", email).execute()
        if existing_user.data:
            flash("E-mail já cadastrado!")
            return redirect(url_for("register"))

        # Inserir usuário no banco
        supabase.table("clientes").insert({
            "nome": nome,
            "email": email,
            "senha": hashed_password
        }).execute()

        flash("Cadastro realizado com sucesso!")
        return redirect(url_for("login"))

    return render_template("register.html")

# Rota de login
from datetime import date

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]
        hashed_password = hash_password(password)

        # Verificar credenciais na tabela de Clientes
        user_cliente = supabase.table("clientes").select("*").eq("email", email).eq("senha", hashed_password).execute()

        # Verificar credenciais na tabela de Funcionarios (vendedor)
        user_funcionario = supabase.table("funcionarios").select("*").eq("email", email).eq("senha", hashed_password).execute()

        if user_cliente.data:
            # Se for cliente, registramos na sessão
            session["user"] = email  # Sessão do cliente

            # Registrar login na tabela de registros
            cliente_id = user_cliente.data[0]["id"]
            today = date.today().strftime("%Y-%m-%d")  # Converte a data para string no formato YYYY-MM-DD

            # insert_response = supabase.table("Registros").insert({
            #     "data": today,
            #     "id_usuario": cliente_id,
            #     "id_funcionario": None
            # }).execute()

            # # Verifique se a inserção foi bem-sucedida e capture o erro, se houver
            # if insert_response.status_code != 201:
            #     print(f"Erro ao inserir no banco: {insert_response.json()}")
            #     flash(f"Erro ao registrar login: {insert_response.json()}")
            #     return redirect(url_for("login"))

            flash("Login realizado com sucesso!")
            return redirect("store")

        elif user_funcionario.data:
            # Se for funcionário (vendedor), registramos na sessão
            session["user"] = email  # Sessão do funcionário

            # Registrar login na tabela de registros
            funcionario_id = user_funcionario.data[0]["id"]
            today = date.today().strftime("%Y-%m-%d")  # Converte a data para string no formato YYYY-MM-DD

            # insert_response = supabase.table("Registros").insert({
            #     "data": today,
            #     "id_usuario": None,
            #     "id_funcionario": funcionario_id
            # }).execute()

            # # Verifique se a inserção foi bem-sucedida e capture o erro, se houver
            # if insert_response.status_code != 201:
            #     print(f"Erro ao inserir no banco: {insert_response.json()}")
            #     flash(f"Erro ao registrar login: {insert_response.json()}")
            #     return redirect(url_for("login"))

            flash("Login realizado com sucesso!")
            return redirect("funcionario")

        else:
            flash("E-mail ou senha incorretos!")
            return redirect(url_for("login"))

    return render_template("login.html")


# Rota de logout
@app.route("/logout")
def logout():
    session.pop("user", None)
    flash("Você saiu da sua conta!")
    return redirect(url_for("login"))

@app.route("/funcionario")
def funcionario():
    if "user" not in session:
        flash("Faça login para acessar a loja!")
        return redirect(url_for("login"))
    return redirect('127.0.0.1:5000/login')

# Exibir livros
@app.route("/store")
def store():
    if "user" not in session:
        flash("Faça login para acessar a loja!")
        return redirect(url_for("login"))

    # Buscar todos os livros
    livros = supabase.table("livros").select("*").execute()
    return render_template("store.html", livros=livros.data)

# Adicionar ao carrinho
@app.route("/add_to_cart/<int:livro_id>", methods=["POST"])
def add_to_cart(livro_id):
    if "user" not in session:
        flash("Faça login para adicionar itens ao carrinho!")
        return redirect(url_for("login"))

    # Obter informações do livro
    livro = supabase.table("livros").select("*").eq("id", livro_id).execute().data[0]
    qtd = int(request.form["quantidade"])

    # Adicionar livro ao carrinho na sessão
    if "cart" not in session:
        session["cart"] = []

    cart_item = {
        "id": livro["id"],
        "nome": livro["nome"],
        "preco": livro["preco"],
        "quantidade": qtd,
        "total": livro["preco"] * qtd
    }

    session["cart"].append(cart_item)
    flash(f"{livro['nome']} adicionado ao carrinho!")
    return redirect(url_for("store"))

# Exibir o carrinho
@app.route("/cart")
def cart():
    if "user" not in session:
        flash("Faça login para visualizar seu carrinho!")
        return redirect(url_for("login"))

    cart_items = session.get("cart", [])
    total = sum(item["total"] for item in cart_items)
    return render_template("cart.html", cart_items=cart_items, total=total)

# Finalizar a compra
@app.route("/checkout", methods=["POST"])
def checkout():
    if "user" not in session:
        flash("Faça login para finalizar a compra!")
        return redirect(url_for("login"))

    # Processar pagamento (Simulação)
    session.pop("cart", None)
    flash("Compra realizada com sucesso!")
    return redirect(url_for("store"))

# Iniciar o SocketIO
@socketio.on("connect")
def handle_connect():
    if "user" in session:
        join_room(session["user"])

if __name__ == "__main__":
    socketio.run(app, host='0.0.0.0', port=5001, debug=True)
