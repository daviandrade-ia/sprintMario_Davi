/**
 * Super Goku/Vegeta Jump - Lógica do Jogo e Integração com Ranking MySQL
 */

document.addEventListener('DOMContentLoaded', () => {
    // Elementos do Jogo
    const goku = document.querySelector('.goku');
    const fire = document.querySelector('.fire');
    const gameBoard = document.getElementById('game-board');
    const coins = [];
    const hearts = [];
    const hudPlayerName = document.getElementById('hud-player-name');
    const scoreDisplay = document.getElementById('score-display');
    const jumpTip = document.getElementById('jump-tip');
    const livesDisplay = document.getElementById('lives-display');
    const levelMessage = document.getElementById('level-message');

    let currentDisplayedLevel = -1;
    let levelMessageTimeout = null;

    // Modais e Telas
    const startModal = document.getElementById('start-modal');
    const startForm = document.getElementById('start-form');
    const playerInput = document.getElementById('player-input');
    const btnViewRanking = document.getElementById('btn-view-ranking');
    const btnSelectChar = document.getElementById('btn-select-char');

    const charModal = document.getElementById('char-modal');
    const charBoxes = document.querySelectorAll('.char-box');
    const btnConfirmChar = document.getElementById('btn-confirm-char');

    const gameoverModal = document.getElementById('gameover-modal');
    const finalScoreValue = document.getElementById('final-score-value');
    const saveStatusMsg = document.getElementById('save-status-msg');
    const rankingBody = document.getElementById('ranking-body');
    const btnRestart = document.getElementById('btn-restart');
    const btnChangePlayer = document.getElementById('btn-change-player');

    // Mapeamento dos Sprites por Personagem
    const characterSprites = {
        goku: {
            running: 'assets/goku-flying.gif',
            gameover: 'assets/gameover.png'
        },
        naruto: {
            running: 'assets/naruto.gif',
            gameover: 'assets/game-over.jpg'
        }
    };

    // Estado do Personagem Selecionado
    let selectedCharKey = localStorage.getItem('goku_jump_char_key') || 'naruto';
    let tempSelectedCharKey = selectedCharKey;

    // Variáveis de Estado do Jogo
    let currentPlayer = '';
    let score = 0;
    let isPlaying = false;
    let gameLoop = null;
    let scoreLoop = null;
    let coinSpawnLoop = null;
    let coinMoveLoop = null;
    let lives = 3;
    let isInvulnerable = false;
    let recoverySlow = false;

    let recoveryTimeout = null;
    let invulnerabilityTimeout = null;

    let heartMoveLoop = null;
    let heartSpawnTimeout = null;

    // Recupera último nome utilizado
    const savedName = localStorage.getItem('goku_jump_player');
    if (savedName && playerInput) {
        playerInput.value = savedName;
    }

    // Inicializa seleção visual das caixas no modal
    charBoxes.forEach(box => {
        if (box.dataset.char === selectedCharKey) {
            box.classList.add('selected');
        } else {
            box.classList.remove('selected');
        }
    });

    // Abrir Modal de Seleção
    btnSelectChar.addEventListener('click', () => {
        startModal.classList.remove('active');
        charModal.classList.add('active');
    });

    // Selecionar Caixinha
    charBoxes.forEach(box => {
        box.addEventListener('click', () => {
            charBoxes.forEach(b => b.classList.remove('selected'));
            box.classList.add('selected');
            tempSelectedCharKey = box.dataset.char;
        });
    });

    // Confirmar Escolha e Voltar para Tela Inicial
    btnConfirmChar.addEventListener('click', () => {
        selectedCharKey = tempSelectedCharKey;
        localStorage.setItem('goku_jump_char_key', selectedCharKey);

        charModal.classList.remove('active');
        startModal.classList.add('active');
        playerInput.focus();
    });

    function updateLivesDisplay() {
        const fullHearts = '❤️ '.repeat(lives);
        const emptyHearts = '♡ '.repeat(3 - lives);
        livesDisplay.textContent = fullHearts + emptyHearts;
    }

    function updateFireSpeed() {
        const difficultyLevel = Math.floor(score / 350);
        const initialDuration = 2.0;
        const reductionPerLevel = 0.5;
        const minimumDuration = 0.4;

        const newDuration = Math.max(
            minimumDuration,
            initialDuration - difficultyLevel * reductionPerLevel
        );

        const fireAnimation = fire.getAnimations().find(
            animation => animation.animationName === 'fire-animation'
        );

        if (fireAnimation) {
            const normalSpeed = initialDuration / newDuration;
            const recoveryMultiplier = recoverySlow ? 0.5 : 1;
            fireAnimation.playbackRate = normalSpeed * recoveryMultiplier;
        }

        let levelName;
        let levelClass;
        let bgClass;

        if (difficultyLevel === 0) {
            levelName = 'NÍVEL FÁCIL';
            levelClass = 'level-easy';
            bgClass = 'bg-easy';
        } else if (difficultyLevel === 1) {
            levelName = 'NÍVEL MÉDIO';
            levelClass = 'level-medium';
            bgClass = 'bg-medium';
        } else if (difficultyLevel === 2) {
            levelName = 'NÍVEL DIFÍCIL';
            levelClass = 'level-hard';
            bgClass = 'bg-hard';
        } else {
            levelName = 'NÍVEL EXPERT';
            levelClass = 'level-expert';
            bgClass = 'bg-hard';
        }

        gameBoard.classList.remove('bg-easy', 'bg-medium', 'bg-hard');
        gameBoard.classList.add(bgClass);

        if (difficultyLevel !== currentDisplayedLevel) {
            currentDisplayedLevel = difficultyLevel;

            levelMessage.textContent = levelName;
            levelMessage.className = 'level-message ' + levelClass;

            void levelMessage.offsetWidth;
            levelMessage.classList.add('show');

            clearTimeout(levelMessageTimeout);
            levelMessageTimeout = setTimeout(() => {
                levelMessage.classList.remove('show');
            }, 2000);
        }
    }

    function startGame() {
        clearInterval(gameLoop);
        clearInterval(scoreLoop);
        clearInterval(coinSpawnLoop);
        clearInterval(coinMoveLoop);
        clearInterval(heartMoveLoop);
        clearTimeout(heartSpawnTimeout);

        resetElements();

        isPlaying = true;
        score = 0;
        scoreDisplay.textContent = '0';
        lives = 3;
        isInvulnerable = false;
        recoverySlow = false;

        clearTimeout(recoveryTimeout);
        clearTimeout(invulnerabilityTimeout);

        recoveryTimeout = null;
        invulnerabilityTimeout = null;

        updateLivesDisplay();
        currentDisplayedLevel = -1;
        clearTimeout(levelMessageTimeout);
        levelMessageTimeout = null;
        fire.style.animationDuration = '2.0s';
        hudPlayerName.textContent = currentPlayer || 'Jogador';

        updateFireSpeed();
        gameBoard.classList.add('running');

        scoreLoop = setInterval(() => {
            if (isPlaying) {
                score += 1;
                scoreDisplay.textContent = score;
                updateFireSpeed();
            }
        }, 100);

        coinSpawnLoop = setInterval(spawnCoin, 1800);
        coinMoveLoop = setInterval(moveCoins, 30);
        heartMoveLoop = setInterval(moveHearts, 30);
        scheduleHeartSpawn();

        gameLoop = setInterval(checkCollision, 10);
    }

    function resetElements() {
        gameBoard.classList.remove('bg-easy', 'bg-medium', 'bg-hard');
        gameBoard.classList.add('bg-easy');

        fire.style.animation = '';
        fire.style.left = '';

        // Carrega o GIF de corrida do personagem selecionado
        const currentChar = characterSprites[selectedCharKey] || characterSprites.goku;
        goku.src = currentChar.running;

        goku.style.animation = '';
        goku.style.bottom = '0px';
        goku.style.width = '';
        goku.style.marginLeft = '';
        goku.classList.remove('jump');
        goku.classList.remove('hit-blink');
        goku.style.visibility = '';

        if (jumpTip) {
            jumpTip.style.opacity = '1';
        }

        coins.forEach(coin => coin.remove());
        coins.length = 0;

        hearts.forEach(heart => heart.remove());
        hearts.length = 0;
    }

    function spawnCoin() {
        if (!isPlaying) return;

        const coin = document.createElement('img');
        coin.src = 'assets/moeda_girando.gif';
        coin.alt = 'Moeda';
        coin.style.width = '50px';
        coin.style.height = '50px';
        coin.style.position = 'absolute';
        coin.style.left = gameBoard.clientWidth + 'px';

        const randomHeight = Math.random() * 60 + 25;
        coin.style.bottom = randomHeight + 'px';
        coin.style.fontSize = '30px';
        coin.style.zIndex = '10';

        gameBoard.appendChild(coin);
        coins.push(coin);
    }

    function moveCoins() {
        const gokuRect = goku.getBoundingClientRect();

        for (let i = coins.length - 1; i >= 0; i--) {
            const coin = coins[i];
            const currentLeft = parseFloat(coin.style.left);
            coin.style.left = (currentLeft - 4) + 'px';

            const coinRect = coin.getBoundingClientRect();

            const collected =
                gokuRect.left < coinRect.right &&
                gokuRect.right > coinRect.left &&
                gokuRect.top < coinRect.bottom &&
                gokuRect.bottom > coinRect.top;

            if (collected) {
                score += 10;
                scoreDisplay.textContent = score;
                updateFireSpeed();

                coin.remove();
                coins.splice(i, 1);
                continue;
            }

            if (currentLeft < -40) {
                coin.remove();
                coins.splice(i, 1);
            }
        }
    }

    function scheduleHeartSpawn() {
        clearTimeout(heartSpawnTimeout);
        if (!isPlaying) return;

        const randomTime = Math.floor(Math.random() * (30000 - 10000 + 1)) + 10000;

        heartSpawnTimeout = setTimeout(() => {
            if (isPlaying) {
                if (lives < 3) {
                    spawnHeart();
                } else {
                    scheduleHeartSpawn();
                }
            }
        }, randomTime);
    }

    function spawnHeart() {
        if (!isPlaying) return;

        const heart = document.createElement('div');
        heart.textContent = '❤️';
        heart.style.fontSize = '35px';
        heart.style.position = 'absolute';
        heart.style.left = gameBoard.clientWidth + 'px';

        const randomHeight = Math.random() * 80 + 30;
        heart.style.bottom = randomHeight + 'px';
        heart.style.zIndex = '10';

        gameBoard.appendChild(heart);
        hearts.push(heart);
    }

    function moveHearts() {
        const gokuRect = goku.getBoundingClientRect();

        for (let i = hearts.length - 1; i >= 0; i--) {
            const heart = hearts[i];
            const currentLeft = parseFloat(heart.style.left);
            heart.style.left = (currentLeft - 4) + 'px';

            const heartRect = heart.getBoundingClientRect();

            const collected =
                gokuRect.left < heartRect.right &&
                gokuRect.right > heartRect.left &&
                gokuRect.top < heartRect.bottom &&
                gokuRect.bottom > heartRect.top;

            if (collected) {
                if (lives < 3 && !isInvulnerable) {
                    lives++;
                    updateLivesDisplay();

                    heart.remove();
                    hearts.splice(i, 1);
                    scheduleHeartSpawn();
                    continue;
                }
            }

            if (currentLeft < -40) {
                heart.remove();
                hearts.splice(i, 1);
                scheduleHeartSpawn();
            }
        }
    }

    function jump() {
        if (!isPlaying) return;
        if (goku.classList.contains('jump')) return;

        goku.classList.add('jump');

        if (jumpTip) {
            jumpTip.style.opacity = '0';
        }

        setTimeout(() => {
            goku.classList.remove('jump');
        }, 900);
    }

    function loseLife(firePosition, gokuPosition) {
        if (!isPlaying || isInvulnerable) return;

        lives--;
        updateLivesDisplay();

        if (lives <= 0) {
            triggerGameOver(firePosition, gokuPosition);
            return;
        }

        isInvulnerable = true;

        fire.style.animation = 'none';
        fire.offsetHeight;
        fire.style.animation = '';

        goku.classList.remove('hit-blink');
        void goku.offsetWidth;
        goku.classList.add('hit-blink');

        recoverySlow = true;
        updateFireSpeed();

        setTimeout(() => {
            goku.classList.remove('hit-blink');
        }, 1500);

        clearTimeout(invulnerabilityTimeout);
        invulnerabilityTimeout = setTimeout(() => {
            isInvulnerable = false;
        }, 1500);

        clearTimeout(recoveryTimeout);
        recoveryTimeout = setTimeout(() => {
            recoverySlow = false;
            updateFireSpeed();
        }, 2500);
    }

    function checkCollision() {
        if (!isPlaying || isInvulnerable) return;

        const firePosition = fire.offsetLeft;
        const gokuPosition = +window.getComputedStyle(goku).bottom.replace('px', '');

        if (firePosition <= 120 && firePosition > 0 && gokuPosition < 80) {
            loseLife(firePosition, gokuPosition);
        }
    }

    function triggerGameOver(firePosition, gokuPosition) {
        isPlaying = false;
        clearInterval(gameLoop);
        clearInterval(scoreLoop);
        clearInterval(coinSpawnLoop);
        clearInterval(coinMoveLoop);
        clearInterval(heartMoveLoop);
        clearTimeout(heartSpawnTimeout);

        gameBoard.classList.remove('running');

        fire.style.animation = 'none';
        fire.style.left = `${firePosition}px`;

        goku.style.animation = 'none';
        goku.style.bottom = `${gokuPosition}px`;

        // Garante que pega as imagens do personagem atual ou fallback para Goku
        const currentChar = characterSprites[selectedCharKey] || characterSprites.goku;

        // Troca a imagem
        goku.src = currentChar.gameover;

        // Ajusta o tamanho da sprite do personagem caído no chão
        goku.style.width = '120px';
        goku.style.marginLeft = '0px';

        // Atualiza modal de Game Over
        finalScoreValue.textContent = score;
        saveStatusMsg.textContent = 'Salvando pontuação no banco...';
        saveStatusMsg.style.color = '#ffcc00';

        // Garante a exibição da tela de Game Over mesmo se a imagem demorar a carregar
        gameoverModal.classList.add('active');

        // Salva no banco de dados
        saveScore(currentPlayer, score);
    }

    function saveScore(playerName, finalScore) {
        fetch('salvar_ranking.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: playerName,
                pontos: finalScore
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    saveStatusMsg.textContent = 'Pontuação registrada no banco!';
                    saveStatusMsg.style.color = '#10b981';
                    if (data.ranking) {
                        renderRanking(data.ranking, playerName, finalScore);
                    }
                } else {
                    saveStatusMsg.textContent = '⚠️ ' + (data.message || 'Erro ao registrar.');
                    saveStatusMsg.style.color = '#ef4444';
                }
            })
            .catch(err => {
                console.error('Erro na requisição:', err);
                saveStatusMsg.textContent = '⚠️ Erro ao conectar ao servidor Laragon.';
                saveStatusMsg.style.color = '#ef4444';
            });
    }

    function fetchRanking() {
        fetch('obter_ranking.php')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success' && data.ranking) {
                    renderRanking(data.ranking);
                }
            })
            .catch(err => console.error('Erro ao buscar ranking:', err));
    }

    function renderRanking(list, highlightName = null, highlightScore = null) {
        if (!rankingBody) return;
        rankingBody.innerHTML = '';

        if (!list || list.length === 0) {
            rankingBody.innerHTML = '<tr><td colspan="3" class="loading-cell">Nenhuma pontuação gravada ainda. Jogue para ser o 1º!</td></tr>';
            return;
        }

        let highlighted = false;

        list.forEach((item, index) => {
            const tr = document.createElement('tr');

            if (!highlighted && highlightName && item.nome === highlightName && parseInt(item.pontos, 10) === highlightScore) {
                tr.classList.add('highlight-current');
                highlighted = true;
            }

            let medal = `${index + 1}º`;
            if (index === 0) medal = '🥇 1º';
            else if (index === 1) medal = '🥈 2º';
            else if (index === 2) medal = '🥉 3º';

            tr.innerHTML = `
                <td class="ranking-pos">${medal}</td>
                <td><strong>${escapeHtml(item.nome)}</strong></td>
                <td>${parseInt(item.pontos, 10)} pts</td>
            `;

            rankingBody.appendChild(tr);
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    startForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const nameValue = playerInput.value.trim();
        if (!nameValue) {
            playerInput.focus();
            return;
        }

        currentPlayer = nameValue;
        localStorage.setItem('goku_jump_player', currentPlayer);

        startModal.classList.remove('active');
        startGame();
    });

    btnViewRanking.addEventListener('click', () => {
        fetchRanking();
        finalScoreValue.textContent = '---';
        saveStatusMsg.textContent = '';
        startModal.classList.remove('active');
        gameoverModal.classList.add('active');
    });

    btnRestart.addEventListener('click', () => {
        gameoverModal.classList.remove('active');
        if (!currentPlayer) {
            startModal.classList.add('active');
            playerInput.focus();
        } else {
            startGame();
        }
    });

    btnChangePlayer.addEventListener('click', () => {
        gameoverModal.classList.remove('active');
        resetElements();
        startModal.classList.add('active');
        playerInput.value = '';
        playerInput.focus();
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp') {
            if (isPlaying) {
                e.preventDefault();
                jump();
            }
        }
    });
});