#!/bin/bash
set -euo pipefail

# === Configuração ===
LINKS_FILE="${1:?Uso: bash estudar.sh <arquivo-de-links.txt>}"
OUTPUT_DIR="/mnt/c/Users/Dati - 166/Documents/estudos"
BACKEND_DIR="$(cd "$(dirname "$0")/backend" && pwd)"
TEMP_DIR="/tmp/studygen"
MAX_CHARS=40000  # Limite de chars da transcrição por prompt

mkdir -p "$OUTPUT_DIR" "$TEMP_DIR"

extract_id() {
  echo "$1" | tr -d '\r' | sed -E 's|.*youtu\.be/||;s|.*[?&]v=||;s|[&?].*||'
}

transcribe() {
  local vid="$1" out="$2"
  cd "$BACKEND_DIR"
  npx tsx -e "
    const yt = require('youtube-transcript');
    const YT = yt.YoutubeTranscript;
    (async () => {
      const segs = await YT.fetchTranscript('$vid', { lang: 'pt' });
      process.stdout.write(segs.map((s: any) => s.text).join(' '));
    })();
  " > "$out" 2>/dev/null
}

# Chama kiro-cli lendo prompt de arquivo (evita limite de args)
ask_kiro() {
  local prompt_file="$1" outfile="$2"
  local prompt
  prompt=$(cat "$prompt_file")
  timeout 300 kiro-cli chat --no-interactive "$prompt" 2>/dev/null \
    | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g; s/\x1b\[[?][0-9]*[a-zA-Z]//g' \
    | sed '/^[[:space:]]*$/d; /▸ Time:/d; /^> /d' \
    > "$outfile" || true
}

# Trunca transcrição se muito longa
truncate_trans() {
  local file="$1"
  local chars
  chars=$(wc -c < "$file")
  if [ "$chars" -gt "$MAX_CHARS" ]; then
    head -c "$MAX_CHARS" "$file" > "${file}.tmp"
    mv "${file}.tmp" "$file"
    echo "(truncado de ${chars} para ${MAX_CHARS} chars)"
  fi
}

echo "📚 Gerador de Material de Estudo — Estatística"
echo "================================================"
echo ""

mapfile -t LINKS < <(tr -d '\r' < "$LINKS_FILE" | grep -v '^$' | grep -v '^#')
TOTAL=${#LINKS[@]}
echo "📋 $TOTAL vídeos encontrados"
echo "📂 Saída: $OUTPUT_DIR"
echo ""

# === Fase 1: Transcrever ===
echo "🎙️  FASE 1: Transcrevendo vídeos..."
echo ""

for i in "${!LINKS[@]}"; do
  N=$((i + 1))
  VID=$(extract_id "${LINKS[$i]}")
  TRANS_FILE="$TEMP_DIR/trans_${N}.txt"

  if [ -f "$TRANS_FILE" ] && [ -s "$TRANS_FILE" ]; then
    CHARS=$(wc -c < "$TRANS_FILE")
    echo "  [$N/$TOTAL] ✅ $VID (cache, ${CHARS} chars)"
  else
    echo -n "  [$N/$TOTAL] 🎙️  $VID ... "
    if transcribe "$VID" "$TRANS_FILE"; then
      CHARS=$(wc -c < "$TRANS_FILE")
      echo "OK (${CHARS} chars)"
    else
      echo "❌ FALHOU"
      echo "(sem transcrição)" > "$TRANS_FILE"
    fi
  fi
done

# === Fase 2: Gerar material por vídeo ===
echo ""
echo "🤖 FASE 2: Gerando material com Kiro CLI..."
echo "   (cada vídeo leva ~2-5 min, total estimado: ~30-60 min)"
echo ""

for i in "${!LINKS[@]}"; do
  N=$((i + 1))
  VID=$(extract_id "${LINKS[$i]}")
  TRANS_FILE="$TEMP_DIR/trans_${N}.txt"
  VIDEO_DIR="$OUTPUT_DIR/video-${N}"
  PROMPT_FILE="$TEMP_DIR/prompt_${N}.txt"
  mkdir -p "$VIDEO_DIR"

  CHARS=$(wc -c < "$TRANS_FILE")
  if [ "$CHARS" -lt 100 ]; then
    echo "  [$N/$TOTAL] ⏭️  Pulando (transcrição muito curta)"
    continue
  fi

  # Copiar transcrição truncada pra uso nos prompts
  cp "$TRANS_FILE" "$TEMP_DIR/work_${N}.txt"
  truncate_trans "$TEMP_DIR/work_${N}.txt"
  TRANS=$(cat "$TEMP_DIR/work_${N}.txt")

  # Resumo
  if [ ! -f "$VIDEO_DIR/resumo.md" ]; then
    echo -n "  [$N/$TOTAL] 📝 Resumo... "
    cat > "$PROMPT_FILE" <<PROMPT
Você é um assistente educacional. Gere um resumo estruturado em Markdown da seguinte aula. Use títulos, subtítulos, bullet points. Destaque conceitos-chave em negrito. Responda APENAS com o markdown do resumo, sem explicações extras.

Transcrição:
$TRANS
PROMPT
    ask_kiro "$PROMPT_FILE" "$VIDEO_DIR/resumo.md"
    echo "✅"
  else
    echo "  [$N/$TOTAL] 📝 Resumo (já existe)"
  fi

  # Quiz
  if [ ! -f "$VIDEO_DIR/quiz.md" ]; then
    echo -n "  [$N/$TOTAL] ❓ Quiz... "
    cat > "$PROMPT_FILE" <<PROMPT
Você é um assistente educacional. Com base na transcrição da aula abaixo, gere 10 perguntas de múltipla escolha (4 alternativas cada) em Markdown. Varie a dificuldade (fácil, médio, difícil). Para cada pergunta inclua: a pergunta, as 4 alternativas (A, B, C, D), a resposta correta, e uma explicação. Formato:

## Pergunta 1 (Fácil)
**Pergunta:** ...
- A) ...
- B) ...
- C) ...
- D) ...
**Resposta:** X
**Explicação:** ...

