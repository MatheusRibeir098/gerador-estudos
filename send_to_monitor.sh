#!/usr/bin/env bash
# Uso: bash send_to_monitor.sh "sua mensagem aqui"
SESSION="fix-gerador-estudos"
MSG="$1"
HOOK="

---
⚠️ REGRA DO SISTEMA: Você é o MONITOR. NÃO escreve código, NÃO cria/edita arquivos, NÃO executa comandos que alteram o projeto. Sua única ação permitida é: ler arquivos → montar briefing → enviar ao dev via tmux send-keys (pane $SESSION:0.2)."
tmux send-keys -t "$SESSION:0.1" "" Enter
sleep 0.5
tmux send-keys -t "$SESSION:0.1" "" Enter
sleep 0.5
tmux send-keys -t "$SESSION:0.1" "${MSG}${HOOK}" Enter
