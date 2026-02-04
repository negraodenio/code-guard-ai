export class Database {
    users = {
        insert: (user: any) => { console.log('Inserting', user); return true; }
    }
}
const db = new Database();

// userService.ts - CÓDIGO PROPOSITALMENTE RUIM
export function createUser(data: any) {
    // ❌ DEVE SER BLOQUEADO: PII sem hash, log exposto, variável implícita
    console.log("CPF do usuário:", data.cpf);

    const user = {
        name: data.name,
        email: data.email,
        cpf: data.cpf, // ❌ LGPD: CPF em texto puro
        password: data.password // ❌ CRÍTICO: Senha sendo logada/processada
    };

    return db.users.insert(user);
}
