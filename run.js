const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const isWin = process.platform === 'win32';

const colors = {
    reset: '\x1b[0m',
    blue: '\x1b[34m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    magenta: '\x1b[35m'
};

function log(msg, color = 'blue') {
    console.log(`${colors[color]}>>> ${msg}${colors.reset}`);
}

function error(msg) {
    console.error(`${colors.red}>>> Error: ${msg}${colors.reset}`);
    process.exit(1);
}

// --- Helpers ---

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function deletePathWithRetry(p, retries = 3) {
    if (!fs.existsSync(p)) return;

    for (let i = 0; i < retries; i++) {
        try {
            fs.rmSync(p, { recursive: true, force: true });
            log(`Removed ${p}`, 'green');
            return;
        } catch (e) {
            if (i === retries - 1) {
                log(`Warning: Failed to remove ${p}: ${e.message}`, 'yellow'); // Soft warning
            } else {
                await sleep(1000); // Wait 1s and retry
            }
        }
    }
}

function runQuietly(command, message) {
    process.stdout.write(`${colors.cyan}>>> ${message}... ${colors.reset}`);
    const spinner = ['|', '/', '-', '\\'];
    let i = 0;

    const interval = setInterval(() => {
        process.stdout.write(`\r${colors.cyan}>>> ${message}... ${spinner[i++ % 4]}${colors.reset}`);
    }, 100);

    try {
        execSync(command, { stdio: 'pipe' }); // Pipe stdio to hide it
        clearInterval(interval);
        process.stdout.write(`\r${colors.green}>>> ${message}... DONE!${colors.reset}\n`);
    } catch (e) {
        clearInterval(interval);
        process.stdout.write(`\r${colors.red}>>> ${message}... FAILED!${colors.reset}\n`);
        console.error(e.stderr ? e.stderr.toString() : e.message);
        process.exit(1);
    }
}

// --- Port Cleanup (Run First) ---
// --- Port Cleanup (Run First) ---
// Moved inside async wrapper below

// --- Arguments Check ---
const args = process.argv.slice(2);
const isClean = args.includes('--clean');

// --- User Config ---
const PYTHON_OVERRIDE = null; // Set to specific path like 'C:\\Python311\\python.exe' to force a version
// -------------------

// Need to wrap in async for sleep
(async () => {

    // --- Port Cleanup (Run First) ---
    freePort(5000);
    freePort(5173);

    if (isClean) {
        log('CLEANUP MODE: Removing artifacts...', 'magenta');

        const pathsToRemove = [
            path.join(__dirname, 'backend', '.venv'),
            path.join(__dirname, 'backend', '__pycache__'),
            path.join(__dirname, 'frontend', 'node_modules'),
            path.join(__dirname, 'frontend', 'dist')
        ];

        for (const p of pathsToRemove) {
            await deletePathWithRetry(p);
            if (fs.existsSync(p)) {
                error(`Failed to remove ${p}. Please manually delete it or close any programs using it.`);
            }
        }

        log('Cleanup complete. Proceeding with fresh setup...', 'green');
    }

    // --- Volta Check ---
    try {
        execSync('volta --version', { stdio: 'ignore' });
        log('Volta detected. Ensuring Node 22 is active...', 'cyan');
        try {
            execSync('volta install node@22', { stdio: 'inherit', shell: true });
        } catch (e) {
            log('Warning: Failed to install node@22 via volta. Proceeding anyway...', 'yellow');
        }
    } catch (e) {
        // Volta not found, ignore
    }

    // --- Port Cleanup ---
    function freePort(port) {
        log(`Checking port ${port}...`, 'cyan');
        try {
            let pids = [];
            if (isWin) {
                try {
                    const stdout = execSync(`netstat -ano | findstr :${port}`, { stdio: 'pipe' }).toString();
                    const lines = stdout.split('\n');
                    lines.forEach(line => {
                        const parts = line.trim().split(/\s+/);
                        if (parts.length > 4) {
                            const pid = parts[parts.length - 1]; // PID is the last column
                            if (pid && !isNaN(pid) && pid !== '0') {
                                pids.push(pid);
                            }
                        }
                    });
                } catch (e) {
                    // netstat returns exit code 1 if nothing found, which is fine
                }
            } else {
                try {
                    const stdout = execSync(`lsof -i :${port} -t`, { stdio: 'pipe' }).toString();
                    pids = stdout.trim().split('\n').filter(pid => pid);
                } catch (e) {
                    // lsof returns exit code 1 if nothing found
                }
            }

            if (pids.length > 0) {
                // Remove duplicates
                pids = [...new Set(pids)];
                log(`Freeing port ${port} (killing PIDs: ${pids.join(', ')})...`, 'yellow');
                pids.forEach(pid => {
                    try {
                        if (isWin) {
                            execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
                        } else {
                            execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
                        }
                    } catch (e) {
                        // Ignore errors if process already gone
                    }
                });
            }
        } catch (e) {
            // General error handling
            log(`Warning: Failed to cleanup port ${port}: ${e.message}`, 'red');
        }
    }

    // --- Prerequisites Check ---

    log('Checking prerequisites...', 'cyan');

    // Check Node.js version
    const nodeVersion = parseInt(process.versions.node.split('.')[0]);
    if (nodeVersion < 22) {
        error(`Node.js v22+ is required. Current version: ${process.version}`);
    }

    // Check Python
    let pythonCmd = PYTHON_OVERRIDE || 'python3';

    if (PYTHON_OVERRIDE) {
        log(`Using Python Override: ${PYTHON_OVERRIDE}`, 'yellow');
    } else if (isWin) {
        try {
            execSync('python --version', { stdio: 'ignore' });
            pythonCmd = 'python';
        } catch (e) {
            try {
                execSync('py --version', { stdio: 'ignore' });
                pythonCmd = 'py';
            } catch (e2) {
                // Try python3 fallback
                try {
                    execSync('python3 --version', { stdio: 'ignore' });
                    pythonCmd = 'python3';
                } catch (e3) {
                    error('Python is not installed. Please install Python 3.12+.');
                }
            }
        }
    } else {
        try {
            execSync('python3 --version', { stdio: 'ignore' });
            pythonCmd = 'python3';
        } catch (e) {
            try {
                execSync('python --version', { stdio: 'ignore' });
                pythonCmd = 'python';
            } catch (e2) {
                error('Python is not installed. Please install Python 3.12+.');
            }
        }
    }

    log(`Using Python: ${pythonCmd}`, 'green');

    // --- Cleanup Ports ---
    // moved to top


    // --- Backend Setup ---
    const backendDir = path.join(__dirname, 'backend');
    if (!fs.existsSync(backendDir)) {
        error('Backend directory not found!');
    }

    log('Setting up Backend...', 'cyan');
    process.chdir(backendDir);

    // Venv Setup
    const venvName = '.venv';
    const venvPath = path.join(backendDir, venvName);

    if (!fs.existsSync(venvPath)) {
        log('Creating virtual environment...', 'yellow');
        try {
            execSync(`${pythonCmd} -m venv ${venvName}`, { stdio: 'inherit' });
        } catch (e) {
            error('Failed to create virtual environment.');
        }
    }

    // Determine python executable in venv
    let venvPython = '';
    if (isWin) {
        venvPython = path.join(venvPath, 'Scripts', 'python.exe');
    } else {
        venvPython = path.join(venvPath, 'bin', 'python');
    }

    // Fallback if Scripts vs bin is different on some Windows setups (e.g. msys)
    if (isWin && !fs.existsSync(venvPython)) {
        if (fs.existsSync(path.join(venvPath, 'bin', 'python'))) {
            venvPython = path.join(venvPath, 'bin', 'python');
        }
    }

    if (!fs.existsSync(venvPython)) {
        error(`Virtual environment python not found at ${venvPython}`);
    }

    // Install Requirements
    // Install Requirements
    // Install Requirements
    log(`Installing backend requirements using: ${venvPython}`, 'yellow');
    runQuietly(`"${venvPython}" -m pip install -r requirements.txt`, 'Installing Python dependencies');

    // .env creation
    if (!fs.existsSync('.env')) {
        log('Creating backend .env file...', 'yellow');
        const envContent = `MONGO_URI=mongodb+srv://...\nGEMINI_API_KEY=your_key_here\nCLIENT_URL=http://localhost:5173\n`;
        fs.writeFileSync('.env', envContent);
    } else {
        // Optional: Warn if using default values?
        const content = fs.readFileSync('.env', 'utf-8');
        if (content.includes('mongodb+srv://...')) {
            log('WARNING: backend/.env seems to have default values. Please configure it.', 'red');
        }
    }

    process.chdir(__dirname);

    // --- Frontend Setup ---
    const frontendDir = path.join(__dirname, 'frontend');
    if (!fs.existsSync(frontendDir)) {
        error('Frontend directory not found!');
    }

    log('Setting up Frontend...', 'cyan');
    process.chdir(frontendDir);

    if (!fs.existsSync('node_modules') || isClean) {
        log('Installing frontend dependencies...', 'yellow');
        runQuietly('npm install', 'Installing Node modules');
    }

    if (!fs.existsSync('.env')) {
        log('Creating frontend .env file...', 'yellow');
        fs.writeFileSync('.env', 'VITE_API_URL=http://localhost:5000\n');
    }

    process.chdir(__dirname);

    // --- Run Both ---

    log('Starting Both Services...', 'magenta');

    // Prepare backend environment (simulate activation)
    const backendEnv = { ...process.env, PYTHONUNBUFFERED: '1', VIRTUAL_ENV: venvPath };
    // Prepend venv scripts to PATH
    const venvScripts = isWin ? path.dirname(venvPython) : path.join(venvPath, 'bin');
    backendEnv.PATH = venvScripts + path.delimiter + (backendEnv.PATH || '');

    // Execute with quoted path to handle spaces if shell: true
    const backendCommand = `"${venvPython}"`;

    const backend = spawn(backendCommand, ['app.py'], {
        cwd: backendDir,
        shell: true,
        env: backendEnv
    });

    // --- Success Banner ---
    console.log('\n' + colors.green + '='.repeat(50));
    console.log('   Running Successfully!');
    console.log('-'.repeat(50));
    console.log(`Frontend: http://localhost:5173`);
    console.log(`Backend:  http://localhost:5000`);
    console.log('='.repeat(50) + colors.reset + '\n');

    const frontend = spawn('npm', ['run', 'dev'], {
        cwd: frontendDir,
        shell: true,
        stdio: 'pipe'
    });

    // Helper to prefix output
    function pipeOutput(name, stream, color) {
        if (!stream) return;
        stream.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    console.log(`${colors[color]}[${name}]${colors.reset} ${line}`);
                }
            });
        });
    }

    pipeOutput('Backend', backend.stdout, 'blue');
    pipeOutput('Backend', backend.stderr, 'red');

    pipeOutput('Frontend', frontend.stdout, 'green');
    pipeOutput('Frontend', frontend.stderr, 'yellow');

    // Handle exit
    let shuttingDown = false;
    function cleanup() {
        if (shuttingDown) return;
        shuttingDown = true;
        log('Shutting down...', 'magenta');

        // Attempt graceful kill
        backend.kill();
        frontend.kill();

        // Force exit after a moment
        setTimeout(() => process.exit(0), 1000);
    }

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    backend.on('close', (code) => {
        if (!shuttingDown) log(`Backend exited with code ${code}`, 'red');
        cleanup();
    });

    frontend.on('close', (code) => {
        if (!shuttingDown) log(`Frontend exited with code ${code}`, 'red');
        cleanup();
    });

})(); // End async wrapper
