"""Rotas da API NEXO (Blueprint Flask montado em /api).

Espelha o contrato do back-end Express original — mesmo caminho, mesmos
códigos de status e mesmos corpos de resposta, para que o front-end
React continue funcionando sem nenhuma alteração.

Correções aplicadas em relação à versão anterior:
1. Responder chamado (cliente): valida que o chamado pertence ao usuário
   logado (antes qualquer cliente autenticado podia responder chamados
   alheios conhecendo o id).
2. Resposta de chamado ao cliente: remove a classificação interna de
   prioridade (antes vazava "prioridade" para o cliente nesta rota).
3. /config/public: considera SMTP completo apenas com HOST, PORT, USER
   e PASS (antes ignorava PORT e PASS).
"""
import os
import re
from functools import wraps

from flask import g, jsonify, request

from .crypto import generate_session_token, generate_verification_code, verify_password
from .db import SEVEN_DAYS_MS, db, now_ms
from .email_service import send_password_reset_code
from .gemini import analyze_business_with_ai

# "WHATSAPP_SUPORTE = 'INSERIR_NUMERO_OFICIAL_AQUI'
#  Não inventar um número de telefone. O número deverá ser configurado posteriormente."
WHATSAPP_SUPORTE = os.environ.get('WHATSAPP_SUPORTE') or 'INSERIR_NUMERO_OFICIAL_AQUI'

# Sessões em memória: token -> { userId, createdAt }
active_sessions: dict[str, dict] = {}

EMAIL_REGEX = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')


# ------------------------------------------------------------------ autenticação
def _extract_token() -> str | None:
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    return auth_header[7:].strip()


def get_authenticated_user():
    token = _extract_token()
    if not token:
        return None
    session = active_sessions.get(token)
    if not session:
        return None

    # Expiração da sessão: 7 dias
    if now_ms() - session['createdAt'] > SEVEN_DAYS_MS:
        active_sessions.pop(token, None)
        return None

    user = db.find_user_by_id(session['userId'])
    if not user or user.get('status') == 'suspended':
        return None
    return user


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = get_authenticated_user()
        if not user:
            return jsonify(error='Sessão expirada ou não autenticada. Por favor, faça login novamente.'), 401
        g.user = user
        return fn(*args, **kwargs)
    return wrapper


