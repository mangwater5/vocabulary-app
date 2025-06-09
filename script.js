// 단어장 데이터 저장소
let wordList = JSON.parse(localStorage.getItem('wordList')) || [];
let isStudyMode = false;
let currentSortOrder = 'date';
let testWords = [];
let currentTestIndex = 0;
let correctAnswers = 0;
let wrongAnswers = [];
let currentTestMode = '';
let isPlaying = false;
let currentUtterance = null;

// DOM 요소들을 상수로 정의
const menuButtons = document.querySelectorAll('.menu-btn');
const sections = document.querySelectorAll('.section');
const englishInput = document.getElementById('englishWord');
const koreanInput = document.getElementById('koreanWord');
const addWordButton = document.getElementById('addWord');
const wordContainer = document.getElementById('wordContainer');
const speakingContainer = document.getElementById('speakingContainer');
const searchInput = document.getElementById('searchWord');
const toggleModeButton = document.getElementById('toggleMode');
const shuffleButton = document.getElementById('shuffleWords');
const sortByLengthAscButton = document.getElementById('sortByLengthAsc');
const sortByLengthDescButton = document.getElementById('sortByLengthDesc');
const wordCountSpan = document.getElementById('wordCount');
const voiceSelect = document.getElementById('voiceSelect');
const speechRateInput = document.getElementById('speechRate');
const speechRateValue = document.getElementById('speechRateValue');
const practiceAllButton = document.getElementById('practiceAll');
const practiceRandomButton = document.getElementById('practiceRandom');

// 시험 모드 요소들
const testArea = document.querySelector('.test-area');
const testOptions = document.querySelector('.test-options');
const questionElement = document.getElementById('question');
const answerInput = document.getElementById('answer');
const submitAnswerButton = document.getElementById('submitAnswer');
const progressElement = document.getElementById('progress');
const progressFill = document.getElementById('progressFill');
const listenAgainButton = document.getElementById('listenAgain');
const resultBox = document.querySelector('.result-box');
const correctCountElement = document.getElementById('correctCount');
const totalCountElement = document.getElementById('totalCount');
const wrongAnswersElement = document.getElementById('wrongAnswers');
const retryWrongButton = document.getElementById('retryWrongWords');
const restartTestButton = document.getElementById('restartTest');
const backToOptionsButton = document.getElementById('backToOptions');

// 음성 합성 초기화
const synth = window.speechSynthesis;
let voices = [];
let selectedVoice = null;
let speechRate = 1.0;

// 음성 목록 로드 및 기본 영어 음성 설정
function loadVoices() {
    voices = synth.getVoices().filter(voice => voice.lang.includes('en'));
    
    // 음성 목록 업데이트
    voiceSelect.innerHTML = voices.map(voice => 
        `<option value="${voice.name}" ${voice.name.includes('Natural') ? 'selected' : ''}>
            ${voice.name}
        </option>`
    ).join('');
    
    // 기본 음성을 자연스러운 영어 음성으로 설정
    const naturalVoice = voices.find(voice => voice.name.includes('Natural'));
    selectedVoice = naturalVoice || voices[0];
    
    if (selectedVoice) {
        voiceSelect.value = selectedVoice.name;
    }
}

if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
}

// 메뉴 전환 기능
menuButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetSection = button.dataset.section;
        menuButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        sections.forEach(section => {
            section.classList.remove('active');
            if (section.id === targetSection) {
                section.classList.add('active');
            }
        });

        if (targetSection === 'speaking') {
            renderSpeakingList();
        }
    });
});

// 단어 입력 이벤트 처리
function setupWordInputEvents() {
    englishInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            koreanInput.focus();
        }
    });

    koreanInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addNewWord();
        }
    });

    addWordButton.addEventListener('click', addNewWord);
}

