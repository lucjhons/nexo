"""Utilidades criptográficas do NEXO.

Formatos compatíveis com o back-end Node/Express original, para que o
banco de dados existente (data/nexo_database.json) continue funcionando:

- Senhas ......... "salt:iteracoes:hash" (PBKDF2-HMAC-SHA512, 64 bytes)
- Dados sensíveis . "iv:tag:ciphertext" (AES-256-GCM, chave derivada via scrypt)
"""
import hashlib
import hmac
import os
import secrets

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_SALT = b'nexo-salt-salt'
PBKDF2_ITERATIONS = 100_000


def _derive_key() -> bytes:
    """Deriva a chave AES-256 a partir do segredo configurado (scrypt, como no Node)."""
    material = os.environ.get('DATA_ENCRYPTION_KEY') or 'nexo-secure-system-key-2026-default'
    return hashlib.scrypt(
        material.encode('utf-8'),
        salt=_SALT,
        n=16384,
        r=8,
        p=1,
        dklen=32,
        maxmem=64 * 1024 * 1024,
    )


def hash_password(password: str) -> str:
    """Gera o hash PBKDF2-SHA512 com salt único por senha.

    Observação de compatibilidade com o Node: o salt é guardado como string
    hex e o PBKDF2 usa os BYTES UTF-8 dessa string (o Node não decodifica o
    hex do salt ao chamar pbkdf2Sync com uma string).
    """
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        'sha512', password.encode('utf-8'), salt.encode('utf-8'), PBKDF2_ITERATIONS, dklen=64
    ).hex()
    return f'{salt}:{PBKDF2_ITERATIONS}:{digest}'


def verify_password(password: str, stored_hash: str) -> bool:
    """Verifica a senha com comparação em tempo constante."""
    try:
        salt, iterations, digest = stored_hash.split(':')
        candidate = hashlib.pbkdf2_hmac(
            'sha512', password.encode('utf-8'), salt.encode('utf-8'), int(iterations), dklen=64
        ).hex()
        return hmac.compare_digest(digest, candidate)
    except Exception:
        return False


def encrypt_sensitive_data(text: str) -> str:
    """Cifra campos sensíveis (CPF, documentos) com AES-256-GCM."""
    if not text:
        return ''
    key = _derive_key()
    iv = secrets.token_bytes(12)
    ct_with_tag = AESGCM(key).encrypt(iv, text.encode('utf-8'), None)
    ciphertext, tag = ct_with_tag[:-16], ct_with_tag[-16:]
    return f'{iv.hex()}:{tag.hex()}:{ciphertext.hex()}'


def decrypt_sensitive_data(payload: str) -> str:
    """Decifra campos sensíveis; nunca expõe o erro interno."""
    if not payload:
        return ''
    try:
        iv_hex, tag_hex, ct_hex = payload.split(':')
        if not iv_hex or not tag_hex or not ct_hex:
            return ''
        key = _derive_key()
        plain = AESGCM(key).decrypt(
            bytes.fromhex(iv_hex), bytes.fromhex(ct_hex) + bytes.fromhex(tag_hex), None
        )
        return plain.decode('utf-8')
    except Exception:
        return '[DADO PROTEGIDO]'


def mask_cpf(cpf: str) -> str:
    """Mascara o CPF para exibição (ex.: ***.***.789-00)."""
    if not cpf:
        return ''
    clean = ''.join(ch for ch in cpf if ch.isdigit())
    if len(clean) != 11:
        return '***.***.***-**'
    return f'***.***.{clean[6:9]}-{clean[9:11]}'


def hash_code(code: str) -> str:
    """Hash SHA-256 do código de recuperação (nunca guardado em texto puro)."""
    return hashlib.sha256(code.encode('utf-8')).hexdigest()


def generate_verification_code() -> str:
    """Código numérico de 6 dígitos criptograficamente seguro."""
    return str(secrets.randbelow(900_000) + 100_000)


def generate_session_token() -> str:
    """Token de sessão aleatório (Bearer)."""
    return secrets.token_hex(32)
