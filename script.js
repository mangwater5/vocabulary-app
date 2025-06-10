// DOM 요소
const englishInput = document.getElementById('englishInput');
const koreanInput = document.getElementById('koreanInput');
const addWordBtn = document.getElementById('addWordBtn');
const wordContainer = document.getElementById('wordContainer');
const wordCount = document.getElementById('wordCount');
const menuBtns = document.querySelectorAll('.menu-btn');
const sections = document.querySelectorAll('.section');
const memoryModeBtn = document.getElementById('memoryModeBtn');
const sortLengthBtn = document.getElementById('sortLengthBtn');
const shuffleBtn = document.getElementById('shuffleBtn');

// 시험 모드 요소
const testOptions = document.querySelector('.test-options');
const testArea = document.querySelector('.test-area');
const resultBox = document.querySelector('.result-box');
const questionElement = document.getElementById('question');
const answerInput = document.getElementById('answer');
const submitAnswerBtn = document.getElementById('submitAnswer');
const listenAgainBtn = document.getElementById('listenAgainBtn');
const progressElement = document.getElementById('progress');
const progressFill = document.getElementById('progressFill');
const correctCountElement = document.getElementById('correctCount');
const totalCountElement = document.getElementById('totalCount');
const wrongAnswersElement = document.getElementById('wrongAnswers');
const retryWrongBtn = document.getElementById('retryWrongWords');
const restartTestBtn = document.getElementById('restartTest');
const backToOptionsBtn = document.getElementById('backToOptions');

// 스피킹 모드 요소
const speakingContainer = document.getElementById('speakingContainer');
const voiceSelect = document.getElementById('voiceSelect');
const practiceAllBtn = document.getElementById('practiceAll');
const practiceRandomBtn = document.getElementById('practiceRandom');

// 상태 변수
let words = [];
let isMemoryMode = false;
let isLongToShort = true;
let testWords = [];
let currentTestIndex = 0;
let correctAnswers = 0;
let wrongAnswers = [];
let currentTestMode = '';
let isPlaying = false;
let selectedVoice = null;

// 로컬 스토리지에서 단어 불러오기
function loadWords() {
    const savedWords = localStorage.getItem('words');
    if (savedWords) {
        words = JSON.parse(savedWords);
        updateWordList();
        renderSpeakingList();
    }
}

// 단어 저장하기
function saveWords() {
    localStorage.setItem('words', JSON.stringify(words));
}

// 단어 추가
function addWord() {
    const english = englishInput.value.trim();
    const korean = koreanInput.value.trim();

    if (english && korean) {
        words.push({ english, korean });
        saveWords();
        updateWordList();
        renderSpeakingList();
        englishInput.value = '';
        koreanInput.value = '';
        englishInput.focus();
    }
}

// 단어 삭제
function deleteWord(index) {
    words.splice(index, 1);
    saveWords();
    updateWordList();
    renderSpeakingList();
}

// TTS 재생
function speakWord(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }
    
    speechSynthesis.speak(utterance);
}

// 단어 정렬
function sortWords() {
    if (isLongToShort) {
        words.sort((a, b) => b.english.length - a.english.length);
    } else {
        words.sort((a, b) => a.english.length - b.english.length);
    }
    updateWordList();
}

// 단어 랜덤 섞기
function shuffleWords() {
    for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
    }
    updateWordList();
}

