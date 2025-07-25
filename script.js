document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const rulesScreen = document.getElementById('rules-screen');
    const gameScreen = document.getElementById('game-screen');
    const resultScreen = document.getElementById('result-screen');
    const resultTitle = document.getElementById('result-title');
    const finalTimeContainer = document.getElementById('final-time-container');
    const startButton = document.getElementById('start-button');
    const submitButton = document.getElementById('submit-button');
    const retryButton = document.getElementById('retry-button');
    const timerDisplay = document.getElementById('timer');
    const questionCounterDisplay = document.getElementById('question-counter');
    const problemArea = document.getElementById('problem-area');
    const answerArea = document.getElementById('answer-area');
    const keyboardArea = document.getElementById('keyboard-area');
    const finalTimeDisplay = document.getElementById('final-time');
    const correctAnswerArea = document.getElementById('correct-answer-area');

    // --- Game State ---
    let state = {};

    const resetState = () => {
        state = {
            currentQuestionIndex: 0,
            mistakeCount: 0,
            timerInterval: null,
            startTime: 0,
            questions: [],
            gameFinished: false,
        };
    };

    // --- HTML Generation ---
    const createTruthTableHTML = (table) => {
        let html = '<h3>真理値表</h3><div class="table-container"><table><thead><tr><th>A</th><th>B</th><th>C</th><th>D</th><th>F</th></tr></thead><tbody>';
        for (let i = 0; i < 16; i++) {
            html += `<tr>
                <td>${(i >> 3) & 1}</td>
                <td>${(i >> 2) & 1}</td>
                <td>${(i >> 1) & 1}</td>
                <td>${i & 1}</td>
                <td><b>${table[i]}</b></td>
            </tr>`;
        }
        html += '</tbody></table></div>';
        return html;
    };

    const createKarnaughMapHTML = (truthTable = null, readonly = false) => {
        let html = '<h3>カルノー図</h3><div class="karnaugh-map"><table>';
        const grayCode = ['00', '01', '11', '10'];
        html += '<tr><th>AB\\CD</th><th>00</th><th>01</th><th>11</th><th>10</th></tr>';
        for (let i = 0; i < 4; i++) { // Row (visual)
            html += `<tr><th>${grayCode[i]}</th>`;
            for (let j = 0; j < 4; j++) { // Column (visual)
                let cellContent = '';
                if (truthTable && readonly) {
                    const grayCodeMap = [0, 1, 3, 2];
                    const truthTableRow = grayCodeMap[i];
                    const truthTableCol = grayCodeMap[j];
                    const truthTableIndex = (truthTableRow << 2) | truthTableCol;
                    cellContent = truthTable[truthTableIndex];
                } else {
                    cellContent = `<input type="checkbox" data-row="${i}" data-col="${j}">`;
                }
                html += `<td>${cellContent}</td>`;
            }
            html += '</tr>';
        }
        html += '</table></div>';
        return html;
    };

    const createKeyboard = () => {
        const keys = ['A', 'B', 'C', 'D', '+', '¬'];
        let html = '<div id="keyboard">';
        keys.forEach(key => {
            html += `<button class="key">${key}</button>`;
        });
        html += '<button class="key backspace">⌫</button>';
        html += '</div>';
        keyboardArea.innerHTML = html;

        document.querySelectorAll('.key').forEach(button => {
            button.addEventListener('click', () => {
                const input = document.getElementById('expression-input');
                if (button.classList.contains('backspace')) {
                    input.value = input.value.slice(0, -1);
                } else {
                    input.value += button.textContent;
                }
            });
        });
    };

    // --- Question Generation & Logic ---
    const generateSimplifiedExpression = (numTerms) => {
        const vars = ['A', 'B', 'C', 'D'];
        const terms = new Set();
        while (terms.size < numTerms) {
            const termLength = Math.floor(Math.random() * 2) + 2; // 2 or 3 variables
            let termVars = [...vars].sort(() => 0.5 - Math.random()).slice(0, termLength);
            let term = '';
            termVars.sort(); // Sort variables for consistency (e.g., AB, not BA)
            for (const v of termVars) {
                if (Math.random() > 0.5) {
                    term += '¬';
                }
                term += v;
            }
            terms.add(term);
        }
        return Array.from(terms).join('+');
    };

    const convertExpressionToTruthTable = (expression) => {
        if (!expression || typeof expression !== 'string') return Array(16).fill(0);
        const truthTable = [];
        const terms = expression.split('+');
        for (let i = 0; i < 16; i++) {
            const a = (i >> 3) & 1;
            const b = (i >> 2) & 1;
            const c = (i >> 1) & 1;
            const d = i & 1;
            const varMap = { A: a, B: b, C: c, D: d };

            let result = 0;
            for (const term of terms) {
                if (term.trim() === '') continue;
                let termResult = 1;
                const literals = term.match(/¬?[A-D]/g);
                if (!literals) { // Handle invalid terms
                    termResult = 0;
                } else {
                    for (const literal of literals) {
                        const isNegated = literal.startsWith('¬');
                        const variable = literal.slice(-1);
                        const value = varMap[variable];
                        if ((isNegated && value === 1) || (!isNegated && value === 0)) {
                            termResult = 0;
                            break;
                        }
                    }
                }
                if (termResult === 1) {
                    result = 1;
                    break;
                }
            }
            truthTable.push(result);
        }
        return truthTable;
    };

    const generateTruthTableForMapQuestion = () => {
        const table = [];
        do {
            for (let i = 0; i < 16; i++) {
                table[i] = Math.round(Math.random());
            }
        } while (!table.includes(1));
        return table;
    };

    const generateAllQuestions = () => {
        const questions = [];
        // Q1-4: Truth Table -> Karnaugh Map
        for (let i = 0; i < 4; i++) {
            questions.push({ type: 'tt_to_km', truthTable: generateTruthTableForMapQuestion() });
        }
        // Q5-6: Karnaugh Map -> Expression
        for (let i = 0; i < 2; i++) {
            const numTerms = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4 terms
            const correctExpression = generateSimplifiedExpression(numTerms);
            const truthTable = convertExpressionToTruthTable(correctExpression);
            questions.push({ type: 'km_to_ex', truthTable, correctExpression });
        }
        // Q7: Truth Table -> Karnaugh Map -> Expression
        const numTerms = Math.floor(Math.random() * 3) + 2;
        const correctExpression = generateSimplifiedExpression(numTerms);
        const truthTable = convertExpressionToTruthTable(correctExpression);
        questions.push({ type: 'tt_to_km_to_ex', truthTable, correctExpression });

        return questions;
    };

    // --- Game Core Logic ---
    const showScreen = (screenId) => {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    };

    const startTimer = () => {
        state.startTime = Date.now();
        state.timerInterval = setInterval(() => {
            const elapsedTime = Date.now() - state.startTime;
            timerDisplay.textContent = (elapsedTime / 1000).toFixed(2);
        }, 10);
    };

    const stopTimer = () => {
        clearInterval(state.timerInterval);
        return (Date.now() - state.startTime) / 1000;
    };

    const displayQuestion = () => {
        if (state.currentQuestionIndex >= state.questions.length) {
            endGame(true);
            return;
        }

        questionCounterDisplay.textContent = `Q${state.currentQuestionIndex + 1} / ${state.questions.length}`;
        const q = state.questions[state.currentQuestionIndex];

        problemArea.innerHTML = '';
        answerArea.innerHTML = '';
        keyboardArea.innerHTML = '';

        if (q.type === 'tt_to_km') {
            problemArea.innerHTML = createTruthTableHTML(q.truthTable);
            answerArea.innerHTML = createKarnaughMapHTML();
        } else if (q.type === 'km_to_ex') {
            problemArea.innerHTML = createKarnaughMapHTML(q.truthTable, true);
            answerArea.innerHTML = '<input type="text" id="expression-input" placeholder="論理式を入力">';
            createKeyboard();
        } else if (q.type === 'tt_to_km_to_ex') {
            problemArea.innerHTML = createTruthTableHTML(q.truthTable);
            answerArea.innerHTML = createKarnaughMapHTML() + '<br><input type="text" id="expression-input" placeholder="論理式を入力">';
            createKeyboard();
        }
        debugPrintCorrectAnswer(q);
    };

    const checkKarnaughMapAnswer = (truthTable) => {
        const userMapCheckboxes = answerArea.querySelectorAll('input[type="checkbox"]');
        if (userMapCheckboxes.length === 0) return false;
        const grayCodeMap = [0, 1, 3, 2];
        for (let i = 0; i < 4; i++) { // row
            for (let j = 0; j < 4; j++) { // col
                const checkbox = Array.from(userMapCheckboxes).find(cb => cb.dataset.row == i && cb.dataset.col == j);
                if (!checkbox) continue;
                const userValue = checkbox.checked ? 1 : 0;
                const truthTableRow = grayCodeMap[i];
                const truthTableCol = grayCodeMap[j];
                const truthTableIndex = (truthTableRow << 2) | truthTableCol;
                if (truthTable[truthTableIndex] !== userValue) return false;
            }
        }
        return true;
    };

    const calculateComplexity = (expression) => {
        if (!expression || typeof expression !== 'string') return Infinity;
        const terms = expression.split('+');
        const numTerms = terms.length;
        const numLiterals = (expression.match(/[A-D]/g) || []).length;
        return numTerms + numLiterals;
    };

    const checkExpressionAnswer = (userInput, question) => {
        // 1. Check for logical equivalence
        const userTruthTable = convertExpressionToTruthTable(userInput);
        const correctTruthTable = question.truthTable;
        const isLogicallyEquivalent = JSON.stringify(userTruthTable) === JSON.stringify(correctTruthTable);

        if (!isLogicallyEquivalent) {
            console.log("Logic is incorrect.");
            return false;
        }

        // 2. Check if the expression is simplified enough
        const userComplexity = calculateComplexity(userInput);
        const correctComplexity = calculateComplexity(question.correctExpression);
        
        console.log(`User complexity: ${userComplexity}, Target complexity: ${correctComplexity}`);
        return userComplexity <= correctComplexity;
    };

    const checkAnswer = () => {
        const q = state.questions[state.currentQuestionIndex];
        let isCorrect = false;
        let feedbackMessage = "";

        if (q.type === 'tt_to_km') {
            isCorrect = checkKarnaughMapAnswer(q.truthTable);
            feedbackMessage = isCorrect ? "カルノー図: 正しい" : "カルノー図: 間違い";
        } else if (q.type === 'km_to_ex') {
            const userInput = document.getElementById('expression-input').value;
            isCorrect = checkExpressionAnswer(userInput, q);
            feedbackMessage = isCorrect ? "論理式: 正しい" : "論理式: 間違い";
        } else if (q.type === 'tt_to_km_to_ex'){
            const mapCorrect = checkKarnaughMapAnswer(q.truthTable);
            const exprInput = document.getElementById('expression-input').value;
            const exprCorrect = checkExpressionAnswer(exprInput, q);
            isCorrect = mapCorrect && exprCorrect;

            const mapFeedback = `カルノー図: ${mapCorrect ? '正しい' : '間違い'}`;
            const exprFeedback = `論理式: ${exprCorrect ? '正しい' : '間違い'}`;
            feedbackMessage = `${mapFeedback}\n${exprFeedback}`;
        }

        if (isCorrect) {
            alert(`正解です！\n${feedbackMessage}`);
            state.mistakeCount = 0;
            state.currentQuestionIndex++;
            displayQuestion();
        } else {
            state.mistakeCount++;
            alert(`不正解です。\n${feedbackMessage}\n(ミス: ${state.mistakeCount}回)`);
            if (state.mistakeCount >= 5) {
                endGame(false);
            }
        }
    };

    const endGame = (success) => {
        const finalTime = stopTimer();
        state.gameFinished = true;

        if (success) {
            resultTitle.textContent = 'クリア！';
            finalTimeContainer.style.display = 'block';
            finalTimeDisplay.textContent = finalTime.toFixed(2);
            correctAnswerArea.innerHTML = '';
        } else {
            resultTitle.textContent = '失敗...';
            finalTimeContainer.style.display = 'none';
            const q = state.questions[state.currentQuestionIndex];
            let correctAnswerHTML = '<h3>正解</h3>';
            if (q.type.includes('km')) {
                correctAnswerHTML += createKarnaughMapHTML(q.truthTable, true);
            }
            if (q.type.includes('ex')) {
                 correctAnswerHTML += `<p>論理式 (例): ${q.correctExpression}</p>`;
            }
            correctAnswerArea.innerHTML = correctAnswerHTML;
        }
        showScreen('result-screen');
    };

    const debugPrintCorrectAnswer = (question) => {
        console.log(`--- Q${state.currentQuestionIndex + 1} (${question.type}) ---`);
        if (question.type.includes('km')) {
            console.log("Correct Answer Karnaugh Map (visual layout):");
            const grayCode = ['00', '01', '11', '10'];
            const grayCodeMap = [0, 1, 3, 2];
            let mapStr = "";
            for (let i = 0; i < 4; i++) {
                let rowStr = "";
                for (let j = 0; j < 4; j++) {
                    const truthTableRow = grayCodeMap[i];
                    const truthTableCol = grayCodeMap[j];
                    const truthTableIndex = (truthTableRow << 2) | truthTableCol;
                    rowStr += question.truthTable[truthTableIndex] + " ";
                }
                mapStr += rowStr + "\n";
            }
            console.log(mapStr);
        }
        if (question.type.includes('ex')) {
            console.log("Correct Expression Example:", question.correctExpression);
        }
    };

    // --- Event Listeners ---
    startButton.addEventListener('click', () => {
        resetState();
        state.questions = generateAllQuestions();
        startTimer();
        displayQuestion();
        showScreen('game-screen');
    });
    submitButton.addEventListener('click', checkAnswer);
    retryButton.addEventListener('click', () => {
        resetState();
        showScreen('rules-screen');
    });

    // --- Initial Setup ---
    resetState();
});