Responda APENAS com o markdown.

Transcrição:
$TRANS
PROMPT
    ask_kiro "$PROMPT_FILE" "$VIDEO_DIR/quiz.md"
    echo "✅"
  else
    echo "  [$N/$TOTAL] ❓ Quiz (já existe)"
  fi

  # Radar de prova
  if [ ! -f "$VIDEO_DIR/radar-prova.md" ]; then
    echo -n "  [$N/$TOTAL] 🎯 Radar de prova... "
    cat > "$PROMPT_FILE" <<PROMPT
Você é um assistente educacional especializado em identificar o que cairá na prova. Analise a transcrição e identifique momentos em que o professor:
- Disse explicitamente que algo cairá na prova
- Repetiu um tópico várias vezes com ênfase
- Usou frases como 'prestem atenção', 'isso é importante', 'não esqueçam'
- Deu exemplos que parecem ser do tipo cobrado em avaliação

Para cada item encontrado, liste:
## Tópico
- **Relevância:** Alta/Média/Baixa
- **Citação do professor:** (frase exata ou aproximada)
- **Por que pode cair na prova:** (explicação)

Responda APENAS com o markdown.

Transcrição:
$TRANS
PROMPT
    ask_kiro "$PROMPT_FILE" "$VIDEO_DIR/radar-prova.md"
    echo "✅"
  else
    echo "  [$N/$TOTAL] 🎯 Radar (já existe)"
  fi

  echo "  [$N/$TOTAL] ✅ Vídeo $N concluído!"
  echo ""
done

# === Fase 3: Plano de estudos ===
echo "📋 FASE 3: Gerando plano de estudos consolidado..."

RESUMOS=""
for i in "${!LINKS[@]}"; do
  N=$((i + 1))
  VIDEO_DIR="$OUTPUT_DIR/video-${N}"
  if [ -f "$VIDEO_DIR/resumo.md" ]; then
    RESUMOS="$RESUMOS
### Aula $N
$(head -c 3000 "$VIDEO_DIR/resumo.md")
"
  fi
done

PROMPT_FILE="$TEMP_DIR/prompt_plano.txt"
cat > "$PROMPT_FILE" <<PROMPT
Você é um assistente educacional. Com base nos resumos de todas as aulas de Estatística abaixo, crie um plano de estudos completo em Markdown. O plano deve:
- Organizar os tópicos em ordem lógica de aprendizado
- Sugerir tempo estimado por tópico
- Indicar pré-requisitos entre tópicos
- Dar dicas de estudo para cada seção
- Incluir um cronograma sugerido (semana 1, semana 2...)

Responda APENAS com o markdown do plano.

Resumos das aulas:
$RESUMOS
PROMPT

ask_kiro "$PROMPT_FILE" "$OUTPUT_DIR/plano-de-estudos.md"

echo ""
echo "✅ ============================================"
echo "✅ Material gerado com sucesso!"
echo "✅ ============================================"
echo ""
echo "📂 Pasta: $OUTPUT_DIR"
echo ""
for i in "${!LINKS[@]}"; do
  N=$((i + 1))
  echo "  📁 video-$N/"
  ls "$OUTPUT_DIR/video-${N}/" 2>/dev/null | sed 's/^/     /'
done
echo "  📄 plano-de-estudos.md"
echo ""
echo "Abra a pasta no Windows: explorer.exe '$(wslpath -w "$OUTPUT_DIR")'"