// 단어 목록 업데이트
function updateWordList() {
    wordContainer.innerHTML = '';
    wordCount.textContent = `(${words.length}개)`;

    words.forEach((word, index) => {
        const wordItem = document.createElement('div');
        wordItem.className = 'word-item';
        wordItem.innerHTML = `
            <div class="word-text">
                <span class="word-english">${word.english}</span>
                <span class="word-korean ${isMemoryMode ? 'hidden' : ''}">${word.korean}</span>
            </div>
            <div class="word-actions">
                <button class="action-btn speak" onclick="speakWord('${word.english}')">
                    <i class="fas fa-volume-up"></i>
                </button>
                <button class="action-btn delete" onclick="deleteWord(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        wordContainer.appendChild(wordItem);
    });
}

// 스피킹 목록 렌더링
function renderSpeakingList() {
    if (!speakingContainer) return;

    speakingContainer.innerHTML = words.map(word => `
        <div class="speak-item">
            <div class="word-info">
                <span class="word-english">${word.english}</span>
                <span class="word-divider">-</span>
                <span class="word-korean">${word.korean}</span>
            </div>
            <button onclick="speakWord('${word.english}')" class="action-btn speak">
                <i class="fas fa-volume-up"></i>
            </button>
        </div>
    `).join('');
}

// 시험 시작
function startTest(mode) {
    if (words.length === 0) {
        alert('단어장에 단어를 먼저 추가해주세요!');
        return;
    }

    currentTestMode = mode;
    testWords = [...words];
    shuffleArray(testWords);
    currentTestIndex = 0;
    correctAnswers = 0;
    wrongAnswers = [];

    testOptions.style.display = 'none';
    testArea.style.display = 'block';
    resultBox.style.display = 'none';
    answerInput.value = '';
    
    showNextQuestion();
}

// 다음 문제 표시
function showNextQuestion() {
    if (currentTestIndex < testWords.length) {
        const word = testWords[currentTestIndex];
        
        // 진행 상태 업데이트
        progressElement.textContent = `${currentTestIndex + 1} / ${testWords.length}`;
        progressFill.style.width = `${((currentTestIndex + 1) / testWords.length) * 100}%`;

        // 문제 유형에 따른 표시
        switch (currentTestMode) {
            case 'KorToEng':
                questionElement.textContent = word.korean;
                listenAgainBtn.style.display = 'none';
                break;
            case 'EngToKor':
                questionElement.textContent = word.english;
                listenAgainBtn.style.display = 'none';
                break;
            case 'ListenToEng':
                questionElement.textContent = '아래 버튼을 눌러 발음을 들어보세요';
                listenAgainBtn.style.display = 'block';
                speakWord(word.english);
                break;
        }

        answerInput.value = '';
        answerInput.focus();
    } else {
        showTestResult();
    }
}

// 답안 체크
function checkAnswer() {
    const currentWord = testWords[currentTestIndex];
    const userAnswer = answerInput.value.trim();
    let correctAnswer;
    
    switch (currentTestMode) {
        case 'KorToEng':
        case 'ListenToEng':
            correctAnswer = currentWord.english;
            break;
        case 'EngToKor':
            correctAnswer = currentWord.korean;
            break;
    }

    const normalizeAnswer = (text) => {
        return text.toLowerCase().replace(/\s+/g, ' ').trim();
    };

    const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
    
    const feedback = document.getElementById('answerFeedback');
    if (feedback) {
        feedback.textContent = isCorrect ? 
            '정답입니다! 👍' : 
            `틀렸습니다. 정답은 "${correctAnswer}" 입니다.`;
        feedback.className = `answer-feedback ${isCorrect ? 'correct' : 'wrong'}`;

        // 1초 후에 피드백 초기화
        setTimeout(() => {
            feedback.textContent = '';
            feedback.className = 'answer-feedback';
        }, 1000);
    }

    if (isCorrect) {
        correctAnswers++;
    } else {
        wrongAnswers.push({
            question: currentTestMode === 'EngToKor' ? currentWord.english : currentWord.korean,
            correctAnswer: correctAnswer,
            userAnswer: userAnswer
        });
    }

    // 1초 후 다음 문제로
    setTimeout(() => {
        currentTestIndex++;
        showNextQuestion();
    }, 1000);
}

// 시험 결과 표시
function showTestResult() {
    testArea.style.display = 'none';
    resultBox.style.display = 'block';

    correctCountElement.textContent = correctAnswers;
    totalCountElement.textContent = testWords.length;

    if (wrongAnswers.length === 0) {
        wrongAnswersElement.innerHTML = '<p class="perfect-score">축하합니다! 모든 문제를 맞추셨습니다! 🎉</p>';
        retryWrongBtn.style.display = 'none';
    } else {
        let wrongAnswersHtml = '<h4>틀린 단어 목록</h4>';
        wrongAnswers.forEach(wrong => {
            wrongAnswersHtml += `
                <div class="wrong-item">
                    <span class="question">${wrong.question}</span>
                    <span class="arrow">→</span>
                    <span class="correct">${wrong.correctAnswer}</span>
                    <span class="user-answer">(입력: ${wrong.userAnswer})</span>
                </div>
            `;
        });
        wrongAnswersElement.innerHTML = wrongAnswersHtml;
        retryWrongBtn.style.display = 'block';
    }
}

// 틀린 단어만 다시 보기
function retryWrongWords() {
    testWords = wrongAnswers.map(wrong => {
        return words.find(word => 
            word.english === (currentTestMode === 'EngToKor' ? wrong.question : wrong.correctAnswer)
        );
    });
    
    currentTestIndex = 0;
    correctAnswers = 0;
    wrongAnswers = [];
    
    testArea.style.display = 'block';
    resultBox.style.display = 'none';
    showNextQuestion();
}

// 전체 단어 재생
function practiceAllWords() {
    if (isPlaying) {
        isPlaying = false;
        speechSynthesis.cancel();
        practiceAllBtn.innerHTML = '<i class="fas fa-play"></i> 전체 단어 재생';
        practiceAllBtn.classList.remove('playing');
        return;
    }

    if (words.length === 0) {
        alert('단어장에 단어를 먼저 추가해주세요!');
        return;
    }

    isPlaying = true;
    practiceAllBtn.innerHTML = '<i class="fas fa-stop"></i> 재생 중단';
    practiceAllBtn.classList.add('playing');
    let index = 0;

    function speakNext() {
        if (!isPlaying || index >= words.length) {
            isPlaying = false;
            practiceAllBtn.innerHTML = '<i class="fas fa-play"></i> 전체 단어 재생';
            practiceAllBtn.classList.remove('playing');
            return;
        }

        speakWord(words[index].english);
        index++;
        setTimeout(speakNext, 2000);
    }

    speakNext();
}

// 랜덤 단어 재생
function practiceRandomWord() {
    if (words.length === 0) {
        alert('단어장에 단어를 먼저 추가해주세요!');
        return;
    }

    const randomIndex = Math.floor(Math.random() * words.length);
    speakWord(words[randomIndex].english);
}

// 배열 섞기
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 음성 목록 로드
function loadVoices() {
    const voices = speechSynthesis.getVoices();
    const englishVoices = voices.filter(voice => voice.lang.includes('en'));
    
    voiceSelect.innerHTML = englishVoices.map(voice => `
        <option value="${voice.name}">
            ${voice.name} (${voice.lang})
        </option>
    `).join('');

    if (englishVoices.length > 0) {
        selectedVoice = englishVoices[0];
        voiceSelect.value = selectedVoice.name;
    }
}

if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
}

// 섹션 전환
function switchSection(targetSection) {
    sections.forEach(section => section.classList.remove('active'));
    menuBtns.forEach(btn => btn.classList.remove('active'));

    document.getElementById(targetSection).classList.add('active');
    document.querySelector(`[data-section="${targetSection}"]`).classList.add('active');

    if (targetSection === 'speaking') {
        renderSpeakingList();
    }
}

// 이벤트 리스너
addWordBtn.addEventListener('click', addWord);
englishInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') koreanInput.focus();
});
koreanInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') addWord();
});

menuBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        switchSection(btn.dataset.section);
    });
});

memoryModeBtn.addEventListener('click', () => {
    isMemoryMode = !isMemoryMode;
    memoryModeBtn.classList.toggle('active');
    updateWordList();
});

sortLengthBtn.addEventListener('click', () => {
    isLongToShort = !isLongToShort;
    sortLengthBtn.innerHTML = `
        <i class="fas fa-sort-amount-${isLongToShort ? 'down' : 'up'}"></i>
        ${isLongToShort ? '긴 단어순' : '짧은 단어순'}
    `;
    sortWords();
});

shuffleBtn.addEventListener('click', shuffleWords);

// 시험 모드 이벤트 리스너
document.getElementById('startKorToEng').addEventListener('click', () => startTest('KorToEng'));
document.getElementById('startEngToKor').addEventListener('click', () => startTest('EngToKor'));
document.getElementById('startListenToEng').addEventListener('click', () => startTest('ListenToEng'));

submitAnswerBtn.addEventListener('click', checkAnswer);
answerInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') checkAnswer();
});

listenAgainBtn.addEventListener('click', () => {
    const currentWord = testWords[currentTestIndex];
    speakWord(currentWord.english);
});

retryWrongBtn.addEventListener('click', retryWrongWords);
restartTestBtn.addEventListener('click', () => startTest(currentTestMode));
backToOptionsBtn.addEventListener('click', () => {
    testArea.style.display = 'none';
    resultBox.style.display = 'none';
    testOptions.style.display = 'block';
});

// 스피킹 모드 이벤트 리스너
voiceSelect.addEventListener('change', e => {
    selectedVoice = speechSynthesis.getVoices().find(voice => voice.name === e.target.value);
});

practiceAllBtn.addEventListener('click', practiceAllWords);
practiceRandomBtn.addEventListener('click', practiceRandomWord);

// 초기화
loadWords(); 