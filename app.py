"""NEXO — Plataforma (motor de back-end em Flask).

O Flask é um microframework web escrito em Python, projetado para ser
leve, simples e direto ao ponto. Ele serve como o motor de back-end que
conecta a lógica do sistema (backend/) com a interface React que
aparece no navegador do usuário (dist/).

Como rodar:
    py -m pip install -r requirements.txt   (uma vez)
    npm run build                            (gera dist/ — já incluído)
    py app.py                                (sobe em http://localhost:3000)
"""
import os

from flask import Flask, jsonify, request, send_from_directory
from werkzeug.exceptions import NotFound

from backend.routes import api_bp

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, 'dist')

BUILD_INSTRUCTIONS = """<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>NEXO — build do front-end necessário</title>
<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.box{max-width:560px;padding:32px;border:1px solid #334155;border-radius:12px;background:#1e293b}
code{background:#334155;padding:2px 8px;border-radius:6px}</style></head>
<body><div class="box">
<h1>NEXO</h1>
<p>O back-end Flask est&aacute; operacional, mas a pasta <code>dist/</code> (front-end compilado) ainda n&atilde;o foi encontrada.</p>
<p>Para gerar a interface, execute na raiz do projeto:</p>
<p><code>npm install</code> &nbsp;&rarr;&nbsp; <code>npm run build</code></p>
<p>Depois reinicie o servidor com <code>py app.py</code>.</p>
</div></body></html>"""


def create_app() -> Flask:
    app = Flask(__name__, static_folder=None)
    app.json.sort_keys = False
    app.json.ensure_ascii = False

    # Motor de back-end: todas as rotas de API em /api/*
    app.register_blueprint(api_bp, url_prefix='/api')

    @app.after_request
    def security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        return response

    @app.errorhandler(404)
    def not_found(_err):
        if request.path.startswith('/api/'):
            return jsonify(error='Endpoint não encontrado.'), 404
        return send_spa(request.path)

    @app.errorhandler(405)
    def method_not_allowed(_err):
        return jsonify(error='Método não permitido para este endpoint.'), 405

    @app.errorhandler(Exception)
    def handle_exception(err):
        from werkzeug.exceptions import HTTPException

        if request.path.startswith('/api/'):
            if isinstance(err, HTTPException):
                return jsonify(error=err.description), err.code
            print(f'[NEXO API ERROR] {err}')
            return jsonify(error='Erro interno do servidor.'), 500
        raise err

    def send_spa(path: str = ''):
        """Serve o front-end compilado com fallback de SPA (como o Express fazia)."""
        index_html = os.path.join(DIST_DIR, 'index.html')
        if not os.path.isfile(index_html):
            return BUILD_INSTRUCTIONS, 200, {'Content-Type': 'text/html; charset=utf-8'}
        if path:
            try:
                return send_from_directory(DIST_DIR, path)
            except NotFound:
                pass  # rota da SPA → devolve o index.html
        return send_from_directory(DIST_DIR, 'index.html')

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def spa(path):
        return send_spa(path)

    return app


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '3000'))
    app = create_app()
    print('[NEXO PLATAFORMA] Motor de back-end Flask iniciando na porta', port)
    print('[NEXO PLATAFORMA] Slogan: "Conectando ideias, negócios e oportunidades."')
    app.run(host='0.0.0.0', port=port, threaded=True)
