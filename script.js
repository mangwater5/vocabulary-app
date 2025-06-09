// 단어장 데이터 저장소
let wordList = JSON.parse(localStorage.getItem('wordList')) || [];
let isStudyMode = false;
let currentSortOrder = 'date';
let testWords = [];
let currentTestIndex = 0;
let correctAnswers = 0;
let wrongAnswers = [];
let currentTestMode = '';

// DOM 요소
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

// 시험 모드 요소
const testArea = document.querySelector('.test-area');
const testOptions = document.querySelector('.test-options');
const questionElement = document.getElementById('question');
const answerInput = document.getElementById('answer');
const submitAnswerButton = document.getElementById('submitAnswer');
const progressElement = document.getElementById('progress');
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

// 음성 목록 로드
function loadVoices() {
    voices = synth.getVoices().filter(voice => voice.lang.includes('en'));
    voiceSelect.innerHTML = '<option value="">기본 음성</option>' +
        voices.map(voice => `<option value="${voice.name}">${voice.name}</option>`).join('');
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

// Enter 키 이벤트
englishInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        koreanInput.focus();
    }
});

koreanInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        addNewWord();
    }
});

// 단어 추가 기능
function addNewWord() {
    const english = englishInput.value.trim();
    const korean = koreanInput.value.trim();

    if (english && korean) {
        const wordData = {
            id: Date.now(),
            english: english,
            korean: korean,
            timestamp: Date.now()
        };

        wordList.push(wordData);
        localStorage.setItem('wordList', JSON.stringify(wordList));
        renderWordList();
        
        englishInput.value = '';
        koreanInput.value = '';
        englishInput.focus();
    } else {
        alert('영어 단어와 한글 뜻을 모두 입력해주세요.');
    }
}

// 단어 목록 렌더링
function renderWordList() {
    const searchTerm = searchInput.value.toLowerCase();
    let filteredWords = wordList.filter(word => 
        word.english.toLowerCase().includes(searchTerm) || 
        word.korean.includes(searchTerm)
    );

    if (currentSortOrder === 'lengthAsc') {
        filteredWords.sort((a, b) => a.english.length - b.english.length);
    } else if (currentSortOrder === 'lengthDesc') {
        filteredWords.sort((a, b) => b.english.length - a.english.length);
    } else {
        filteredWords.sort((a, b) => b.timestamp - a.timestamp);
    }

    wordContainer.innerHTML = '';
    filteredWords.forEach(word => {
        const wordElement = document.createElement('div');
        wordElement.className = `word-item${isStudyMode ? ' study-mode' : ''}`;
        wordElement.innerHTML = `
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
        `;
        wordContainer.appendChild(wordElement);
    });

    wordCountSpan.textContent = `(${wordList.length}개)`;
}

// 스피킹 목록 렌더링
function renderSpeakingList() {
    speakingContainer.innerHTML = '';
    wordList.forEach(word => {
        const speakElement = document.createElement('div');
        speakElement.className = 'speak-item';
        speakElement.innerHTML = `
            <div>
                <strong>${word.english}</strong> - ${word.korean}
            </div>
            <button onclick="speakWord('${word.english}')" class="speak-btn">
                <i class="fas fa-volume-up"></i>
            </button>
        `;
        speakingContainer.appendChild(speakElement);
    });
}

