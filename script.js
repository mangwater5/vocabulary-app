// 단어장 데이터 저장소
let wordList = JSON.parse(localStorage.getItem('wordList')) || [];
let isStudyMode = false;
let currentSortOrder = 'date'; // 'date', 'lengthAsc', or 'lengthDesc'

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
        
        // 버튼 활성화 상태 변경
        menuButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // 섹션 표시 상태 변경
        sections.forEach(section => {
            section.classList.remove('active');
            if (section.id === targetSection) {
                section.classList.add('active');
            }
        });

        // 스피킹 섹션이 활성화되면 단어 목록 새로고침
        if (targetSection === 'speaking') {
            renderSpeakingList();
        }
    });
});

// 입력 필드 유효성 검사
function validateInput(input, pattern) {
    const regex = new RegExp(pattern);
    const isValid = regex.test(input.value);
    input.setCustomValidity(isValid ? '' : input.title);
    return isValid;
}

// 영어 입력 검사
englishInput.addEventListener('compositionstart', function(e) {
    // 한글 입력 시작 시 이벤트 취소
    e.preventDefault();
});

englishInput.addEventListener('focus', function() {
    // 알림 표시
    this.placeholder = '영어만 입력 가능합니다';
    // 영어 입력 모드로 전환 시도
    try {
        if (window.ime) {
            window.ime.mode = 'disabled';
        }
    } catch (e) {
        console.log('IME 전환이 지원되지 않습니다');
    }
});

englishInput.addEventListener('input', function(e) {
    // 입력된 값이 조합 중이 아닐 때만 처리
    if (!e.isComposing) {
        let value = this.value;
        // 영어와 공백만 허용
        value = value.replace(/[^A-Za-z\s]/g, '');
        if (this.value !== value) {
            this.value = value;
        }
        validateInput(this, '^[A-Za-z\\s]+$');
    }
});

englishInput.addEventListener('keydown', function(e) {
    // 한글 입력 방지
    if (e.key === 'Process') {
        e.preventDefault();
    }
});

// 한글 입력 검사
koreanInput.addEventListener('focus', function() {
    // 알림 표시
    this.placeholder = '한글만 입력 가능합니다';
    // 한글 입력 모드로 전환 시도
    try {
        if (window.ime) {
            window.ime.mode = 'active';
        }
    } catch (e) {
        console.log('IME 전환이 지원되지 않습니다');
    }
});

koreanInput.addEventListener('input', function(e) {
    // 입력된 값이 조합 중이 아닐 때만 처리
    if (!e.isComposing) {
        let value = this.value;
        // 한글과 공백만 허용
        value = value.replace(/[^가-힣\s]/g, '');
        if (this.value !== value) {
            this.value = value;
        }
        validateInput(this, '^[가-힣\\s]+$');
    }
});

// Enter 키 이벤트 추가
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

    if (english && korean && 
        validateInput(englishInput, '^[A-Za-z\\s]+$') && 
        validateInput(koreanInput, '^[가-힣\\s]+$')) {
        
        const wordData = {
            id: Date.now(),
            english: english,
            korean: korean,
            timestamp: Date.now()
        };

        wordList.push(wordData);
        localStorage.setItem('wordList', JSON.stringify(wordList));
        renderWordList();
        
        // 입력 필드 초기화
        englishInput.value = '';
        koreanInput.value = '';
        englishInput.focus();
    } else {
        if (!validateInput(englishInput, '^[A-Za-z\\s]+$')) {
            alert('영어 단어는 영문자만 입력 가능합니다.');
            englishInput.focus();
        } else if (!validateInput(koreanInput, '^[가-힣\\s]+$')) {
            alert('한글 뜻은 한글만 입력 가능합니다.');
            koreanInput.focus();
        } else {
            alert('영어 단어와 한글 뜻을 모두 입력해주세요.');
        }
    }
}

