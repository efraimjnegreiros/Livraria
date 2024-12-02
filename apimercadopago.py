# apimercadopago.py
import mercadopago

def gerar_link_pagamento(dados, user_nome):
    sdk = mercadopago.SDK("APP_USR-1039031589021141-083016-42e7088c9468867a9864f5b93b03892a-1968082587")
    
    # Gerando os dados para o pagamento
    payment_data = {
        "items": [
            {
                "id": str(dados["id"]),  # ID do produto
                "title": str(dados["nome"]),  # Nome do produto
                "quantity": dados["quantidade"],  # Quantidade
                "currency_id": "BRL",
                "unit_price": dados["preco"],  # Preço unitário
            }
        ],
        "back_urls": {
            "success": f"http://127.0.0.1:5001/compracerta/{str(dados['id'])}",
            "failure": "http://127.0.0.1:5001/compraerrada",
            "pending": "http://127.0.0.1:5001/compraerrada",
        },
        "auto_return": "all",
        "payer": {
            "name": user_nome  # Nome do cliente
        }
    }

    # Criando a preferência de pagamento
    result = sdk.preference().create(payment_data)
    payment = result["response"]
    
    link_iniciar_pagamento = payment["init_point"]
    return link_iniciar_pagamento
