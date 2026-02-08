#!/bin/bash

# Check if node is available in the current shell
if command -v node &> /dev/null; then
    node run.js
else
    # Fallback message for Windows Bash users where node might not be in the simulated path
    echo "Error: Node.js not found in this shell."
    echo "Please run the following command directly in PowerShell or Command Prompt:"
    echo "  node run.js"
    exit 1
fi