// 단어 목록 렌더링
function renderWordList() {
    const searchTerm = searchInput.value.toLowerCase();
    let filteredWords = wordList.filter(word => 
        word.english.toLowerCase().includes(searchTerm) || 
        word.korean.includes(searchTerm)
    );

    // 정렬 적용
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

    // 단어 개수 업데이트
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
    if (confirm('정말로 이 단어를 삭제하시겠습니까?')) {
        wordList = wordList.filter(word => word.id !== id);
        localStorage.setItem('wordList', JSON.stringify(wordList));
        renderWordList();
    }
}

// 단어 발음
function speakWord(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = speechRate;
    
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }
    
    synth.speak(utterance);
}

// 시험 관련 변수
let currentTest = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let correctCount = 0;
let wrongAnswers = [];

// 시험 시작
function startTest(type, questions = null) {
    if (questions) {
        currentQuestions = questions;
    } else {
        if (wordList.length < 1) {
            alert('단어장에 단어를 먼저 추가해주세요!');
            return;
        }
        currentQuestions = [...wordList].sort(() => Math.random() - 0.5);
    }

    currentTest = type;
    currentQuestionIndex = 0;
    correctCount = 0;
    wrongAnswers = [];

    const testOptions = document.querySelector('.test-options');
    const testArea = document.querySelector('.test-area');
    const questionBox = document.querySelector('.question-box');
    const resultBox = document.querySelector('.result-box');

    testOptions.style.display = 'none';
    testArea.style.display = 'block';
    questionBox.style.display = 'block';
    resultBox.style.display = 'none';

    showNextQuestion();
}

// 다음 문제 표시
function showNextQuestion() {
    const questionBox = document.querySelector('.question-box');
    const resultBox = document.querySelector('.result-box');
    
    if (currentQuestionIndex >= currentQuestions.length) {
        // 시험 종료
        questionBox.style.display = 'none';
        resultBox.style.display = 'block';
        
        document.getElementById('correctCount').textContent = correctCount;
        document.getElementById('totalCount').textContent = currentQuestions.length;
        
        // 틀린 단어 표시
        const wrongAnswersDiv = document.getElementById('wrongAnswers');
        wrongAnswersDiv.innerHTML = '<h4>틀린 단어</h4>';
        if (wrongAnswers.length === 0) {
            wrongAnswersDiv.innerHTML += '<p class="perfect-score">축하합니다! 모든 문제를 맞추셨습니다! 🎉</p>';
        } else {
            wrongAnswers.forEach(wrong => {
                wrongAnswersDiv.innerHTML += `
                    <div class="wrong-answer-item">
                        <p><strong>문제:</strong> ${wrong.question}</p>
                        <p><strong>정답:</strong> ${wrong.correct}</p>
                        <p><strong>입력한 답:</strong> ${wrong.userAnswer}</p>
                    </div>
                `;
            });
        }
        return;
    }

    const currentWord = currentQuestions[currentQuestionIndex];
    const question = document.getElementById('question');
    const answer = document.getElementById('answer');
    const progress = document.getElementById('progress');

    // 진행 상황 업데이트
    progress.textContent = `${currentQuestionIndex + 1} / ${currentQuestions.length}`;

    if (currentTest === 'korToEng') {
        question.textContent = currentWord.korean;
        answer.placeholder = '영어 단어를 입력하세요';
    } else {
        question.textContent = currentWord.english;
        answer.placeholder = '한글 뜻을 입력하세요';
    }

    answer.value = '';
    answer.focus();
}

// 답안 체크
function checkAnswer() {
    const userAnswer = document.getElementById('answer').value.trim().toLowerCase();
    const currentWord = currentQuestions[currentQuestionIndex];
    const correctAnswer = currentTest === 'korToEng' ? currentWord.english : currentWord.korean;

    const answerFeedback = document.getElementById('answerFeedback');
    
    if (userAnswer === correctAnswer.toLowerCase()) {
        correctCount++;
        answerFeedback.textContent = '정답입니다! 👍';
        answerFeedback.className = 'answer-feedback correct';
    } else {
        wrongAnswers.push({
            question: currentTest === 'korToEng' ? currentWord.korean : currentWord.english,
            correct: correctAnswer,
            userAnswer: userAnswer
        });
        answerFeedback.textContent = `틀렸습니다. 정답은 "${correctAnswer}" 입니다.`;
        answerFeedback.className = 'answer-feedback wrong';
    }

    // 피드백을 잠시 보여준 후 다음 문제로 이동
    setTimeout(() => {
        currentQuestionIndex++;
        showNextQuestion();
        answerFeedback.textContent = '';
    }, 1500);
}

