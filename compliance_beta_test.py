"""
CODEGUARD AI: COMPLIANCE BETA TEST SUITE
========================================
Este arquivo contém VIOLAÇÕES INTENCIONAIS para testar os detectores do CodeGuard.
Use-o para validar:
1. Detecção (Audit)
2. Auto-Fix (Smart Patch)
3. Relatórios (Export)
4. Badge de Sucesso (Ao corrigir tudo)

INSTRUÇÕES:
1. Abra este arquivo no VS Code.
2. Rode o comando "CodeGuard: Run Deep Compliance Audit".
3. Selecione TODOS os frameworks (GDPR, LGPD, ISO27001, AI Act, etc).
4. Veja a mágica acontecer!
"""
import hashlib
import logging

# ==========================================
# 1. ISO 27001 & SECURITY (Basic Hygiene)
# ==========================================

# VIOLATION: Hardcoded AWS Credentials (A.8.2)
AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

def connect_to_db():
    # VIOLATION: Weak Cryptography (MD5) (A.8.24)
    # CodeGuard should suggest moving to SHA-256
    password_hash = hashlib.md5(b"super_secret_password").hexdigest()
    
    # VIOLATION: Empty Catch Block (Swallowing Errors) (A.8.28)
    try:
        db.connect(password=password_hash)
    except Exception:
        pass 

# ==========================================
# 2. LGPD & GDPR (Data Privacy)
# ==========================================

def process_brazilian_user(user_data):
    # VIOLATION: PII Leak in Logs (Art. 46 / Art. 32)
    # CodeGuard should suggest masking or removing this log
    logging.info(f"Processing CPF: {user_data['cpf']} and Email: {user_data['email']}")
    
    # VIOLATION: Data retention without limits (Art. 15 / Art. 5)
    # CodeGuard should suggest verifying TTL or retention policy
    db.save(user_data, retention="forever")

def send_marketing_email(email):
    # VIOLATION: Missing Consent Check (Art. 7 / Art. 6)
    # CodeGuard should suggest checking 'opt_in' flag first
    mail_server.send(email, "Buy our product!")

# ==========================================
# 3. EU AI ACT (High Risk AI)
# ==========================================

class CreditScoringSystem:
    """System for automated loan approval"""
    
    def evaluate_loan(self, applicant):
        # VIOLATION: Automated Decision Making without Human Oversight (Art. 14)
        # High Risk AI System - CodeGuard should warn about Human-in-the-Loop
        if applicant.score < 500:
            return "DENIED" # Auto-rejection based on scoring
            
        # VIOLATION: Potential Bias / Lack of Explainability (Art. 13)
        if applicant.zip_code in ["12345", "67890"]:
            return "DENIED" # Redlining risk
            
        return "APPROVED"

# ==========================================
# 4. PSD2 & BACEN (Financial)
# ==========================================

def transfer_money(amount, to_account):
    # VIOLATION: Missing Strong Customer Authentication (SCA) (Art. 97)
    # CodeGuard should suggest implementing 2FA / OTP check
    if user.is_logged_in:
        bank.transfer(amount, to_account)
        
    # VIOLATION: Plaintext Credit Card Storage (PCI-DSS / PSD2)
    # CodeGuard should suggest Tokenization
    cc_number = "4111-1111-1111-1111"
    db.store_card(cc_number)

# ==========================================
# 5. HIPAA & MDR (Healthcare)
# ==========================================

def save_medical_record(patient):
    # VIOLATION: Unencrypted PHI at Rest (HIPAA §164.312)
    # CodeGuard should suggest encryption
    diagnosis = patient.diagnosis
    with open("patient_data.txt", "a") as f:
        f.write(f"{patient.name}: {diagnosis}\n")
