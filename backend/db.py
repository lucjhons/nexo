"""Camada de dados do NEXO.

Persistência em JSON (data/nexo_database.json) — o mesmo arquivo usado
pelo back-end original — com escrita atômica e controle de limite do
log de auditoria. Correções aplicadas em relação à versão anterior:

1. CPF mascarado: agora o dado é DECIFRADO antes de mascarar
   (antes a máscara recebia o texto cifrado e exibia sempre ***.***.***-**).
2. Vendas: o total e os subtotais passam a ser recalculados no servidor
   a partir dos preços reais dos produtos (antes confiava nos valores
   enviados pelo cliente), com validação de estoque e quantidade.
"""
import copy
import json
import math
import os
import random
import threading
import time
from datetime import datetime, timezone

from .crypto import (
    decrypt_sensitive_data,
    encrypt_sensitive_data,
    hash_code,
    hash_password,
    mask_cpf,
)
from .ticket_classifier import classify_ticket_priority

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_DIR = os.path.join(BASE_DIR, 'data')
DB_FILE = os.path.join(DB_DIR, 'nexo_database.json')

AUDIT_LOG_MAX = 500
SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000


def now_iso() -> str:
    now = datetime.now(timezone.utc)
    return now.strftime('%Y-%m-%dT%H:%M:%S.') + f'{now.microsecond // 1000:03d}Z'


def now_ms() -> int:
    return int(time.time() * 1000)


def parse_dt(value):
    try:
        return datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    except (ValueError, TypeError):
        return datetime.fromtimestamp(0, tz=timezone.utc)


def to_number(value, default=0.0):
    try:
        if value is None:
            return default
        number = float(value)
        return default if math.isnan(number) else number
    except (TypeError, ValueError):
        return default


def _whole(value):
    """Mantém inteiros como inteiros (60 em vez de 60.0) no banco JSON."""
    number = to_number(value)
    return int(number) if float(number).is_integer() else number


def gen_id(prefix: str) -> str:
    suffix = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=5))
    return f'{prefix}_{now_ms()}_{suffix}'