// 시험 다시 시작
function restartTest() {
    const testOptions = document.querySelector('.test-options');
    const testArea = document.querySelector('.test-area');
    const resultBox = document.querySelector('.result-box');

    testOptions.style.display = 'flex';
    testArea.style.display = 'none';
    resultBox.style.display = 'none';

    // 시험 관련 변수 초기화
    currentTest = null;
    currentQuestions = [];
    currentQuestionIndex = 0;
    correctCount = 0;
    wrongAnswers = [];
}

// 틀린 단어로 다시 시험
function retryWrongWords() {
    if (wrongAnswers.length === 0) {
        alert('틀린 단어가 없습니다!');
        return;
    }
    
    const wrongWords = wrongAnswers.map(wrong => {
        const word = wordList.find(w => 
            w.english === (currentTest === 'korToEng' ? wrong.correct : wrong.question) ||
            w.korean === (currentTest === 'korToEng' ? wrong.question : wrong.correct)
        );
        return word;
    });

    startTest(currentTest, wrongWords);
}

// 이벤트 리스너
addWordButton.addEventListener('click', addNewWord);
document.getElementById('startKorToEng').addEventListener('click', () => startTest('korToEng'));
document.getElementById('startEngToKor').addEventListener('click', () => startTest('engToKor'));
document.getElementById('submitAnswer').addEventListener('click', checkAnswer);
document.getElementById('restartTest').addEventListener('click', restartTest);
document.getElementById('retryWrongWords').addEventListener('click', retryWrongWords);
document.getElementById('backToOptions').addEventListener('click', () => {
    const testOptions = document.querySelector('.test-options');
    const testArea = document.querySelector('.test-area');
    
    testOptions.style.display = 'flex';
    testArea.style.display = 'none';
});

searchInput.addEventListener('input', renderWordList);
toggleModeButton.addEventListener('click', () => {
    isStudyMode = !isStudyMode;
    renderWordList();
});

shuffleButton.addEventListener('click', () => {
    wordList = wordList.sort(() => Math.random() - 0.5);
    renderWordList();
});

sortByLengthAscButton.addEventListener('click', () => {
    currentSortOrder = 'lengthAsc';
    sortByLengthAscButton.classList.add('active');
    sortByLengthDescButton.classList.remove('active');
    renderWordList();
});

sortByLengthDescButton.addEventListener('click', () => {
    currentSortOrder = 'lengthDesc';
    sortByLengthDescButton.classList.add('active');
    sortByLengthAscButton.classList.remove('active');
    renderWordList();
});

voiceSelect.addEventListener('change', (e) => {
    selectedVoice = voices.find(voice => voice.name === e.target.value);
});

speechRateInput.addEventListener('input', (e) => {
    speechRate = parseFloat(e.target.value);
    speechRateValue.textContent = `${speechRate.toFixed(1)}x`;
});

practiceAllButton.addEventListener('click', () => {
    wordList.forEach((word, index) => {
        setTimeout(() => speakWord(word.english), index * 2000);
    });
});

practiceRandomButton.addEventListener('click', () => {
    const randomWord = wordList[Math.floor(Math.random() * wordList.length)];
    if (randomWord) {
        speakWord(randomWord.english);
    }
});

// 답안 입력 필드에 엔터 키 이벤트 추가
document.getElementById('answer').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault(); // 폼 제출 방지
        checkAnswer();
    }
});

// 초기 렌더링
renderWordList(); 