#!/usr/bin/env node
// CLI para criar apps com CodeGuard compliance
// Uso: npx create-codeguard-app [template] [project-directory]

const { program } = require('commander');
const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const { execSync } = require('child_process');
const { glob } = require('glob');

const TEMPLATES = ['lovable', 'vercel', 'bolt', 'nextjs', 'react'];
const TEMPLATE_NAMES = {
    lovable: 'Lovable (Supabase Edge)',
    vercel: 'Vercel (Next.js API)',
    bolt: 'Bolt (WebContainer)',
    nextjs: 'Next.js (Full Stack)',
    react: 'React (Client-only)'
};

program
    .name('create-codeguard-app')
    .description('CLI para criar apps com CodeGuard compliance')
    .version('1.0.0')
    .argument('[template]', 'Template a usar (lovable, vercel, bolt, nextjs, react)')
    .argument('[project-directory]', 'Diretório do projeto')
    .option('--ts, --typescript', 'Usar TypeScript', true)
    .option('--skip-install', 'Pular instalação de dependências')
    .option('--api-key <key>', 'CodeGuard API Key')
    .action(async (template, projectDirectory, options) => {
        console.log(chalk.cyan.bold('\n🛡️  CodeGuard App Creator\n'));

        // Prompt for template if not provided
        if (!template || !TEMPLATES.includes(template)) {
            const { selectedTemplate } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'selectedTemplate',
                    message: 'Escolha o template:',
                    choices: TEMPLATES.map(t => ({
                        name: `${TEMPLATE_NAMES[t]} (${t})`,
                        value: t
                    }))
                }
            ]);
            template = selectedTemplate;
        }

        // Prompt for project directory
        if (!projectDirectory) {
            const { dir } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'dir',
                    message: 'Nome do projeto:',
                    default: `my-codeguard-${template}`
                }
            ]);
            projectDirectory = dir;
        }

        const targetDir = path.resolve(process.cwd(), projectDirectory);

        // Check if directory exists
        if (fs.existsSync(targetDir)) {
            const { overwrite } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'overwrite',
                    message: `Diretório ${projectDirectory} existe. Sobrescrever?`,
                    default: false
                }
            ]);
            if (!overwrite) {
                console.log(chalk.yellow('Cancelado.'));
                process.exit(0);
            }
            await fs.remove(targetDir);
        }

        // Prompt for API key
        let apiKey = options.apiKey;
        if (!apiKey) {
            const { key } = await inquirer.prompt([
                {
                    type: 'password',
                    name: 'key',
                    message: 'CodeGuard API Key (obtenha em codeguard.ai):',
                    mask: '*',
                    validate: (input) => input.length > 10 || 'API key inválida (mínimo 10 caracteres)'
                }
            ]);
            apiKey = key;
        }

        // Create project
        const spinner = ora('Criando projeto...').start();

        try {
            // Copy template
            const templateDir = path.join(__dirname, '..', 'templates', template);

            if (!fs.existsSync(templateDir)) {
                spinner.fail(`Template ${template} não encontrado`);
                process.exit(1);
            }

            await fs.copy(templateDir, targetDir);

            // Replace variables in files
            const patterns = [
                '**/*.ts',
                '**/*.tsx',
                '**/*.js',
                '**/*.jsx',
                '**/*.json',
                '**/*.md',
                '**/*.env*',
                '**/*.toml'
            ];

            for (const pattern of patterns) {
                const files = await glob(pattern, {
                    cwd: targetDir,
                    absolute: true,
                    ignore: ['**/node_modules/**']
                });

                for (const file of files) {
                    try {
                        let content = await fs.readFile(file, 'utf-8');
                        content = content
                            .replace(/\{\{PROJECT_NAME\}\}/g, projectDirectory)
                            .replace(/\{\{API_KEY\}\}/g, apiKey)
                            .replace(/\{\{TEMPLATE\}\}/g, template)
                            .replace(/YOUR_API_KEY_HERE/g, apiKey);
                        await fs.writeFile(file, content);
                    } catch (e) {
                        // Skip binary files
                    }
                }
            }

            // Rename .env.example to .env if exists
            const envExample = path.join(targetDir, '.env.example');
            const envFile = path.join(targetDir, '.env');
            if (await fs.pathExists(envExample)) {
                let envContent = await fs.readFile(envExample, 'utf-8');
                envContent = envContent.replace('YOUR_API_KEY_HERE', apiKey);
                await fs.writeFile(envFile, envContent);
                await fs.remove(envExample);
            }

            // Create .env if it doesn't exist
            if (!(await fs.pathExists(envFile))) {
                const envContent = `# CodeGuard Configuration
CODEGUARD_API_KEY=${apiKey}
${template === 'lovable' ? 'SUPABASE_URL=your_supabase_url\nSUPABASE_ANON_KEY=your_anon_key' : ''}
`;
                await fs.writeFile(envFile, envContent);
            }

            spinner.succeed('Projeto criado!');

            // Install dependencies
            if (!options.skipInstall) {
                const installSpinner = ora('Instalando dependências...').start();
                try {
                    // Check if package.json exists
                    const pkgPath = path.join(targetDir, 'package.json');
                    if (await fs.pathExists(pkgPath)) {
                        execSync('npm install', { cwd: targetDir, stdio: 'pipe' });
                        installSpinner.succeed('Dependências instaladas!');
                    } else {
                        installSpinner.info('Sem package.json - pulando instalação');
                    }
                } catch (error) {
                    installSpinner.fail('Falha ao instalar dependências');
                    console.log(chalk.yellow('Execute npm install manualmente'));
                }
            }

            // Print final instructions
            console.log(chalk.green.bold('\n✅ Projeto criado com sucesso!\n'));
            console.log(chalk.white('Próximos passos:'));
            console.log(chalk.gray(`  cd ${projectDirectory}`));

            if (template === 'lovable') {
                console.log(chalk.gray('  supabase link --project-ref <your-ref>'));
                console.log(chalk.gray('  supabase secrets set CODEGUARD_API_KEY=<your-key>'));
                console.log(chalk.gray('  supabase functions deploy codeguard-scan'));
            } else if (template === 'vercel' || template === 'nextjs') {
                console.log(chalk.gray('  npm run dev'));
                console.log(chalk.gray('  # Para deploy:'));
                console.log(chalk.gray('  vercel --prod'));
            } else if (template === 'bolt') {
                console.log(chalk.gray('  npm run dev'));
            }

            console.log(chalk.cyan(`\n📖 Documentação: https://docs.codeguard.ai/${template}`));
            console.log(chalk.cyan('💬 Suporte: https://discord.gg/codeguard'));
            console.log(chalk.cyan('🐛 Issues: https://github.com/codeguard/starter/issues\n'));

        } catch (error) {
            spinner.fail('Erro ao criar projeto');
            console.error(chalk.red(error));
            process.exit(1);
        }
    });

program.parse();
