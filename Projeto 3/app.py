from flask import Flask, render_template, request, redirect, url_for, session, flash
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_session import Session
from supabase import create_client, Client
import hashlib

# Configuração do Flask
app = Flask(__name__)
app.secret_key = "sua_chave_secreta"
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

# Configuração do Supabase
SUPABASE_URL = "https://wqusqihaukuguamdfgvl.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxdXNxaWhhdWt1Z3VhbWRmZ3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5ODQ3OTEsImV4cCI6MjA0ODU2MDc5MX0.5v8QUmoanjsUxNAN2jlCzw85z_1FEUVoxK02bfqCGQ4"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Configuração do Socket.IO com CORS permitido
socketio = SocketIO(app, cors_allowed_origins="*")

# Função para hash de senha
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# Função para recuperar mensagens entre cliente e funcionário
def get_messages():
    # Recupera mensagens simples sem precisar de sender_id ou receiver_id
    messages = supabase.table("messages").select("*").execute()
    return messages.data


# Rota de login
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]
        hashed_password = hash_password(password)

        # Verificar credenciais na tabela de Clientes
        user_cliente = supabase.table("clientes").select("*").eq("email", email).eq("senha", hashed_password).execute()
        print("Resultado do Cliente:", user_cliente)  # Adicionando print para depuração

        # Verificar credenciais na tabela de Funcionarios (vendedor)
        user_funcionario = supabase.table("funcionarios").select("*").eq("email", email).eq("senha", hashed_password).execute()
        print("Resultado do Funcionário:", user_funcionario)  # Adicionando print para depuração

        if user_cliente.data:
            # Se for cliente, registramos na sessão
            session["user"] = email  # Sessão do cliente
            flash("Login realizado com sucesso!")
            print("Cliente logado")
            return redirect(url_for("dashboard"))

        elif user_funcionario.data:
            # Se for funcionário (vendedor), registramos na sessão
            session["user"] = email  # Sessão do funcionário
            flash("Login realizado com sucesso!")
            print("Funcionario logado")
            return redirect(url_for("dashboard"))

        else:
            # Se o e-mail ou senha não estiverem corretos
            flash("E-mail ou senha incorretos!")
            print("Falha no login")
            return redirect(url_for("login"))

    return render_template("login.html")


# Rota protegida (dashboard)
@app.route("/dashboard")
def dashboard():
    if "user" not in session:
        flash("Faça login para acessar esta página!")
        return redirect(url_for("login"))
    
    # Recupera o email do usuário logado
    user_email = session["user"]
    
    # Simplesmente obter as mensagens
    messages = get_messages()
    
    return render_template("dashboard.html", messages=messages)


# Rota de logout
@app.route("/logout")
def logout():
    session.pop("user", None)
    flash("Você saiu da sua conta!")
    return redirect(url_for("login"))


# Rota do chat (manuseio de eventos do Socket.IO)
@socketio.on("connect")
def handle_connect():
    if "user" in session:
        join_room(session["user"])
        emit("message", {"user": "System", "message": f"{session['user']} entrou no chat."}, room=session["user"])


@socketio.on("disconnect")
def handle_disconnect():
    if "user" in session:
        emit("message", {"user": "System", "message": f"{session['user']} saiu do chat."}, room=session["user"])
        leave_room(session["user"])


@socketio.on("send_message")
def handle_send_message(data):
    message = data["message"]
    sender_name = session["user"]  # O nome do remetente é o e-mail da sessão

    # Armazenar a mensagem no banco de dados com o nome do remetente e a mensagem
    supabase.table("messages").insert({
        "sender_name": sender_name,  # Armazenamos apenas o nome do remetente
        "message": message
    }).execute()

    # Emitir a mensagem para todos os usuários
    emit("message", {"user": sender_name, "message": message}, broadcast=True)


# Iniciar o SocketIO
if __name__ == "__main__":
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