class Database:
    """Acesso concorrente-safe ao banco JSON do NEXO."""

    def __init__(self):
        self._lock = threading.RLock()
        self.data = self._load_database()

    # ------------------------------------------------------------- persistência
    def _load_database(self) -> dict:
        with self._lock:
            os.makedirs(DB_DIR, exist_ok=True)
            if os.path.exists(DB_FILE):
                try:
                    with open(DB_FILE, encoding='utf-8') as fh:
                        return json.load(fh)
                except (json.JSONDecodeError, OSError) as err:
                    print(f'Falha ao ler o banco existente, reinicializando: {err}')
            initial = self._generate_initial_seed()
            self._persist(initial)
            return initial

    def _persist(self, data_to_save=None):
        data = data_to_save if data_to_save is not None else self.data
        temp_file = f'{DB_FILE}.tmp'
        with open(temp_file, 'w', encoding='utf-8') as fh:
            json.dump(data, fh, indent=2, ensure_ascii=False)
        os.replace(temp_file, DB_FILE)

    def _generate_initial_seed(self) -> dict:
        """Popularização inicial para primeira execução (espelha a versão original)."""
        now = now_iso()

        admin_user = {
            'id': 'usr_admin_01',
            'name': 'Gestor Administrativo NEXO',
            'email': 'admin@nexo.com.br',
            'passwordHash': hash_password('AdminPassword@2026'),
            'role': 'admin',
            'clientType': None,
            'status': 'active',
            'failedAttempts': 0,
            'createdAt': now,
        }
        business_user = {
            'id': 'usr_biz_01',
            'name': 'Mariana Duarte Mendes',
            'email': 'negocios@exemplo.com.br',
            'passwordHash': hash_password('Business@2026'),
            'role': 'client',
            'clientType': 'business',
            'status': 'active',
            'failedAttempts': 0,
            'createdAt': now,
        }
        jovem_user = {
            'id': 'usr_jovem_01',
            'name': 'Lucas Silva Prado',
            'email': 'jovem@exemplo.com.br',
            'passwordHash': hash_password('JovemNexo@2026'),
            'role': 'client',
            'clientType': 'jovem',
            'status': 'active',
            'failedAttempts': 0,
            'createdAt': now,
        }

        demo_company = {
            'id': 'comp_01',
            'userId': business_user['id'],
            'razaoSocial': 'Aroma & Grão Comércio de Cafés Especiais Ltda',
            'nomeFantasia': 'Cafeteria & Empório Aroma',
            'tipoNegocio': 'Comércio e Serviços',
            'categoria': 'Alimentos e Bebidas',
            'descricao': 'Cafeteria artesanal especializada em grãos selecionados de pequenos produtores e confeitaria autoral.',
            'cidade': 'Belo Horizonte',
            'estado': 'MG',
            'tempoFuncionamento': '1 a 3 anos',
            'numFuncionarios': '3 a 5 funcionários',
            'cnpj': '45.123.789/0001-90',
            'cpfResponsavelEncrypted': encrypt_sensitive_data('123.456.789-00'),
            'telefone': '(31) 98765-4321',
            'emailComercial': 'contato@aromaegrao.com.br',
            'endereco': 'Rua das Flores, 420 - Savassi',
            'objetivos': [
                'Controle de vendas',
                'Controle de despesas',
                'Gestão de estoque',
                'Cadastro de clientes',
                'Análise financeira',
                'Relatórios empresariais',
            ],
            'createdAt': now,
            'updatedAt': now,
        }

        demo_products = [
            {'id': 'prod_01', 'companyId': demo_company['id'], 'nome': 'Café Especial Grãos 250g (Mogiana)', 'categoria': 'Grãos e Cafés', 'precoCusto': 18.50, 'precoVenda': 36.00, 'estoqueAtual': 42, 'estoqueMinimo': 15, 'unidade': 'pct', 'createdAt': now},
            {'id': 'prod_02', 'companyId': demo_company['id'], 'nome': 'Cappuccino Italiano Clássico', 'categoria': 'Bebidas Quentes', 'precoCusto': 4.20, 'precoVenda': 14.00, 'estoqueAtual': 120, 'estoqueMinimo': 30, 'unidade': 'un', 'createdAt': now},
            {'id': 'prod_03', 'companyId': demo_company['id'], 'nome': 'Fatia Bolo de Cenoura Artesanal c/ Brigadeiro', 'categoria': 'Confeitaria', 'precoCusto': 5.00, 'precoVenda': 15.50, 'estoqueAtual': 8, 'estoqueMinimo': 10, 'unidade': 'fat', 'createdAt': now},
            {'id': 'prod_04', 'companyId': demo_company['id'], 'nome': 'Pão de Queijo Recheado da Casa', 'categoria': 'Salgados', 'precoCusto': 3.50, 'precoVenda': 9.90, 'estoqueAtual': 25, 'estoqueMinimo': 15, 'unidade': 'un', 'createdAt': now},
            {'id': 'prod_05', 'companyId': demo_company['id'], 'nome': 'Café Prensa Francesa 500ml', 'categoria': 'Métodos Especiais', 'precoCusto': 6.00, 'precoVenda': 22.00, 'estoqueAtual': 60, 'estoqueMinimo': 20, 'unidade': 'un', 'createdAt': now},
        ]

        demo_clients = [
            {'id': 'cli_01', 'companyId': demo_company['id'], 'nome': 'Camila Ferreira Alves', 'email': 'camila.alves@email.com', 'telefone': '(31) 99123-1122', 'cidade': 'Belo Horizonte', 'notas': 'Cliente assídua no café da manhã. Aprecia cafés frutados.', 'createdAt': now},
            {'id': 'cli_02', 'companyId': demo_company['id'], 'nome': 'Roberto Nogueira', 'email': 'roberto.nog@empresa.com.br', 'telefone': '(31) 98834-5566', 'cidade': 'Nova Lima', 'notas': 'Compra pacotes de café em grãos todo mês para o escritório.', 'createdAt': now},
            {'id': 'cli_03', 'companyId': demo_company['id'], 'nome': 'Juliana Paes e Costa', 'email': 'juliana.costa@techhub.com', 'telefone': '(31) 99445-7788', 'cidade': 'Belo Horizonte', 'notas': 'Participante do clube de fidelidade.', 'createdAt': now},
        ]

        demo_sales = [
            {'id': 'sal_01', 'companyId': demo_company['id'], 'clienteId': 'cli_01', 'clienteNome': demo_clients[0]['nome'], 'items': [
                {'produtoId': 'prod_02', 'produtoNome': 'Cappuccino Italiano Clássico', 'quantidade': 2, 'precoUnitario': 14.00, 'subtotal': 28.00},
                {'produtoId': 'prod_03', 'produtoNome': 'Fatia Bolo de Cenoura Artesanal c/ Brigadeiro', 'quantidade': 1, 'precoUnitario': 15.50, 'subtotal': 15.50},
            ], 'valorTotal': 43.50, 'formaPagamento': 'pix', 'data': now_iso(), 'observacoes': 'Consumo no local - mesa 4'},
            {'id': 'sal_02', 'companyId': demo_company['id'], 'clienteId': 'cli_02', 'clienteNome': demo_clients[1]['nome'], 'items': [
                {'produtoId': 'prod_01', 'produtoNome': 'Café Especial Grãos 250g (Mogiana)', 'quantidade': 3, 'precoUnitario': 36.00, 'subtotal': 108.00},
            ], 'valorTotal': 108.00, 'formaPagamento': 'cartao_credito', 'data': now_iso(), 'observacoes': 'Retirada rápida'},
            {'id': 'sal_03', 'companyId': demo_company['id'], 'clienteId': 'cli_03', 'clienteNome': demo_clients[2]['nome'], 'items': [
                {'produtoId': 'prod_04', 'produtoNome': 'Pão de Queijo Recheado da Casa', 'quantidade': 2, 'precoUnitario': 9.90, 'subtotal': 19.80},
                {'produtoId': 'prod_05', 'produtoNome': 'Café Prensa Francesa 500ml', 'quantidade': 1, 'precoUnitario': 22.00, 'subtotal': 22.00},
            ], 'valorTotal': 41.80, 'formaPagamento': 'cartao_debito', 'data': now_iso(), 'observacoes': 'Atendimento balcão'},
        ]

        demo_expenses = [
            {'id': 'exp_01', 'companyId': demo_company['id'], 'categoria': 'Insumos e Matéria-Prima', 'descricao': 'Lote de café cru direto do produtor Mantiqueira', 'valor': 1850.00, 'data': now_iso(), 'vencimento': now_iso(), 'status': 'pago'},
            {'id': 'exp_02', 'companyId': demo_company['id'], 'categoria': 'Aluguel e Condomínio', 'descricao': 'Aluguel ponto comercial Savassi', 'valor': 3200.00, 'data': now_iso(), 'vencimento': now_iso(), 'status': 'pago'},
            {'id': 'exp_03', 'companyId': demo_company['id'], 'categoria': 'Energia Elétrica', 'descricao': 'Conta Cemig referência mensal', 'valor': 640.50, 'data': now_iso(), 'vencimento': now_iso(), 'status': 'pendente'},
            {'id': 'exp_04', 'companyId': demo_company['id'], 'categoria': 'Embalagens e Descartáveis', 'descricao': 'Copos ecológicos e embalagens seladas', 'valor': 480.00, 'data': now_iso(), 'vencimento': now_iso(), 'status': 'pendente'},
        ]

        demo_goals = [
            {'id': 'goal_01', 'companyId': demo_company['id'], 'titulo': 'Faturamento Mensal Alvo', 'metaValor': 25000.00, 'atualValor': 17450.00, 'prazo': 'Fim do mês corrente', 'status': 'em_andamento'},
            {'id': 'goal_02', 'companyId': demo_company['id'], 'titulo': 'Clientes Cadastrados Ativos', 'metaValor': 100, 'atualValor': 68, 'prazo': '3 meses', 'status': 'em_andamento'},
        ]

        demo_project = {
            'id': 'proj_01',
            'userId': jovem_user['id'],
            'nome': 'EcoPack Embalagens Biodegradáveis',
            'tipoNegocio': 'Indústria Sustentável / B2B',
            'produtosServicos': 'Embalagens térmicas ecológicas produzidas a partir de fibra de mandioca e bagaço de cana para delivery de restaurantes.',
            'publicoAlvo': 'Restaurantes sustentáveis, cafeterias, hamburguerias artesanais e negócios de alimentação consciente.',
            'problemaSolucao': 'Substituir isopor e plásticos descartáveis de uso único por embalagens 100% compostáveis em 90 dias, mantendo alimentos quentes e crocantes.',
            'custosPrincipais': 'Matéria-prima vegetal prensada, maquinário de termoformagem e logística de distribuição local.',
            'objetivoProjeto': 'Validar protótipo com 10 restaurantes piloto nos próximos 6 meses e buscar apoio de edital de inovação.',
            'status': 'simulacao',
            'simulacao': {
                'precoVendaUnitario': 3.20,
                'custoUnitario': 1.40,
                'custosFixosMensais': 2400.00,
                'vendasEstimadasMensais': 3000,
                'pontoEquilibrioUnidades': 1334,
                'pontoEquilibrioReais': 4268.80,
                'margemLucroPercentual': 56.25,
                'lucroMensalEstimado': 3000.00,
            },
            'etapas': [
                {'id': 'etapa_1', 'titulo': 'Definição da Ideia e Problema', 'concluido': True, 'dica': 'Identifique claramente quem sofre a dor e por que as soluções atuais são insuficientes.'},
                {'id': 'etapa_2', 'titulo': 'Pesquisa com Potenciais Clientes', 'concluido': True, 'dica': 'Converse com pelo menos 10 proprietários de restaurantes sobre os custos atuais de descartáveis.'},
                {'id': 'etapa_3', 'titulo': 'Simulação de Custos e Ponto de Equilíbrio', 'concluido': True, 'dica': 'Conheça o número exato de unidades necessárias apenas para cobrir os custos fixos.'},
                {'id': 'etapa_4', 'titulo': 'Desenvolvimento do Protótipo Funcional', 'concluido': False, 'dica': 'Produza as primeiras 50 unidades de teste para avaliar resistência térmica e umidade.'},
                {'id': 'etapa_5', 'titulo': 'Validação no Mercado Piloto', 'concluido': False, 'dica': 'Entregue o produto para uso diário em 3 parceiros e colete feedback minucioso.'},
                {'id': 'etapa_6', 'titulo': 'Formalização e Modelo de Crescimento', 'concluido': False, 'dica': 'Defina a estrutura jurídica (MEI ou ME) e estude editais de fomento à sustentabilidade.'},
            ],
            'createdAt': now,
            'updatedAt': now,
        }

        demo_opportunities = [
            {'id': 'opp_01', 'titulo': 'Programa Empretec SEBRAE 2026', 'categoria': 'curso', 'organizacao': 'SEBRAE', 'descricao': 'Seminário intensivo de desenvolvimento do comportamento empreendedor baseado em metodologia da ONU.', 'link': 'https://sebrae.com.br/empretec', 'dataInicio': 'Inscrições abertas até 15 de cada mês', 'localizacao': 'Presencial nas principais capitais e polos regionais', 'destaque': True, 'criadoPor': admin_user['id']},
            {'id': 'opp_02', 'titulo': 'Edital Inova Jovem — Apoio a Startups de Impacto', 'categoria': 'edital', 'organizacao': 'Fundação de Fomento e Inovação', 'descricao': 'Aporte de até R$ 50.000 em capital semente a fundo perdido para projetos de jovens de 18 a 29 anos.', 'link': 'https://inovajovem.gov.br', 'dataInicio': 'Submissões até 30 de Novembro', 'localizacao': 'Nacional (Inscrição online)', 'destaque': True, 'criadoPor': admin_user['id']},
            {'id': 'opp_03', 'titulo': 'Oficina Prática de Gestão de Fluxo de Caixa e Custos', 'categoria': 'curso', 'organizacao': 'Escola de Negócios Locais', 'descricao': 'Aprenda a controlar entradas, saídas, prazos de recebimento e formação de preço de venda sem complicação.', 'link': 'https://nexo.org.br/cursos/gestao-financeira', 'dataInicio': 'Toda terça e quinta, 19h', 'localizacao': 'Online / Transmissão ao vivo', 'destaque': False, 'criadoPor': admin_user['id']},
            {'id': 'opp_04', 'titulo': 'Feira Regional de Empreendedorismo e Conexões', 'categoria': 'evento', 'organizacao': 'Associação Comercial e Empresarial', 'descricao': 'Espaço de networking, rodadas de negócios com compradores locais e estandes para novas marcas.', 'link': 'https://feiradoempreendedor.org.br', 'dataInicio': 'Dias 12 a 14 do próximo mês', 'localizacao': 'Centro de Convenções Regional', 'destaque': True, 'criadoPor': admin_user['id']},
            {'id': 'opp_05', 'titulo': 'Mentoria Jurídica e Contábil Gratuita para MEIs', 'categoria': 'apoio', 'organizacao': 'Núcleo de Práticas Jurídicas', 'descricao': 'Orientação personalizada com advogados e contadores para regularização, contratos e enquadramento fiscal.', 'link': 'https://nucleodeapoio.org.br', 'dataInicio': 'Atendimento contínuo mediante agendamento', 'localizacao': 'Híbrido (Presencial ou videoconferência)', 'destaque': False, 'criadoPor': admin_user['id']},
        ]

        ticket1 = classify_ticket_priority(
            'Não consigo emitir pedido de venda no balcão', 'vendas',
            'Ao tentar registrar a venda com 3 itens, o sistema apresentou mensagem de timeout e não confirmou o pagamento. Estamos com clientes na fila.',
        )
        ticket2 = classify_ticket_priority(
            'Dúvida sobre simulador de ponto de equilíbrio', 'duvida',
            'Gostaria de saber se a fórmula do ponto de equilíbrio já considera a depreciação de máquinas que comprei em segunda mão.',
        )
        ticket3 = classify_ticket_priority(
            'Suspeita de tentativa de acesso não autorizada na conta', 'segurança',
            'Recebi um aviso no meu e-mail informando que alguém tentou logar na minha conta a partir de um IP desconhecido. Solicito bloqueio preventivo e verificação.',
        )

        demo_tickets = [
            {'id': 'tkt_01', 'ticketNumber': 'NX-2026-1001', 'userId': business_user['id'], 'userEmail': business_user['email'], 'userName': business_user['name'], 'assunto': 'Não consigo emitir pedido de venda no balcão', 'categoria': 'vendas', 'mensagem': 'Ao tentar registrar a venda com 3 itens, o sistema apresentou mensagem de timeout e não confirmou o pagamento. Estamos com clientes na fila.', 'status': 'em_andamento', 'prioridade': ticket1['prioridade'], 'prioridadeMotivo': ticket1['motivo'], 'respostas': [
                {'id': 'resp_01', 'autorId': admin_user['id'], 'autorNome': 'Suporte Técnico NEXO', 'autorRole': 'admin', 'mensagem': 'Olá Mariana, nossa equipe operacional identificou uma oscilação na rota de transações do gateway e já aplicou a correção de contingência. Pode tentar registrar novamente?', 'data': now_iso()},
            ], 'createdAt': now_iso(), 'updatedAt': now_iso()},
            {'id': 'tkt_02', 'ticketNumber': 'NX-2026-1002', 'userId': jovem_user['id'], 'userEmail': jovem_user['email'], 'userName': jovem_user['name'], 'assunto': 'Dúvida sobre simulador de ponto de equilíbrio', 'categoria': 'duvida', 'mensagem': 'Gostaria de saber se a fórmula do ponto de equilíbrio já considera a depreciação de máquinas que comprei em segunda mão.', 'status': 'pendente', 'prioridade': ticket2['prioridade'], 'prioridadeMotivo': ticket2['motivo'], 'respostas': [], 'createdAt': now_iso(), 'updatedAt': now_iso()},
            {'id': 'tkt_03', 'ticketNumber': 'NX-2026-1003', 'userId': business_user['id'], 'userEmail': business_user['email'], 'userName': business_user['name'], 'assunto': 'Suspeita de tentativa de acesso não autorizada na conta', 'categoria': 'segurança', 'mensagem': 'Recebi um aviso no meu e-mail informando que alguém tentou logar na minha conta a partir de um IP desconhecido. Solicito bloqueio preventivo e verificação.', 'status': 'pendente', 'prioridade': ticket3['prioridade'], 'prioridadeMotivo': ticket3['motivo'], 'respostas': [], 'createdAt': now_iso(), 'updatedAt': now_iso()},
        ]

        demo_profiles = [
            {'id': 'net_01', 'userId': jovem_user['id'], 'nomePublico': 'Lucas Silva Prado — Fundador EcoPack', 'tipoPerfil': 'jovem', 'biografia': 'Estudante de engenharia e entusiasta de biomateriais. Desenvolvendo soluções para diminuir o impacto do plástico descartável no setor gastronômico.', 'areaAtuacao': 'Sustentabilidade e Embalagens', 'habilidades': ['Biomateriais', 'Modelagem de Negócios', 'Design de Produto', 'Sustentabilidade'], 'contatoAutorizado': 'contato.lucas@ecopack.exemplo.com.br', 'projetosPublicos': [{'titulo': 'EcoPack Embalagens', 'resumo': 'Embalagens térmicas biodegradáveis feitas de mandioca e bagaço de cana.'}], 'visivel': True, 'createdAt': now},
            {'id': 'net_02', 'userId': business_user['id'], 'nomePublico': 'Mariana Duarte Mendes — Café & Empório Aroma', 'tipoPerfil': 'empreendedor', 'biografia': 'Empreendedora com 3 anos de atuação no mercado de cafeterias especiais. Apaixonada por comércio justo e valorização de pequenos produtores rurais.', 'areaAtuacao': 'Alimentos, Bebidas e Varejo Especial', 'habilidades': ['Gestão de Cafeterias', 'Controle Financeiro', 'Curadoria de Cafés', 'Atendimento'], 'contatoAutorizado': 'mariana@aromaegrao.com.br', 'projetosPublicos': [{'titulo': 'Cafeteria & Empório Aroma', 'resumo': 'Cafeteria especializada em cafés especiais e doces artesanais em Belo Horizonte.'}], 'visivel': True, 'createdAt': now},
        ]

        demo_audit_logs = [
            {'id': 'aud_01', 'timestamp': now_iso(), 'userId': admin_user['id'], 'userEmail': admin_user['email'], 'action': 'INICIALIZACAO_SISTEMA', 'resource': 'SISTEMA_NEXO', 'details': 'Criação inicial da base de dados e esquemas de proteção criptográfica.', 'ip': '127.0.0.1'},
            {'id': 'aud_02', 'timestamp': now_iso(), 'userId': business_user['id'], 'userEmail': business_user['email'], 'action': 'CADASTRO_EMPRESA', 'resource': 'COMPANIES', 'details': 'Empresa cadastrada com sucesso via assistente guiado. CPF do responsável criptografado com chave AES-256.', 'ip': '189.40.12.8'},
            {'id': 'aud_03', 'timestamp': now_iso(), 'userId': jovem_user['id'], 'userEmail': jovem_user['email'], 'action': 'SIMULACAO_PROJETO_CRIADA', 'resource': 'PROJECTS_JOVEM', 'details': 'Projeto EcoPack configurado com cálculo de Ponto de Equilíbrio em 1334 unidades.', 'ip': '177.105.88.2'},
        ]

        return {
            'users': [admin_user, business_user, jovem_user],
            'passwordResets': [],
            'companies': [demo_company],
            'projects': [demo_project],
            'products': demo_products,
            'sales': demo_sales,
            'expenses': demo_expenses,
            'clients': demo_clients,
            'businessGoals': demo_goals,
            'opportunities': demo_opportunities,
            'supportTickets': demo_tickets,
            'networkProfiles': demo_profiles,
            'auditLogs': demo_audit_logs,
        }

    # --------------------------------------------------- segurança & auditoria
    def log_audit(self, entry: dict):
        with self._lock:
            log = {
                'id': gen_id('aud'),
                'timestamp': now_iso(),
                **entry,
            }
            self.data['auditLogs'].insert(0, log)
            if len(self.data['auditLogs']) > AUDIT_LOG_MAX:
                self.data['auditLogs'].pop()
            self._persist()

    def get_audit_logs(self, limit=100):
        with self._lock:
            return self.data['auditLogs'][:limit]

    # ---------------------------------------------------------- usuários & auth
    def find_user_by_email(self, email):
        with self._lock:
            clean = str(email).strip().lower()
            return next((u for u in self.data['users'] if str(u.get('email', '')).lower() == clean), None)

    def find_user_by_id(self, user_id):
        with self._lock:
            return next((u for u in self.data['users'] if u.get('id') == user_id), None)

    def create_user(self, *, name, email, password, role, client_type):
        with self._lock:
            if self.find_user_by_email(email):
                raise ValueError('Este endereço de e-mail já possui uma conta cadastrada no NEXO. Por favor, acesse a página de login.')

            new_user = {
                'id': gen_id('usr'),
                'name': str(name).strip(),
                'email': str(email).strip().lower(),
                'passwordHash': hash_password(password),
                'role': role,
                'clientType': client_type,
                'status': 'active',
                'failedAttempts': 0,
                'createdAt': now_iso(),
            }
            self.data['users'].append(new_user)
            self._persist()

            self.log_audit({
                'userId': new_user['id'],
                'userEmail': new_user['email'],
                'action': 'USUARIO_CADASTRADO',
                'resource': 'USERS',
                'details': f'Novo usuário registrado ({new_user["role"]} / {new_user["clientType"] or "indefinido"})',
            })
            return new_user

    def update_user_login_success(self, user_id):
        with self._lock:
            user = self.find_user_by_id(user_id)
            if user:
                user['failedAttempts'] = 0
                user.pop('lockedUntil', None)
                user['lastLoginAt'] = now_iso()
                self._persist()

    def record_failed_login(self, email):
        with self._lock:
            user = self.find_user_by_email(email)
            if not user:
                return
            user['failedAttempts'] = (user.get('failedAttempts') or 0) + 1
            # Bloqueia por 15 minutos após 5 tentativas incorretas consecutivas
            if user['failedAttempts'] >= 5:
                user['lockedUntil'] = now_ms() + 15 * 60 * 1000
                self.log_audit({
                    'userId': user['id'],
                    'userEmail': user['email'],
                    'action': 'CONTA_TEMPORARIAMENTE_BLOQUEADA',
                    'resource': 'USERS',
                    'details': '5 tentativas consecutivas de senha incorreta. Conta bloqueada por 15 minutos.',
                })
            self._persist()

    def update_user_client_type(self, user_id, client_type):
        with self._lock:
            user = self.find_user_by_id(user_id)
            if not user:
                raise ValueError('Usuário não encontrado')
            user['clientType'] = client_type
            self._persist()

    # -------------------------------------------------------- recuperação de senha
    def create_password_reset(self, email, raw_code):
        with self._lock:
            clean_email = str(email).strip().lower()
            for pr in self.data['passwordResets']:
                if pr.get('email') == clean_email and not pr.get('used'):
                    pr['used'] = True

            reset_record = {
                'id': gen_id('rst'),
                'email': clean_email,
                'hashedCode': hash_code(raw_code),
                'expiresAt': now_ms() + 10 * 60 * 1000,  # 10 minutos
                'used': False,
                'attempts': 0,
                'createdAt': now_iso(),
            }
            self.data['passwordResets'].append(reset_record)
            self._persist()
            return reset_record

    def verify_and_reset_password(self, email, raw_code, new_password):
        with self._lock:
            clean_email = str(email).strip().lower()
            candidate_hash = hash_code(raw_code)

            candidates = [
                pr for pr in self.data['passwordResets']
                if pr.get('email') == clean_email and not pr.get('used') and pr.get('expiresAt', 0) > now_ms()
            ]
            record = max(candidates, key=lambda pr: pr.get('expiresAt', 0), default=None)
            if not record:
                raise ValueError('Código de verificação inválido, expirado ou inexistente.')

            record['attempts'] = record.get('attempts', 0) + 1
            if record['attempts'] > 3:
                record['used'] = True
                self._persist()
                raise ValueError('Limite de tentativas para este código foi excedido. Solicite um novo código de recuperação.')

            if record.get('hashedCode') != candidate_hash:
                self._persist()
                raise ValueError('Código de verificação incorreto. Verifique o número recebido por e-mail.')

            record['used'] = True

            user = self.find_user_by_email(clean_email)
            if not user:
                raise ValueError('Usuário não localizado no sistema.')

            user['passwordHash'] = hash_password(new_password)
            user['failedAttempts'] = 0
            user.pop('lockedUntil', None)
            self._persist()

            self.log_audit({
                'userId': user['id'],
                'userEmail': user['email'],
                'action': 'SENHA_REDEFINIDA_COM_SUCESSO',
                'resource': 'PASSWORD_RESET',
                'details': 'Senha atualizada através do fluxo de verificação em duas etapas de recuperação.',
            })
            return True

    # ------------------------------------------ gestão de contas (admin, privado)
    def list_all_users_for_admin(self):
        with self._lock:
            return [
                {k: v for k, v in user.items() if k != 'passwordHash'}
                for user in self.data['users']
            ]

    def set_account_status(self, user_id, status, admin_id):
        with self._lock:
            user = self.find_user_by_id(user_id)
            if not user:
                raise ValueError('Usuário não encontrado')
            if user.get('role') == 'admin' and status == 'suspended':
                raise ValueError('Não é permitido suspender uma conta administrativa principal.')

            user['status'] = status
            self._persist()
            self.log_audit({
                'userId': admin_id,
                'action': 'CONTA_REATIVADA' if status == 'active' else 'CONTA_SUSPENSA',
                'resource': 'USERS',
                'details': f'Status do usuário {user["email"]} alterado para "{status}" pelo administrador.',
            })
            return user

    # ------------------------------------------------------- empresa (BUSINESS)
    def _company_for_user(self, company_id, user_id):
        return next(
            (c for c in self.data['companies'] if c.get('id') == company_id and c.get('userId') == user_id),
            None,
        )

    def get_company_by_user_id(self, user_id):
        with self._lock:
            comp = next((c for c in self.data['companies'] if c.get('userId') == user_id), None)
            if not comp:
                return None
            result = dict(comp)
            # CORREÇÃO DE BUG: decifra o CPF antes de mascarar (antes exibia sempre ***.***.***-**)
            result['cpfMascarado'] = (
                mask_cpf(decrypt_sensitive_data(comp.get('cpfResponsavelEncrypted', '')))
                if comp.get('cpfResponsavelEncrypted')
                else '***.***.***-**'
            )
            return result

    def save_company(self, user_id, company_data):
        with self._lock:
            company = next((c for c in self.data['companies'] if c.get('userId') == user_id), None)
            now = now_iso()

            if not company:
                company = {
                    'id': gen_id('comp'),
                    'userId': user_id,
                    'razaoSocial': company_data.get('razaoSocial') or '',
                    'nomeFantasia': company_data.get('nomeFantasia') or company_data.get('razaoSocial') or '',
                    'tipoNegocio': company_data.get('tipoNegocio') or 'Comércio',
                    'categoria': company_data.get('categoria') or 'Geral',
                    'descricao': company_data.get('descricao') or '',
                    'cidade': company_data.get('cidade') or '',
                    'estado': company_data.get('estado') or '',
                    'tempoFuncionamento': company_data.get('tempoFuncionamento') or 'Menos de 1 ano',
                    'numFuncionarios': company_data.get('numFuncionarios') or '1 a 2',
                    'cnpj': company_data.get('cnpj') or '',
                    'cpfResponsavelEncrypted': encrypt_sensitive_data(company_data['cpfResponsavel']) if company_data.get('cpfResponsavel') else '',
                    'telefone': company_data.get('telefone') or '',
                    'emailComercial': company_data.get('emailComercial') or '',
                    'endereco': company_data.get('endereco') or '',
                    'objetivos': company_data.get('objetivos') or [],
                    'createdAt': now,
                    'updatedAt': now,
                }
                self.data['companies'].append(company)
            else:
                for field in (
                    'razaoSocial', 'nomeFantasia', 'tipoNegocio', 'categoria', 'descricao',
                    'cidade', 'estado', 'tempoFuncionamento', 'numFuncionarios', 'cnpj',
                    'telefone', 'emailComercial', 'endereco', 'objetivos',
                ):
                    if field in company_data:
                        company[field] = company_data[field]
                if company_data.get('cpfResponsavel'):
                    company['cpfResponsavelEncrypted'] = encrypt_sensitive_data(company_data['cpfResponsavel'])
                company['updatedAt'] = now

            self._persist()
            return company

    # --------------------------------------------------- produtos & estoque
    def get_products(self, company_id, user_id):
        with self._lock:
            if not self._company_for_user(company_id, user_id):
                return []
            return [p for p in self.data['products'] if p.get('companyId') == company_id]

    def save_product(self, company_id, user_id, product_data):
        with self._lock:
            if not self._company_for_user(company_id, user_id):
                raise ValueError('Acesso não autorizado para esta empresa.')

            if product_data.get('id'):
                prod = next(
                    (p for p in self.data['products'] if p.get('id') == product_data['id'] and p.get('companyId') == company_id),
                    None,
                )
                if not prod:
                    raise ValueError('Produto não encontrado')
                prod['nome'] = product_data.get('nome', prod.get('nome'))
                prod['categoria'] = product_data.get('categoria', prod.get('categoria'))
                prod['precoCusto'] = to_number(product_data.get('precoCusto', prod.get('precoCusto')))
                prod['precoVenda'] = to_number(product_data.get('precoVenda', prod.get('precoVenda')))
                prod['estoqueAtual'] = to_number(product_data.get('estoqueAtual', prod.get('estoqueAtual')))
                prod['estoqueMinimo'] = to_number(product_data.get('estoqueMinimo', prod.get('estoqueMinimo')))
                prod['unidade'] = product_data.get('unidade', prod.get('unidade'))
                self._persist()
                return prod

            new_product = {
                'id': gen_id('prod'),
                'companyId': company_id,
                'nome': product_data.get('nome'),
                'categoria': product_data.get('categoria'),
                'precoCusto': to_number(product_data.get('precoCusto')),
                'precoVenda': to_number(product_data.get('precoVenda')),
                'estoqueAtual': to_number(product_data.get('estoqueAtual')),
                'estoqueMinimo': to_number(product_data.get('estoqueMinimo')),
                'unidade': product_data.get('unidade') or 'un',
                'createdAt': now_iso(),
            }
            self.data['products'].append(new_product)
            self._persist()
            return new_product

    def delete_product(self, product_id, company_id, user_id):
        with self._lock:
            if not self._company_for_user(company_id, user_id):
                raise ValueError('Não autorizado.')
            before = len(self.data['products'])
            self.data['products'] = [
                p for p in self.data['products']
                if not (p.get('id') == product_id and p.get('companyId') == company_id)
            ]
            if len(self.data['products']) != before:
                self._persist()
                return True
            return False

    # ---------------------------------------------------------------- vendas
    def get_sales(self, company_id, user_id):
        with self._lock:
            if not self._company_for_user(company_id, user_id):
                return []
            sales = [s for s in self.data['sales'] if s.get('companyId') == company_id]
            sales.sort(key=lambda s: parse_dt(s.get('data', '')), reverse=True)
            return sales

    def create_sale(self, company_id, user_id, sale_data):
        with self._lock:
            if not self._company_for_user(company_id, user_id):
                raise ValueError('Não autorizado para esta empresa.')

            items = sale_data.get('items') or []
            if not items:
                raise ValueError('A venda deve conter ao menos um produto selecionado.')

            valor_total = 0.0
            processed_items = []
            for item in items:
                product = next(
                    (p for p in self.data['products'] if p.get('id') == item.get('produtoId') and p.get('companyId') == company_id),
                    None,
                )
                if not product:
                    raise ValueError(f'Produto inválido nesta venda: {item.get("produtoId") or "?"}')

                quantidade = _whole(to_number(item.get('quantidade'), 0))
                if quantidade <= 0:
                    raise ValueError(f'Quantidade inválida para o produto "{product["nome"]}".')
                if product.get('estoqueAtual', 0) < quantidade:
                    raise ValueError(
                        f'Estoque insuficiente para "{product["nome"]}" '
                        f'(disponível: {product.get("estoqueAtual", 0)}).'
                    )

                # CORREÇÃO DE BUG: subtotal e total recalculados no servidor com o preço real
                preco_unitario = to_number(product.get('precoVenda'), 0)
                subtotal = round(quantidade * preco_unitario, 2)
                processed_items.append({
                    'produtoId': product['id'],
                    'produtoNome': product['nome'],
                    'quantidade': quantidade,
                    'precoUnitario': preco_unitario,
                    'subtotal': subtotal,
                })
                product['estoqueAtual'] = _whole(product.get('estoqueAtual', 0) - quantidade)
                valor_total = round(valor_total + subtotal, 2)

            new_sale = {
                'id': gen_id('sal'),
                'companyId': company_id,
                'clienteId': sale_data.get('clienteId'),
                'clienteNome': sale_data.get('clienteNome'),
                'items': processed_items,
                'valorTotal': valor_total,
                'formaPagamento': sale_data.get('formaPagamento'),
                'data': now_iso(),
                'observacoes': sale_data.get('observacoes'),
            }
            self.data['sales'].insert(0, new_sale)
            self._persist()
            return new_sale

    # -------------------------------------------------------------- despesas
    def get_expenses(self, company_id, user_id):
        with self._lock:
            if not self._company_for_user(company_id, user_id):
                return []
            expenses = [e for e in self.data['expenses'] if e.get('companyId') == company_id]
            expenses.sort(key=lambda e: parse_dt(e.get('data', '')), reverse=True)
            return expenses

    def save_expense(self, company_id, user_id, exp_data):
        with self._lock:
            if not self._company_for_user(company_id, user_id):
                raise ValueError('Não autorizado.')

            if exp_data.get('id'):
                exp = next(
                    (e for e in self.data['expenses'] if e.get('id') == exp_data['id'] and e.get('companyId') == company_id),
                    None,
                )
                if not exp:
                    raise ValueError('Despesa não encontrada')
                exp['categoria'] = exp_data.get('categoria', exp.get('categoria'))
                exp['descricao'] = exp_data.get('descricao', exp.get('descricao'))
                exp['valor'] = to_number(exp_data.get('valor', exp.get('valor')))
                exp['data'] = exp_data.get('data', exp.get('data'))
                exp['vencimento'] = exp_data.get('vencimento', exp.get('vencimento'))
                exp['status'] = exp_data.get('status', exp.get('status'))
                self._persist()
                return exp

            new_expense = {
                'id': gen_id('exp'),
                'companyId': company_id,
                'categoria': exp_data.get('categoria'),
                'descricao': exp_data.get('descricao'),
                'valor': to_number(exp_data.get('valor')),
                'data': exp_data.get('data') or now_iso(),
                'vencimento': exp_data.get('vencimento') or now_iso(),
                'status': exp_data.get('status') or 'pendente',
            }
            self.data['expenses'].insert(0, new_expense)
            self._persist()
            return new_expense

    def delete_expense(self, expense_id, company_id, user_id):
        with self._lock:
            if not self._company_for_user(company_id, user_id):
                raise ValueError('Não autorizado.')
            before = len(self.data['expenses'])
            self.data['expenses'] = [
                e for e in self.data['expenses']
                if not (e.get('id') == expense_id and e.get('companyId') == company_id)
            ]
            if len(self.data['expenses']) != before:
                self._persist()
                return True
            return False

    # ----------------------------------------------------------- clientes (CRM)
    def get_clients(self, company_id, user_id):
        with self._lock:
            if not self._company_for_user(company_id, user_id):
                return []
            return [c for c in self.data['clients'] if c.get('companyId') == company_id]

    def save_client(self, company_id, user_id, client_data):
        with self._lock:
            if not self._company_for_user(company_id, user_id):
                raise ValueError('Não autorizado.')

            if client_data.get('id'):
                client = next(
                    (c for c in self.data['clients'] if c.get('id') == client_data['id'] and c.get('companyId') == company_id),
                    None,
                )
                if not client:
                    raise ValueError('Cliente não encontrado')
                client['nome'] = client_data.get('nome', client.get('nome'))
                client['email'] = client_data.get('email', client.get('email'))
                client['telefone'] = client_data.get('telefone', client.get('telefone'))
                client['cidade'] = client_data.get('cidade', client.get('cidade'))
                client['notas'] = client_data.get('notas', client.get('notas'))
                self._persist()
                return client

            new_client = {
                'id': gen_id('cli'),
                'companyId': company_id,
                'nome': client_data.get('nome'),
                'email': client_data.get('email'),
                'telefone': client_data.get('telefone'),
                'cidade': client_data.get('cidade'),
                'notas': client_data.get('notas'),
                'createdAt': now_iso(),
            }
            self.data['clients'].append(new_client)
            self._persist()
            return new_client

    def delete_client(self, client_id, company_id, user_id):
        with self._lock:
            if not self._company_for_user(company_id, user_id):
                raise ValueError('Não autorizado.')
            before = len(self.data['clients'])
            self.data['clients'] = [
                c for c in self.data['clients']
                if not (c.get('id') == client_id and c.get('companyId') == company_id)
            ]
            if len(self.data['clients']) != before:
                self._persist()
                return True
            return False

    # --------------------------------------------------------------- metas
    def get_goals(self, company_id, user_id):
        with self._lock:
            if not self._company_for_user(company_id, user_id):
                return []
            return [g for g in self.data['businessGoals'] if g.get('companyId') == company_id]

    def save_goal(self, company_id, user_id, goal_data):
        with self._lock:
            if not self._company_for_user(company_id, user_id):
                raise ValueError('Não autorizado.')

            if goal_data.get('id'):
                goal = next(
                    (g for g in self.data['businessGoals'] if g.get('id') == goal_data['id'] and g.get('companyId') == company_id),
                    None,
                )
                if not goal:
                    raise ValueError('Meta não encontrada')
                goal['titulo'] = goal_data.get('titulo', goal.get('titulo'))
                goal['metaValor'] = to_number(goal_data.get('metaValor', goal.get('metaValor')))
                goal['atualValor'] = to_number(goal_data.get('atualValor', goal.get('atualValor')))
                goal['prazo'] = goal_data.get('prazo', goal.get('prazo'))
                goal['status'] = goal_data.get('status', goal.get('status'))
                self._persist()
                return goal

            new_goal = {
                'id': gen_id('goal'),
                'companyId': company_id,
                'titulo': goal_data.get('titulo'),
                'metaValor': to_number(goal_data.get('metaValor')),
                'atualValor': to_number(goal_data.get('atualValor')),
                'prazo': goal_data.get('prazo'),
                'status': goal_data.get('status') or 'em_andamento',
            }
            self.data['businessGoals'].append(new_goal)
            self._persist()
            return new_goal

    def delete_goal(self, goal_id, company_id, user_id):
        with self._lock:
            if not self._company_for_user(company_id, user_id):
                raise ValueError('Não autorizado.')
            before = len(self.data['businessGoals'])
            self.data['businessGoals'] = [
                g for g in self.data['businessGoals']
                if not (g.get('id') == goal_id and g.get('companyId') == company_id)
            ]
            if len(self.data['businessGoals']) != before:
                self._persist()
                return True
            return False

    # --------------------------------------- NEXO JOVEM (projetos & simulador)
    def get_projects_by_user_id(self, user_id):
        with self._lock:
            return [p for p in self.data['projects'] if p.get('userId') == user_id]

    def _compute_simulation(self, simulation_in):
        preco = to_number(simulation_in.get('precoVendaUnitario'), 10)
        custo_unit = to_number(simulation_in.get('custoUnitario'), 4)
        custos_fixos = to_number(simulation_in.get('custosFixosMensais'), 1000)
        vendas = to_number(simulation_in.get('vendasEstimadasMensais'), 300)

        margem_contribuicao = max(0.01, preco - custo_unit)
        ponto_equilibrio_unidades = math.ceil(custos_fixos / margem_contribuicao)
        return {
            'precoVendaUnitario': preco,
            'custoUnitario': custo_unit,
            'custosFixosMensais': custos_fixos,
            'vendasEstimadasMensais': vendas,
            'pontoEquilibrioUnidades': ponto_equilibrio_unidades,
            'pontoEquilibrioReais': ponto_equilibrio_unidades * preco,
            'margemLucroPercentual': (margem_contribuicao / preco) * 100 if preco > 0 else 0,
            'lucroMensalEstimado': (vendas * margem_contribuicao) - custos_fixos,
        }

    def save_project_jovem(self, user_id, project_data):
        with self._lock:
            now = now_iso()
            project = None
            if project_data.get('id'):
                project = next(
                    (p for p in self.data['projects'] if p.get('id') == project_data['id'] and p.get('userId') == user_id),
                    None,
                )

            computed_simulation = self._compute_simulation(project_data.get('simulacao') or {})

            if project:
                for field in (
                    'nome', 'tipoNegocio', 'produtosServicos', 'publicoAlvo',
                    'problemaSolucao', 'custosPrincipais', 'objetivoProjeto', 'status', 'etapas',
                ):
                    if field in project_data:
                        project[field] = project_data[field]
                project['simulacao'] = computed_simulation
                project['updatedAt'] = now
            else:
                project = {
                    'id': gen_id('proj'),
                    'userId': user_id,
                    'nome': project_data.get('nome') or 'Novo Projeto NEXO Jovem',
                    'tipoNegocio': project_data.get('tipoNegocio') or 'Serviços / Digital',
                    'produtosServicos': project_data.get('produtosServicos') or '',
                    'publicoAlvo': project_data.get('publicoAlvo') or '',
                    'problemaSolucao': project_data.get('problemaSolucao') or '',
                    'custosPrincipais': project_data.get('custosPrincipais') or '',
                    'objetivoProjeto': project_data.get('objetivoProjeto') or '',
                    'status': project_data.get('status') or 'planejamento',
                    'simulacao': computed_simulation,
                    'etapas': project_data.get('etapas') or [
                        {'id': 'etapa_1', 'titulo': 'Definição da Ideia e Problema', 'concluido': True, 'dica': 'Identifique claramente quem sofre a dor e por que as soluções atuais são insuficientes.'},
                        {'id': 'etapa_2', 'titulo': 'Pesquisa com Potenciais Clientes', 'concluido': False, 'dica': 'Converse com pelo menos 10 potenciais clientes para validar interesse real.'},
                        {'id': 'etapa_3', 'titulo': 'Simulação de Custos e Ponto de Equilíbrio', 'concluido': False, 'dica': 'Calcule o preço de venda e a quantidade mínima para não ter prejuízo.'},
                        {'id': 'etapa_4', 'titulo': 'Desenvolvimento do Protótipo / MVP', 'concluido': False, 'dica': 'Crie uma versão simplificada para validar a proposta de valor rapidamente.'},
                        {'id': 'etapa_5', 'titulo': 'Primeiras Vendas e Feedback', 'concluido': False, 'dica': 'Conquiste seus primeiros clientes pagantes e aprimore o serviço.'},
                        {'id': 'etapa_6', 'titulo': 'Planejamento de Crescimento e Formalização', 'concluido': False, 'dica': 'Analise enquadramento no MEI e parcerias estratégicas.'},
                    ],
                    'createdAt': now,
                    'updatedAt': now,
                }
                self.data['projects'].append(project)

            self._persist()
            return project

    # --------------------------------------------- oportunidades (NEXO LOCAL)
    def get_opportunities(self, categoria=None, query=None):
        with self._lock:
            opportunities = list(self.data['opportunities'])
            if categoria and categoria != 'todos':
                opportunities = [o for o in opportunities if o.get('categoria') == categoria]
            if query:
                q = query.lower()
                opportunities = [
                    o for o in opportunities
                    if q in str(o.get('titulo', '')).lower()
                    or q in str(o.get('descricao', '')).lower()
                    or q in str(o.get('organizacao', '')).lower()
                ]
            return opportunities

    def save_opportunity(self, opp_data, admin_user_id):
        with self._lock:
            if opp_data.get('id'):
                opp = next((o for o in self.data['opportunities'] if o.get('id') == opp_data['id']), None)
                if not opp:
                    raise ValueError('Oportunidade não encontrada')
                for field in ('titulo', 'categoria', 'organizacao', 'descricao', 'link', 'dataInicio', 'localizacao', 'destaque'):
                    if field in opp_data:
                        opp[field] = opp_data[field]
                self._persist()
                return opp

            new_opp = {
                'id': gen_id('opp'),
                'titulo': opp_data.get('titulo'),
                'categoria': opp_data.get('categoria'),
                'organizacao': opp_data.get('organizacao'),
                'descricao': opp_data.get('descricao'),
                'link': opp_data.get('link'),
                'dataInicio': opp_data.get('dataInicio'),
                'localizacao': opp_data.get('localizacao'),
                'destaque': opp_data.get('destaque') or False,
                'criadoPor': admin_user_id,
            }
            self.data['opportunities'].insert(0, new_opp)
            self._persist()
            return new_opp

    def delete_opportunity(self, opp_id):
        with self._lock:
            before = len(self.data['opportunities'])
            self.data['opportunities'] = [o for o in self.data['opportunities'] if o.get('id') != opp_id]
            if len(self.data['opportunities']) != before:
                self._persist()
                return True
            return False

    # ------------------------------------------------ suporte (NEXO SUPORTE)
    @staticmethod
    def _public_ticket(ticket):
        """Cópia sem a classificação interna de prioridade (visível só a admins)."""
        public = copy.deepcopy(ticket)
        public.pop('prioridade', None)
        public.pop('prioridadeMotivo', None)
        return public

    def get_tickets_by_user_id(self, user_id):
        with self._lock:
            tickets = [self._public_ticket(t) for t in self.data['supportTickets'] if t.get('userId') == user_id]
            tickets.sort(key=lambda t: parse_dt(t.get('createdAt', '')), reverse=True)
            return tickets

    def get_all_tickets_for_admin(self):
        with self._lock:
            priority_order = {'alta': 3, 'media': 2, 'baixa': 1}
            tickets = list(self.data['supportTickets'])
            tickets.sort(
                key=lambda t: (
                    priority_order.get(t.get('prioridade'), 0),
                    parse_dt(t.get('createdAt', '')),
                ),
                reverse=True,
            )
            return tickets

    def create_ticket(self, user_id, user_email, user_name, data):
        with self._lock:
            now = now_iso()
            classification = classify_ticket_priority(
                data.get('assunto'), data.get('categoria'), data.get('mensagem'), now
            )
            count = len(self.data['supportTickets']) + 1001
            ticket_number = f'NX-2026-{count}'

            new_ticket = {
                'id': gen_id('tkt'),
                'ticketNumber': ticket_number,
                'userId': user_id,
                'userEmail': user_email,
                'userName': user_name,
                'assunto': data.get('assunto'),
                'categoria': data.get('categoria'),
                'mensagem': data.get('mensagem'),
                'status': 'pendente',
                'prioridade': classification['prioridade'],
                'prioridadeMotivo': classification['motivo'],
                'respostas': [],
                'createdAt': now,
                'updatedAt': now,
            }
            self.data['supportTickets'].insert(0, new_ticket)
            self._persist()

            self.log_audit({
                'userId': user_id,
                'userEmail': user_email,
                'action': 'CHAMADO_SUPORTE_ABERTO',
                'resource': 'SUPPORT_TICKETS',
                'details': f'Chamado {ticket_number} criado. Classificação interna calculada: {classification["prioridade"].upper()}',
            })
            return new_ticket

    def reply_ticket(self, ticket_id, autor_id, autor_nome, autor_role, mensagem, novo_status=None):
        with self._lock:
            ticket = next((t for t in self.data['supportTickets'] if t.get('id') == ticket_id), None)
            if not ticket:
                raise ValueError('Chamado não localizado.')

            now = now_iso()
            ticket['respostas'].append({
                'id': gen_id('resp'),
                'autorId': autor_id,
                'autorNome': autor_nome,
                'autorRole': autor_role,
                'mensagem': mensagem,
                'data': now,
            })

            if novo_status:
                ticket['status'] = novo_status
            elif autor_role == 'admin':
                ticket['status'] = 'aguardando_resposta'
            else:
                ticket['status'] = 'em_andamento'

            ticket['updatedAt'] = now
            self._persist()

            self.log_audit({
                'userId': autor_id,
                'action': 'RESPOSTA_SUPORTE',
                'resource': 'SUPPORT_TICKETS',
                'details': f'Resposta adicionada ao chamado {ticket["ticketNumber"]} por {autor_nome} ({autor_role}). Status: {ticket["status"]}',
            })
            return ticket

    def update_ticket_status(self, ticket_id, status, admin_user_id):
        with self._lock:
            ticket = next((t for t in self.data['supportTickets'] if t.get('id') == ticket_id), None)
            if not ticket:
                raise ValueError('Chamado não encontrado.')
            ticket['status'] = status
            ticket['updatedAt'] = now_iso()
            self._persist()

            self.log_audit({
                'userId': admin_user_id,
                'action': 'STATUS_CHAMADO_ALTERADO',
                'resource': 'SUPPORT_TICKETS',
                'details': f'Status do chamado {ticket["ticketNumber"]} alterado para "{status}".',
            })
            return ticket

    # ------------------------------------------------ perfis (NEXO NETWORK)
    def get_network_profiles(self):
        with self._lock:
            return [p for p in self.data['networkProfiles'] if p.get('visivel')]

    def save_network_profile(self, user_id, profile_data):
        with self._lock:
            profile = next((p for p in self.data['networkProfiles'] if p.get('userId') == user_id), None)
            now = now_iso()

            if profile:
                for field in (
                    'nomePublico', 'tipoPerfil', 'biografia', 'areaAtuacao',
                    'habilidades', 'contatoAutorizado', 'projetosPublicos', 'visivel',
                ):
                    if field in profile_data:
                        profile[field] = profile_data[field]
            else:
                profile = {
                    'id': gen_id('net'),
                    'userId': user_id,
                    'nomePublico': profile_data.get('nomePublico') or 'Membro da Comunidade NEXO',
                    'tipoPerfil': profile_data.get('tipoPerfil') or 'jovem',
                    'biografia': profile_data.get('biografia') or '',
                    'areaAtuacao': profile_data.get('areaAtuacao') or 'Inovação e Empreendedorismo',
                    'habilidades': profile_data.get('habilidades') or [],
                    'contatoAutorizado': profile_data.get('contatoAutorizado') or '',
                    'projetosPublicos': profile_data.get('projetosPublicos') or [],
                    'visivel': bool(profile_data.get('visivel', True)),
                    'createdAt': now,
                }
                self.data['networkProfiles'].append(profile)

            self._persist()
            return profile

    # ------------------------------------------------- estatísticas (admin)
    def get_platform_stats(self):
        with self._lock:
            tickets = self.data['supportTickets']
            return {
                'totalUsers': len(self.data['users']),
                'totalCompanies': len(self.data['companies']),
                'totalProjects': len(self.data['projects']),
                'totalOpportunities': len(self.data['opportunities']),
                'totalTickets': len(tickets),
                'pendingTickets': len([
                    t for t in tickets if t.get('status') in ('pendente', 'em_andamento')
                ]),
                'highPriorityTickets': len([
                    t for t in tickets if t.get('prioridade') == 'alta' and t.get('status') != 'concluido'
                ]),
                'activeUsers': len([u for u in self.data['users'] if u.get('status') == 'active']),
            }


db = Database()