// 단어 추가 기능
function addNewWord() {
    const english = englishInput.value.trim();
    const korean = koreanInput.value.trim();

    if (!english || !korean) {
        alert('영어 단어와 한글 뜻을 모두 입력해주세요.');
        return;
    }

    const wordData = {
        id: Date.now(),
        english: english,
        korean: korean,
        timestamp: Date.now()
    };

    wordList.push(wordData);
    localStorage.setItem('wordList', JSON.stringify(wordList));
    
    englishInput.value = '';
    koreanInput.value = '';
    englishInput.focus();
    
    renderWordList();
    renderSpeakingList();
}

// 단어 목록 렌더링
function renderWordList() {
    const searchTerm = searchInput.value.toLowerCase();
    let filteredWords = wordList.filter(word => 
        word.english.toLowerCase().includes(searchTerm) || 
        word.korean.includes(searchTerm)
    );

    switch (currentSortOrder) {
        case 'lengthAsc':
            filteredWords.sort((a, b) => a.english.length - b.english.length);
            break;
        case 'lengthDesc':
            filteredWords.sort((a, b) => b.english.length - a.english.length);
            break;
        default:
            filteredWords.sort((a, b) => b.timestamp - a.timestamp);
    }

    wordContainer.innerHTML = filteredWords.map(word => `
        <div class="word-item${isStudyMode ? ' study-mode' : ''}">
            <div class="word-text">
                <span class="english">${word.english}</span>
                <span class="korean">${word.korean}</span>
            </div>
            <div class="actions">
                <button onclick="speakWord('${word.english}')" class="speak-btn" title="발음 듣기">
                    <i class="fas fa-volume-up"></i>
                </button>
                <button onclick="deleteWord(${word.id})" class="delete-btn" title="단어 삭제">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    wordCountSpan.textContent = `(${wordList.length}개)`;
}

// 스피킹 목록 렌더링
function renderSpeakingList() {
    if (!speakingContainer) return;

    speakingContainer.innerHTML = wordList.map(word => `
        <div class="speak-item">
            <div class="word-text">
                <strong>${word.english}</strong> - ${word.korean}
            </div>
            <button onclick="speakWord('${word.english}')" class="speak-btn">
                <i class="fas fa-volume-up"></i>
            </button>
        </div>
    `).join('');
}

// 단어 삭제
function deleteWord(id) {
    if (confirm('정말 이 단어를 삭제하시겠습니까?')) {
        wordList = wordList.filter(word => word.id !== id);
        localStorage.setItem('wordList', JSON.stringify(wordList));
        renderWordList();
        renderSpeakingList();
    }
}

// 단어 발음
function speakWord(text) {
    if (synth.speaking) {
        synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }

    utterance.onerror = (event) => {
        console.error('음성 합성 오류:', event);
        alert('음성 재생 중 오류가 발생했습니다.');
    };

    currentUtterance = utterance;
    synth.speak(utterance);
}

// 시험 모드 시작
function startTest(mode) {
    if (wordList.length === 0) {
        alert('단어장에 단어를 먼저 추가해주세요!');
        return;
    }

    currentTestMode = mode;
    testWords = [...wordList];
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
                listenAgainButton.style.display = 'none';
                break;
            case 'EngToKor':
                questionElement.textContent = word.english;
                listenAgainButton.style.display = 'none';
                break;
            case 'ListenToEng':
                questionElement.textContent = '아래 버튼을 눌러 발음을 들어보세요';
                listenAgainButton.style.display = 'block';
                speakWord(word.english);
                break;
        }

        answerInput.value = '';
        answerInput.focus();
        
        const feedback = document.getElementById('answerFeedback');
        if (feedback) {
            feedback.textContent = '';
            feedback.className = 'answer-feedback';
        }
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
        retryWrongButton.style.display = 'none';
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
        retryWrongButton.style.display = 'block';
    }

    restartTestButton.style.display = 'block';
    backToOptionsButton.style.display = 'block';
}

// 틀린 단어만 다시 보기
function retryWrongWords() {
    if (wrongAnswers.length === 0) {
        alert('틀린 단어가 없습니다!');
        return;
    }

    testWords = wrongAnswers.map(wrong => {
        const word = wordList.find(w => 
            w.english === (currentTestMode === 'EngToKor' ? wrong.question : wrong.correctAnswer)
        );
        return word || {
            english: currentTestMode === 'EngToKor' ? wrong.question : wrong.correctAnswer,
            korean: currentTestMode === 'EngToKor' ? wrong.correctAnswer : wrong.question
        };
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
        synth.cancel();
        practiceAllButton.innerHTML = '<i class="fas fa-play"></i> 전체 단어 재생';
        return;
    }

    if (wordList.length === 0) {
        alert('단어장에 단어를 먼저 추가해주세요!');
        return;
    }

    isPlaying = true;
    practiceAllButton.innerHTML = '<i class="fas fa-stop"></i> 재생 중단';
    let index = 0;

    const speakNext = () => {
        if (!isPlaying || index >= wordList.length) {
            isPlaying = false;
            practiceAllButton.innerHTML = '<i class="fas fa-play"></i> 전체 단어 재생';
            return;
        }

        const word = wordList[index];
        speakWord(word.english);
        index++;
        setTimeout(speakNext, 2000);
    };

    speakNext();
}

// 랜덤 단어 재생
function practiceRandomWord() {
    if (wordList.length === 0) {
        alert('단어장에 단어를 먼저 추가해주세요!');
        return;
    }

    const randomIndex = Math.floor(Math.random() * wordList.length);
    speakWord(wordList[randomIndex].english);
}

// 배열 섞기
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    document.getElementById('startKorToEng').addEventListener('click', () => startTest('KorToEng'));
    document.getElementById('startEngToKor').addEventListener('click', () => startTest('EngToKor'));
    document.getElementById('startListenToEng').addEventListener('click', () => startTest('ListenToEng'));
    
    submitAnswerButton.addEventListener('click', checkAnswer);
    answerInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            checkAnswer();
        }
    });

    listenAgainButton.addEventListener('click', () => {
        const currentWord = testWords[currentTestIndex];
        speakWord(currentWord.english);
    });

    retryWrongButton.addEventListener('click', retryWrongWords);
    restartTestButton.addEventListener('click', () => startTest(currentTestMode));
    backToOptionsButton.addEventListener('click', () => {
        testArea.style.display = 'none';
        resultBox.style.display = 'none';
        testOptions.style.display = 'block';
    });

    practiceAllButton.addEventListener('click', practiceAllWords);
    practiceRandomButton.addEventListener('click', practiceRandomWord);

    voiceSelect.addEventListener('change', (e) => {
        selectedVoice = voices.find(voice => voice.name === e.target.value);
    });

    speechRateInput.addEventListener('input', (e) => {
        speechRate = parseFloat(e.target.value);
        speechRateValue.textContent = speechRate.toFixed(1);
    });

    searchInput.addEventListener('input', renderWordList);

    sortByLengthAscButton.addEventListener('click', () => {
        currentSortOrder = 'lengthAsc';
        renderWordList();
    });

    sortByLengthDescButton.addEventListener('click', () => {
        currentSortOrder = 'lengthDesc';
        renderWordList();
    });

    toggleModeButton.addEventListener('click', () => {
        isStudyMode = !isStudyMode;
        toggleModeButton.textContent = isStudyMode ? '일반 모드로 전환' : '학습 모드로 전환';
        document.body.classList.toggle('study-mode', isStudyMode);
        renderWordList();
    });

    shuffleButton.addEventListener('click', () => {
        shuffleArray(wordList);
        renderWordList();
    });
}

// 모바일 키보드 대응
function setupMobileKeyboard() {
    const inputs = document.querySelectorAll('input[type="text"]');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            setTimeout(() => {
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    });
}

// 초기화 함수
function initialize() {
    setupWordInputEvents();
    setupEventListeners();
    setupMobileKeyboard();
    renderWordList();
    renderSpeakingList();
}

// 앱 시작
initialize(); 