def require_admin(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = get_authenticated_user()
        if not user or user.get('role') != 'admin':
            return jsonify(error='Acesso restrito. Esta área requer privilégios administrativos autorizados.'), 403
        g.user = user
        return fn(*args, **kwargs)
    return wrapper


def _body() -> dict:
    return request.get_json(silent=True) or {}


def _public_user(user: dict) -> dict:
    return {
        'id': user.get('id'),
        'name': user.get('name'),
        'email': user.get('email'),
        'role': user.get('role'),
        'clientType': user.get('clientType'),
    }


# ------------------------------------------------------------- 1. CONFIG PÚBLICA
def register_public_config(bp):
    @bp.get('/config/public')
    def config_public():
        return jsonify(
            slogan='Conectando ideias, negócios e oportunidades.',
            whatsappSuporte=WHATSAPP_SUPORTE,
            smtpConfigured=all(
                os.environ.get(var) for var in ('SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS')
            ),
        )


# --------------------------------------------------------- 2. AUTH & SESSÕES
def register_auth(bp):
    @bp.post('/auth/register')
    def auth_register():
        data = _body()
        name, email, password = data.get('name'), data.get('email'), data.get('password')

        if not name or not email or not password:
            return jsonify(error='Nome, e-mail e senha são obrigatórios.'), 400
        if len(password) < 6:
            return jsonify(error='A senha deve conter no mínimo 6 caracteres.'), 400
        if not EMAIL_REGEX.match(email):
            return jsonify(error='Formato de e-mail inválido.'), 400

        if db.find_user_by_email(email):
            return jsonify(
                error='Este endereço de e-mail já possui uma conta no NEXO. Por favor, utilize a tela de login.',
                alreadyRegistered=True,
            ), 409

        # Segurança: ninguém pode se auto-registrar como admin
        role = 'client' if data.get('role') == 'admin' else 'client'
        client_type = data.get('clientType') if data.get('clientType') in ('jovem', 'business') else None

        try:
            new_user = db.create_user(
                name=name, email=email, password=password, role=role, client_type=client_type
            )
        except ValueError as err:
            return jsonify(error=str(err)), 409

        token = generate_session_token()
        active_sessions[token] = {'userId': new_user['id'], 'createdAt': now_ms()}

        return jsonify(
            message='Cadastro realizado com sucesso!',
            token=token,
            user=_public_user(new_user),
        ), 201

    @bp.post('/auth/login')
    def auth_login():
        data = _body()
        email, password = data.get('email'), data.get('password')
        if not email or not password:
            return jsonify(error='E-mail e senha são obrigatórios.'), 400

        user = db.find_user_by_email(email)
        if not user:
            return jsonify(error='Credenciais incorretas. Verifique seu e-mail e senha.'), 401

        locked_until = user.get('lockedUntil') or 0
        if locked_until > now_ms():
            wait_minutes = -(-(locked_until - now_ms()) // 60000)
            return jsonify(
                error=f'Conta temporariamente bloqueada por excesso de tentativas incorretas. '
                      f'Aguarde {wait_minutes} minuto(s) para tentar novamente.'
            ), 403

        if user.get('status') == 'suspended':
            return jsonify(
                error='Sua conta foi suspensa pela administração da plataforma. '
                      'Entre em contato com o suporte para mais esclarecimentos.'
            ), 403

        if not verify_password(password, user.get('passwordHash', '')):
            db.record_failed_login(email)
            return jsonify(error='Credenciais incorretas. Verifique seu e-mail e senha.'), 401

        db.update_user_login_success(user['id'])
        token = generate_session_token()
        active_sessions[token] = {'userId': user['id'], 'createdAt': now_ms()}

        db.log_audit({
            'userId': user['id'],
            'userEmail': user['email'],
            'action': 'LOGIN_SUCESSO',
            'resource': 'AUTH',
            'details': f'Login efetuado com sucesso via {user["role"]}.',
            'ip': request.remote_addr,
        })

        return jsonify(message='Login realizado com sucesso.', token=token, user=_public_user(user))

    @bp.get('/auth/me')
    def auth_me():
        user = get_authenticated_user()
        if not user:
            return jsonify(error='Não autenticado.'), 401

        company = db.get_company_by_user_id(user['id']) if user.get('clientType') == 'business' else None
        projects = db.get_projects_by_user_id(user['id']) if user.get('clientType') == 'jovem' else []

        return jsonify(user=_public_user(user), company=company, projects=projects)

    @bp.post('/auth/select-type')
    @require_auth
    def auth_select_type():
        client_type = _body().get('clientType')
        if client_type not in ('jovem', 'business'):
            return jsonify(error='Tipo inválido. Escolha entre "jovem" ou "business".'), 400

        db.update_user_client_type(g.user['id'], client_type)
        return jsonify(
            message=f'Ambiente {"NEXO JOVEM" if client_type == "jovem" else "NEXO BUSINESS"} selecionado com sucesso.',
            clientType=client_type,
        )

    @bp.post('/auth/logout')
    def auth_logout():
        token = _extract_token()
        if token:
            active_sessions.pop(token, None)
        return jsonify(message='Sessão encerrada com sucesso.')


# ------------------------------------------- 3. RECUPERAÇÃO DE SENHA (2 ETAPAS)
def register_password_recovery(bp):
    @bp.post('/auth/forgot-password')
    def auth_forgot_password():
        email = _body().get('email')
        if not email:
            return jsonify(error='Informe o e-mail cadastrado.'), 400

        clean_email = str(email).strip().lower()
        user = db.find_user_by_email(clean_email)

        # Regra: mensagens que não revelam se o e-mail está ou não cadastrado
        send_result = {'success': False, 'configured': False}
        if user:
            raw_code = generate_verification_code()
            db.create_password_reset(clean_email, raw_code)
            send_result = send_password_reset_code(clean_email, raw_code)

            db.log_audit({
                'userId': user['id'],
                'userEmail': clean_email,
                'action': 'SOLICITACAO_RECUPERACAO_SENHA',
                'resource': 'AUTH',
                'details': f'Código de recuperação gerado para {clean_email}. SMTP configurado: {send_result.get("configured")}',
                'ip': request.remote_addr,
            })

        return jsonify(
            message='Se o e-mail informado estiver registrado em nossa plataforma, as instruções e o código de recuperação foram encaminhados.',
            emailConfigured=send_result.get('configured', False),
            adminNotice=send_result.get('adminNotice'),
            devCode=send_result.get('devCode'),
        )

    @bp.post('/auth/reset-password')
    def auth_reset_password():
        data = _body()
        email, code, new_password = data.get('email'), data.get('code'), data.get('newPassword')

        if not email or not code or not new_password:
            return jsonify(error='E-mail, código de verificação e nova senha são obrigatórios.'), 400
        if len(new_password) < 6:
            return jsonify(error='A nova senha deve ter no mínimo 6 caracteres.'), 400

        try:
            db.verify_and_reset_password(email, str(code).strip(), new_password)
        except ValueError as err:
            return jsonify(error=str(err)), 400

        return jsonify(message='Senha alterada com sucesso! Você já pode realizar o login com suas novas credenciais.')


# ------------------------------------------------ 4. NEXO BUSINESS (GESTÃO)
def register_business(bp):
    @bp.get('/business/company')
    @require_auth
    def business_get_company():
        return jsonify(company=db.get_company_by_user_id(g.user['id']))

    @bp.post('/business/company')
    @require_auth
    def business_save_company():
        try:
            company = db.save_company(g.user['id'], _body())
            return jsonify(message='Dados empresariais atualizados com sucesso.', company=company)
        except ValueError as err:
            return jsonify(error=str(err)), 500

    # ---- produtos & estoque
    @bp.get('/business/products')
    @require_auth
    def business_get_products():
        company = db.get_company_by_user_id(g.user['id'])
        if not company:
            return jsonify(products=[])
        return jsonify(products=db.get_products(company['id'], g.user['id']))

    @bp.post('/business/products')
    @require_auth
    def business_save_product():
        company = db.get_company_by_user_id(g.user['id'])
        if not company:
            return jsonify(error='Cadastre sua empresa primeiro antes de gerenciar produtos.'), 400
        try:
            product = db.save_product(company['id'], g.user['id'], _body())
            return jsonify(message='Produto salvo com sucesso.', product=product)
        except ValueError as err:
            return jsonify(error=str(err)), 500

    @bp.delete('/business/products/<product_id>')
    @require_auth
    def business_delete_product(product_id):
        company = db.get_company_by_user_id(g.user['id'])
        if not company:
            return jsonify(error='Empresa não encontrada.'), 400
        try:
            success = db.delete_product(product_id, company['id'], g.user['id'])
            return jsonify(success=success, message='Produto excluído com sucesso.')
        except ValueError as err:
            return jsonify(error=str(err)), 500

    # ---- vendas
    @bp.get('/business/sales')
    @require_auth
    def business_get_sales():
        company = db.get_company_by_user_id(g.user['id'])
        if not company:
            return jsonify(sales=[])
        return jsonify(sales=db.get_sales(company['id'], g.user['id']))

    @bp.post('/business/sales')
    @require_auth
    def business_create_sale():
        company = db.get_company_by_user_id(g.user['id'])
        if not company:
            return jsonify(error='Empresa não encontrada.'), 400
        try:
            sale = db.create_sale(company['id'], g.user['id'], _body())
            return jsonify(message='Venda registrada com sucesso e estoque atualizado.', sale=sale), 201
        except ValueError as err:
            return jsonify(error=str(err)), 400

    # ---- despesas
    @bp.get('/business/expenses')
    @require_auth
    def business_get_expenses():
        company = db.get_company_by_user_id(g.user['id'])
        if not company:
            return jsonify(expenses=[])
        return jsonify(expenses=db.get_expenses(company['id'], g.user['id']))

    @bp.post('/business/expenses')
    @require_auth
    def business_save_expense():
        company = db.get_company_by_user_id(g.user['id'])
        if not company:
            return jsonify(error='Empresa não encontrada.'), 400
        try:
            expense = db.save_expense(company['id'], g.user['id'], _body())
            return jsonify(message='Despesa registrada com sucesso.', expense=expense)
        except ValueError as err:
            return jsonify(error=str(err)), 500

    @bp.delete('/business/expenses/<expense_id>')
    @require_auth
    def business_delete_expense(expense_id):
        company = db.get_company_by_user_id(g.user['id'])
        if not company:
            return jsonify(error='Empresa não encontrada.'), 400
        try:
            success = db.delete_expense(expense_id, company['id'], g.user['id'])
            return jsonify(success=success, message='Despesa excluída com sucesso.')
        except ValueError as err:
            return jsonify(error=str(err)), 500

    # ---- clientes (CRM)
    @bp.get('/business/clients')
    @require_auth
    def business_get_clients():
        company = db.get_company_by_user_id(g.user['id'])
        if not company:
            return jsonify(clients=[])
        return jsonify(clients=db.get_clients(company['id'], g.user['id']))

    @bp.post('/business/clients')
    @require_auth
    def business_save_client():
        company = db.get_company_by_user_id(g.user['id'])
        if not company:
            return jsonify(error='Empresa não encontrada.'), 400
        try:
            client = db.save_client(company['id'], g.user['id'], _body())
            return jsonify(message='Cliente cadastrado com sucesso.', client=client)
        except ValueError as err:
            return jsonify(error=str(err)), 500

    @bp.delete('/business/clients/<client_id>')
    @require_auth
    def business_delete_client(client_id):
        company = db.get_company_by_user_id(g.user['id'])
        if not company:
            return jsonify(error='Empresa não encontrada.'), 400
        try:
            success = db.delete_client(client_id, company['id'], g.user['id'])
            return jsonify(success=success, message='Cliente excluído.')
        except ValueError as err:
            return jsonify(error=str(err)), 500

    # ---- metas
    @bp.get('/business/goals')
    @require_auth
    def business_get_goals():
        company = db.get_company_by_user_id(g.user['id'])
        if not company:
            return jsonify(goals=[])
        return jsonify(goals=db.get_goals(company['id'], g.user['id']))

    @bp.post('/business/goals')
    @require_auth
    def business_save_goal():
        company = db.get_company_by_user_id(g.user['id'])
        if not company:
            return jsonify(error='Empresa não encontrada.'), 400
        try:
            goal = db.save_goal(company['id'], g.user['id'], _body())
            return jsonify(message='Meta comercial salva.', goal=goal)
        except ValueError as err:
            return jsonify(error=str(err)), 500

    @bp.delete('/business/goals/<goal_id>')
    @require_auth
    def business_delete_goal(goal_id):
        company = db.get_company_by_user_id(g.user['id'])
        if not company:
            return jsonify(error='Empresa não encontrada.'), 400
        try:
            success = db.delete_goal(goal_id, company['id'], g.user['id'])
            return jsonify(success=success, message='Meta removida.')
        except ValueError as err:
            return jsonify(error=str(err)), 500

    # ---- relatórios financeiros
    @bp.get('/business/reports')
    @require_auth
    def business_reports():
        company = db.get_company_by_user_id(g.user['id'])
        if not company:
            return jsonify(report=None)

        sales = db.get_sales(company['id'], g.user['id'])
        expenses = db.get_expenses(company['id'], g.user['id'])
        products = db.get_products(company['id'], g.user['id'])
        clients = db.get_clients(company['id'], g.user['id'])

        total_vendas = sum(to_float(s.get('valorTotal')) for s in sales)
        total_despesas = sum(to_float(e.get('valor')) for e in expenses)
        total_despesas_pagas = sum(to_float(e.get('valor')) for e in expenses if e.get('status') == 'pago')
        total_despesas_pendentes = sum(to_float(e.get('valor')) for e in expenses if e.get('status') == 'pendente')

        resultado_liquido = total_vendas - total_despesas
        margem_lucro_percentual = (resultado_liquido / total_vendas) * 100 if total_vendas > 0 else 0
        ticket_medio = total_vendas / len(sales) if sales else 0

        product_sales: dict[str, dict] = {}
        for sale in sales:
            for item in sale.get('items', []):
                key = item.get('produtoId')
                if key not in product_sales:
                    product_sales[key] = {
                        'nome': item.get('produtoNome'),
                        'quantidade': 0,
                        'receita': 0.0,
                    }
                product_sales[key]['quantidade'] += to_float(item.get('quantidade'))
                product_sales[key]['receita'] += to_float(item.get('subtotal'))

        produtos_mais_vendidos = sorted(
            product_sales.values(), key=lambda p: p['receita'], reverse=True
        )[:5]

        produtos_baixo_estoque = [
            p for p in products
            if to_float(p.get('estoqueAtual')) <= to_float(p.get('estoqueMinimo'))
        ]

        despesas_por_categoria: dict[str, float] = {}
        for exp in expenses:
            cat = exp.get('categoria', 'Outros')
            despesas_por_categoria[cat] = despesas_por_categoria.get(cat, 0.0) + to_float(exp.get('valor'))

        formas_pagamento: dict[str, float] = {}
        for sale in sales:
            forma = sale.get('formaPagamento', 'outro')
            formas_pagamento[forma] = formas_pagamento.get(forma, 0.0) + to_float(sale.get('valorTotal'))

        return jsonify(report={
            'totalVendas': total_vendas,
            'totalDespesas': total_despesas,
            'totalDespesasPagas': total_despesas_pagas,
            'totalDespesasPendentes': total_despesas_pendentes,
            'resultadoLiquido': resultado_liquido,
            'margemLucroPercentual': margem_lucro_percentual,
            'ticketMedio': ticket_medio,
            'quantidadeVendas': len(sales),
            'quantidadeClientes': len(clients),
            'produtosCadastrados': len(products),
            'produtosMaisVendidos': produtos_mais_vendidos,
            'produtosBaixoEstoque': produtos_baixo_estoque,
            'despesasPorCategoria': despesas_por_categoria,
            'formasPagamentoMap': formas_pagamento,
        })


def to_float(value) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


# ---------------------------------------- 5. NEXO INTELIGÊNCIA (ANÁLISE + IA)
def register_intelligence(bp):
    @bp.post('/intelligence/analyze')
    @require_auth
    def intelligence_analyze():
        company = db.get_company_by_user_id(g.user['id'])
        if not company:
            return jsonify(error='Nenhuma empresa cadastrada para realizar análise financeira.'), 400

        user_question = _body().get('userQuestion')

        sales = db.get_sales(company['id'], g.user['id'])
        expenses = db.get_expenses(company['id'], g.user['id'])
        products = db.get_products(company['id'], g.user['id'])
        clients = db.get_clients(company['id'], g.user['id'])

        total_vendas = sum(to_float(s.get('valorTotal')) for s in sales)
        total_despesas = sum(to_float(e.get('valor')) for e in expenses)
        resultado_liquido = total_vendas - total_despesas
        margem_lucro_percentual = (resultado_liquido / total_vendas) * 100 if total_vendas > 0 else 0
        ticket_medio = total_vendas / len(sales) if sales else 0

        product_sales: dict[str, dict] = {}
        for sale in sales:
            for item in sale.get('items', []):
                key = item.get('produtoId')
                if key not in product_sales:
                    product_sales[key] = {
                        'nome': item.get('produtoNome'),
                        'quantidade': 0,
                        'receita': 0.0,
                    }
                product_sales[key]['quantidade'] += to_float(item.get('quantidade'))
                product_sales[key]['receita'] += to_float(item.get('subtotal'))

        despesas_por_categoria: dict[str, float] = {}
        for exp in expenses:
            cat = exp.get('categoria', 'Outros')
            despesas_por_categoria[cat] = despesas_por_categoria.get(cat, 0.0) + to_float(exp.get('valor'))

        # Conformidade rigorosa de PII: apenas agregados financeiros anonimizados
        sanitized_data = {
            'nomeEmpresaOuProjeto': company.get('nomeFantasia') or company.get('razaoSocial'),
            'ramoAtividade': company.get('categoria') or company.get('tipoNegocio'),
            'totalVendas': total_vendas,
            'totalDespesas': total_despesas,
            'resultadoLiquido': resultado_liquido,
            'margemLucroPercentual': margem_lucro_percentual,
            'produtosMaisVendidos': sorted(
                product_sales.values(), key=lambda p: p['receita'], reverse=True
            )[:5],
            'produtosBaixoEstoque': [
                {
                    'nome': p.get('nome'),
                    'estoqueAtual': p.get('estoqueAtual'),
                    'estoqueMinimo': p.get('estoqueMinimo'),
                }
                for p in products
                if to_float(p.get('estoqueAtual')) <= to_float(p.get('estoqueMinimo'))
            ],
            'despesasPorCategoria': despesas_por_categoria,
            'totalClientesAtivos': len(clients),
            'ticketMedio': ticket_medio,
        }

        ai_result = analyze_business_with_ai(sanitized_data, user_question)

        return jsonify(
            success=True,
            analysis=ai_result['text'],
            sanitizedMetrics=sanitized_data,
        )


# ---------------------------------- 6. NEXO JOVEM (PROJETOS E SIMULADOR)
def register_jovem(bp):
    @bp.get('/jovem/projects')
    @require_auth
    def jovem_get_projects():
        return jsonify(projects=db.get_projects_by_user_id(g.user['id']))

    @bp.post('/jovem/projects')
    @require_auth
    def jovem_save_project():
        try:
            project = db.save_project_jovem(g.user['id'], _body())
            return jsonify(message='Projeto de negócio salvo com sucesso.', project=project)
        except ValueError as err:
            return jsonify(error=str(err)), 500


# --------------------------------------- 7. NEXO LOCAL & NEXO NETWORK
def register_local_network(bp):
    @bp.get('/opportunities')
    def opportunities():
        list_ = db.get_opportunities(
            categoria=request.args.get('categoria'),
            query=request.args.get('query'),
        )
        return jsonify(opportunities=list_)

    @bp.get('/network/profiles')
    def network_profiles():
        return jsonify(profiles=db.get_network_profiles())

    @bp.post('/network/profile')
    @require_auth
    def save_network_profile():
        try:
            profile = db.save_network_profile(g.user['id'], _body())
            return jsonify(message='Perfil de networking atualizado.', profile=profile)
        except ValueError as err:
            return jsonify(error=str(err)), 500


# ------------------------------------------ 8. NEXO SUPORTE (ÁREA DO CLIENTE)
def register_support(bp):
    @bp.get('/support/tickets')
    @require_auth
    def support_tickets():
        return jsonify(tickets=db.get_tickets_by_user_id(g.user['id']))

    @bp.post('/support/tickets')
    @require_auth
    def support_create_ticket():
        data = _body()
        assunto, categoria, mensagem = data.get('assunto'), data.get('categoria'), data.get('mensagem')
        if not assunto or not categoria or not mensagem:
            return jsonify(error='Assunto, categoria e mensagem são obrigatórios.'), 400

        ticket = db.create_ticket(
            g.user['id'], g.user['email'], g.user['name'],
            {'assunto': assunto, 'categoria': categoria, 'mensagem': mensagem},
        )

        # Mascara a prioridade interna na resposta ao cliente
        client_copy = public_ticket(ticket)
        return jsonify(message='Chamado de suporte registrado.', ticket=client_copy), 201

    @bp.post('/support/tickets/<ticket_id>/reply')
    @require_auth
    def support_reply_ticket(ticket_id):
        mensagem = _body().get('mensagem')
        if not mensagem:
            return jsonify(error='Mensagem de resposta não pode estar vazia.'), 400

        # CORREÇÃO DE BUG: apenas o dono do chamado pode respondê-lo
        owned = next(
            (t for t in db.get_tickets_by_user_id(g.user['id']) if t.get('id') == ticket_id),
            None,
        )
        if not owned:
            return jsonify(error='Chamado não localizado.'), 404

        ticket = db.reply_ticket(ticket_id, g.user['id'], g.user['name'], 'client', mensagem)
        # CORREÇÃO DE BUG: resposta ao cliente sem a classificação interna de prioridade
        return jsonify(message='Resposta enviada com sucesso.', ticket=public_ticket(ticket))


def public_ticket(ticket: dict) -> dict:
    """Cópia do chamado sem a classificação interna de prioridade."""
    from copy import deepcopy
    public = deepcopy(ticket)
    public.pop('prioridade', None)
    public.pop('prioridadeMotivo', None)
    return public


# ---------------------------------------- 9. CENTRAL DE NOTIFICAÇÕES (USUÁRIO)
def register_notifications(bp):
    @bp.get('/notifications')
    @require_auth
    def notifications_list():
        limit = request.args.get('limit', default=50, type=int) or 50
        limit = max(1, min(limit, 100))
        return jsonify(
            notifications=db.get_notifications(g.user['id'], limit=limit),
            unreadCount=db.count_unread_notifications(g.user['id']),
        )

    @bp.post('/notifications/<notification_id>/read')
    @require_auth
    def notifications_mark_read(notification_id):
        notification = db.mark_notification_read(g.user['id'], notification_id)
        if not notification:
            return jsonify(error='Notificação não encontrada.'), 404
        return jsonify(
            message='Notificação marcada como lida.',
            notification=notification,
            unreadCount=db.count_unread_notifications(g.user['id']),
        )

    @bp.post('/notifications/read-all')
    @require_auth
    def notifications_mark_all_read():
        updated = db.mark_all_notifications_read(g.user['id'])
        return jsonify(
            message='Todas as notificações foram marcadas como lidas.',
            updated=updated,
            unreadCount=0,
        )

    @bp.delete('/notifications/read')
    @require_auth
    def notifications_clear_read():
        removed = db.clear_read_notifications(g.user['id'])
        return jsonify(
            message='Notificações lidas removidas.',
            removed=removed,
            unreadCount=db.count_unread_notifications(g.user['id']),
        )

    @bp.delete('/notifications/<notification_id>')
    @require_auth
    def notifications_delete(notification_id):
        success = db.delete_notification(g.user['id'], notification_id)
        if not success:
            return jsonify(error='Notificação não encontrada.'), 404
        return jsonify(
            success=True,
            message='Notificação removida.',
            unreadCount=db.count_unread_notifications(g.user['id']),
        )


# ------------------------------------- 10. PAINEL ADMINISTRATIVO (ROLE ADMIN)
def register_admin(bp):
    @bp.get('/admin/stats')
    @require_admin
    def admin_stats():
        return jsonify(stats=db.get_platform_stats())

    @bp.get('/admin/users')
    @require_admin
    def admin_users():
        # Regra de privacidade: apenas metadados da conta (sem dados financeiros ou CPF)
        return jsonify(users=db.list_all_users_for_admin())

    @bp.post('/admin/users/<user_id>/status')
    @require_admin
    def admin_user_status(user_id):
        status = _body().get('status')
        if status not in ('active', 'suspended'):
            return jsonify(error='Status inválido. Escolha entre "active" ou "suspended".'), 400
        try:
            updated = db.set_account_status(user_id, status, g.user['id'])
            return jsonify(
                message=f'Conta {"reativada" if status == "active" else "suspensa"} com sucesso.',
                user={k: v for k, v in updated.items() if k != 'passwordHash'},
            )
        except ValueError as err:
            return jsonify(error=str(err)), 400

    @bp.get('/admin/tickets')
    @require_admin
    def admin_tickets():
        return jsonify(tickets=db.get_all_tickets_for_admin())

    @bp.post('/admin/tickets/<ticket_id>/reply')
    @require_admin
    def admin_ticket_reply(ticket_id):
        data = _body()
        mensagem, status = data.get('mensagem'), data.get('status')
        if not mensagem:
            return jsonify(error='A mensagem de resposta é obrigatória.'), 400
        try:
            ticket = db.reply_ticket(ticket_id, g.user['id'], g.user['name'], 'admin', mensagem, status)
            return jsonify(message='Resposta administrativa registrada.', ticket=ticket)
        except ValueError as err:
            return jsonify(error=str(err)), 500

    @bp.post('/admin/tickets/<ticket_id>/status')
    @require_admin
    def admin_ticket_status(ticket_id):
        status = _body().get('status')
        valid_statuses = ('pendente', 'em_andamento', 'aguardando_resposta', 'concluido')
        if status not in valid_statuses:
            return jsonify(error=f'Status inválido. Escolha entre: {", ".join(valid_statuses)}.'), 400
        try:
            ticket = db.update_ticket_status(ticket_id, status, g.user['id'])
            return jsonify(message='Status do chamado atualizado.', ticket=ticket)
        except ValueError as err:
            return jsonify(error=str(err)), 500

    @bp.post('/admin/opportunities')
    @require_admin
    def admin_save_opportunity():
        try:
            opp = db.save_opportunity(_body(), g.user['id'])
            return jsonify(message='Oportunidade pública salva com sucesso.', opportunity=opp)
        except ValueError as err:
            return jsonify(error=str(err)), 500

    @bp.delete('/admin/opportunities/<opp_id>')
    @require_admin
    def admin_delete_opportunity(opp_id):
        success = db.delete_opportunity(opp_id)
        return jsonify(success=success, message='Oportunidade removida com sucesso.')

    @bp.get('/admin/audit-logs')
    @require_admin
    def admin_audit_logs():
        return jsonify(logs=db.get_audit_logs(100))


def create_api_blueprint():
    from flask import Blueprint

    bp = Blueprint('api', __name__, url_prefix='')
    register_public_config(bp)
    register_auth(bp)
    register_password_recovery(bp)
    register_business(bp)
    register_intelligence(bp)
    register_jovem(bp)
    register_local_network(bp)
    register_support(bp)
    register_notifications(bp)
    register_admin(bp)
    return bp


api_bp = create_api_blueprint()
