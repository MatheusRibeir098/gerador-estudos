#!/bin/bash
# setup.sh — Cria sessão tmux com panes de dev + reviewers + tester + documenter
# Gerado pelo Orchestrator. NÃO editar manualmente.
# O run.sh deve ser executado em um TERMINAL SEPARADO, fora do tmux.
set -euo pipefail

PROJECT_DIR="/home/matheus/multi-agents-framework/gerador-estudos"
TASKS_FILE="$PROJECT_DIR/orchestration/tasks.json"
SESSION="gerador-estudos"
INIT_TIMEOUT=120
NUM_REVIEWERS=4
HAS_TESTER=true    # true ou false
HAS_DOCUMENTER=false  # true ou false

tmux kill-session -t "$SESSION" 2>/dev/null || true

PANE_COUNT=$(jq '.panes | length' "$TASKS_FILE")
EXTRA=0
[ "$HAS_TESTER" = true ] && EXTRA=$((EXTRA + 1))
[ "$HAS_DOCUMENTER" = true ] && EXTRA=$((EXTRA + 1))
TOTAL_PANES=$((PANE_COUNT + NUM_REVIEWERS + EXTRA))
echo "=== Setup: $PANE_COUNT dev + $NUM_REVIEWERS reviewers + tester=$HAS_TESTER + documenter=$HAS_DOCUMENTER ($TOTAL_PANES panes) ==="

tmux new-session -d -s "$SESSION" -x 350 -y 80

# Layout: 3 colunas de N panes cada
# Calcular quantos panes por coluna
COLS=3
PER_COL=$(( (TOTAL_PANES + COLS - 1) / COLS ))

# Criar colunas
tmux split-window -h -t "$SESSION:0.0" -l 66%
tmux split-window -h -t "$SESSION:0.1" -l 50%

# Split cada coluna em PER_COL panes
for col in 0 1 2; do
  base=$((col * PER_COL))
  for i in $(seq 1 $((PER_COL - 1))); do
    target=$((base + i - 1))
    remaining=$((PER_COL - i))
    pct=$((100 * remaining / (remaining + 1)))
    [ "$pct" -lt 20 ] && pct=50
    tmux split-window -v -t "$SESSION:0.$target" -l "${pct}%" 2>/dev/null || true
  done
done

# Logs
LOGDIR="$PROJECT_DIR/orchestration/logs"
mkdir -p "$LOGDIR"

# Dev panes (0..PANE_COUNT-1)
for i in $(seq 1 "$PANE_COUNT"); do
  NOME=$(jq -r ".panes.\"$i\".nome" "$TASKS_FILE")
  tmux send-keys -t "$SESSION:0.$((i-1))" "cd $PROJECT_DIR && kiro-cli chat --trust-all-tools --legacy-ui --agent pane-$i" Enter
  echo "  Pane $((i-1)) ($NOME): --agent pane-$i"
done

# Reviewers (PANE_COUNT..PANE_COUNT+NUM_REVIEWERS-1)
for r in $(seq 1 "$NUM_REVIEWERS"); do
  P=$((PANE_COUNT + r - 1))
  tmux send-keys -t "$SESSION:0.$P" "cd $PROJECT_DIR && kiro-cli chat --trust-all-tools --legacy-ui --agent reviewer" Enter
  echo "  Pane $P (reviewer-$r): --agent reviewer"
done

# Tester e Documenter (últimos panes)
NEXT_P=$((PANE_COUNT + NUM_REVIEWERS))
if [ "$HAS_TESTER" = true ]; then
  tmux send-keys -t "$SESSION:0.$NEXT_P" "cd $PROJECT_DIR && kiro-cli chat --trust-all-tools --legacy-ui --agent tester" Enter
  echo "  Pane $NEXT_P (tester): --agent tester"
  NEXT_P=$((NEXT_P + 1))
fi
if [ "$HAS_DOCUMENTER" = true ]; then
  tmux send-keys -t "$SESSION:0.$NEXT_P" "cd $PROJECT_DIR && kiro-cli chat --trust-all-tools --legacy-ui --agent documenter" Enter
  echo "  Pane $NEXT_P (documenter): --agent documenter"
fi

# Ativar logs pra todos os panes
for i in $(seq 0 "$((TOTAL_PANES - 1))"); do
  tmux pipe-pane -t "$SESSION:0.$i" -o "cat >> $LOGDIR/pane-$i.log"
done
echo "  📝 Logs em $LOGDIR/"

echo ""
echo "Aguardando panes ficarem prontos..."
ELAPSED=0
declare -A READY
for i in $(seq 0 "$((TOTAL_PANES - 1))"); do READY[$i]=false; done

while [ $ELAPSED -lt $INIT_TIMEOUT ]; do
  ALL_READY=true
  for i in $(seq 0 "$((TOTAL_PANES - 1))"); do
    if [ "${READY[$i]}" = false ]; then
      if tmux capture-pane -t "$SESSION:0.$i" -p 2>/dev/null | grep -v '^$' | tail -1 | grep -q '!>'; then
        READY[$i]=true
        echo "  ✅ Pane $i pronto [${ELAPSED}s]"
      else
        ALL_READY=false
      fi
    fi
  done
  if [ "$ALL_READY" = true ]; then
    echo ""
    echo "=== Todos prontos! ==="
    echo "Ver:    tmux attach -t $SESSION"
    echo "Rodar:  bash $PROJECT_DIR/run.sh   (em outro terminal, FORA do tmux)"
    exit 0
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

echo "⚠️ Timeout ($INIT_TIMEOUT s)"
exit 1