// 단어 삭제
function deleteWord(id) {
    if (confirm('정말 이 단어를 삭제하시겠습니까?')) {
        wordList = wordList.filter(word => word.id !== id);
        localStorage.setItem('wordList', JSON.stringify(wordList));
        renderWordList();
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

    synth.speak(utterance);
}

// 시험 모드 시작
function startTest(mode) {
    currentTestMode = mode;
    testWords = [...wordList];
    shuffleArray(testWords);
    currentTestIndex = 0;
    correctAnswers = 0;
    wrongAnswers = [];

    testOptions.style.display = 'none';
    testArea.style.display = 'block';
    resultBox.style.display = 'none';
    
    showNextQuestion();
}

// 다음 문제 표시
function showNextQuestion() {
    if (currentTestIndex < testWords.length) {
        const word = testWords[currentTestIndex];
        questionElement.textContent = currentTestMode === 'KorToEng' ? word.korean : word.english;
        answerInput.value = '';
        answerInput.focus();
        progressElement.textContent = `${currentTestIndex + 1} / ${testWords.length}`;
    } else {
        showTestResult();
    }
}

// 답안 체크
function checkAnswer() {
    const currentWord = testWords[currentTestIndex];
    const userAnswer = answerInput.value.trim().toLowerCase();
    const correctAnswer = currentTestMode === 'KorToEng' ? 
        currentWord.english.toLowerCase() : 
        currentWord.korean;

    if (userAnswer === correctAnswer.toLowerCase()) {
        correctAnswers++;
    } else {
        wrongAnswers.push({
            question: currentTestMode === 'KorToEng' ? currentWord.korean : currentWord.english,
            correctAnswer: correctAnswer,
            userAnswer: userAnswer
        });
    }

    currentTestIndex++;
    showNextQuestion();
}

// 시험 결과 표시
function showTestResult() {
    testArea.style.display = 'none';
    resultBox.style.display = 'block';
    
    correctCountElement.textContent = correctAnswers;
    totalCountElement.textContent = testWords.length;
    
    wrongAnswersElement.innerHTML = wrongAnswers.map(wrong => `
        <div class="wrong-item">
            <span class="question">${wrong.question}</span>
            <span class="arrow">→</span>
            <span class="correct">${wrong.correctAnswer}</span>
            <span class="user-answer">(입력: ${wrong.userAnswer})</span>
        </div>
    `).join('');
}

// 틀린 단어만 다시 보기
function retryWrongWords() {
    testWords = wrongAnswers.map(wrong => ({
        english: currentTestMode === 'KorToEng' ? wrong.correctAnswer : wrong.question,
        korean: currentTestMode === 'KorToEng' ? wrong.question : wrong.correctAnswer
    }));
    
    currentTestIndex = 0;
    correctAnswers = 0;
    wrongAnswers = [];
    
    if (testWords.length > 0) {
        testArea.style.display = 'block';
        resultBox.style.display = 'none';
        showNextQuestion();
    } else {
        alert('틀린 단어가 없습니다!');
    }
}

// 시험 다시 시작
function restartTest() {
    startTest(currentTestMode);
}

// 시험 선택으로 돌아가기
function backToTestOptions() {
    testArea.style.display = 'none';
    resultBox.style.display = 'none';
    testOptions.style.display = 'block';
}

// 전체 단어 재생
function practiceAllWords() {
    let index = 0;
    const speakNext = () => {
        if (index < wordList.length) {
            const word = wordList[index];
            speakWord(word.english);
            index++;
            setTimeout(speakNext, 2000); // 2초 간격으로 재생
        }
    };
    speakNext();
}

// 랜덤 단어 재생
function practiceRandomWord() {
    if (wordList.length > 0) {
        const randomIndex = Math.floor(Math.random() * wordList.length);
        speakWord(wordList[randomIndex].english);
    }
}

// 배열 섞기 함수
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 이벤트 리스너 설정
document.getElementById('startKorToEng').addEventListener('click', () => startTest('KorToEng'));
document.getElementById('startEngToKor').addEventListener('click', () => startTest('EngToKor'));
submitAnswerButton.addEventListener('click', checkAnswer);
answerInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
        e.preventDefault();
        checkAnswer();
    }
});
retryWrongButton.addEventListener('click', retryWrongWords);
restartTestButton.addEventListener('click', restartTest);
backToOptionsButton.addEventListener('click', backToTestOptions);
practiceAllButton.addEventListener('click', practiceAllWords);
practiceRandomButton.addEventListener('click', practiceRandomWord);

// 음성 설정 변경 이벤트
voiceSelect.addEventListener('change', (e) => {
    selectedVoice = voices.find(voice => voice.name === e.target.value);
});

speechRateInput.addEventListener('input', (e) => {
    speechRate = parseFloat(e.target.value);
    speechRateValue.textContent = speechRate.toFixed(1);
});

// 검색 기능
searchInput.addEventListener('input', renderWordList);

// 정렬 기능
sortByLengthAscButton.addEventListener('click', () => {
    currentSortOrder = 'lengthAsc';
    renderWordList();
});

sortByLengthDescButton.addEventListener('click', () => {
    currentSortOrder = 'lengthDesc';
    renderWordList();
});

// 학습 모드 토글
toggleModeButton.addEventListener('click', () => {
    isStudyMode = !isStudyMode;
    toggleModeButton.textContent = isStudyMode ? '일반 모드로 전환' : '학습 모드로 전환';
    document.body.classList.toggle('study-mode', isStudyMode);
    renderWordList();
});

// 단어 섞기
shuffleButton.addEventListener('click', () => {
    const currentWords = [...wordList];
    shuffleArray(currentWords);
    wordList = currentWords;
    renderWordList();
});

// 초기 렌더링
renderWordList();
