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

    // 단어 추가 버튼 클릭 이벤트
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
    
    // 입력 필드 초기화 및 포커스
    englishInput.value = '';
    koreanInput.value = '';
    englishInput.focus();
    
    // 단어 목록 업데이트
    renderWordList();
}

// 단어 목록 렌더링
function renderWordList() {
    const searchTerm = searchInput.value.toLowerCase();
    let filteredWords = wordList.filter(word => 
        word.english.toLowerCase().includes(searchTerm) || 
        word.korean.includes(searchTerm)
    );

    // 정렬 적용
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

    // 단어 목록 HTML 생성
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

    // 단어 개수 업데이트
    wordCountSpan.textContent = `(${wordList.length}개)`;
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
        
        // 피드백 초기화
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
    const correctAnswer = currentTestMode === 'KorToEng' ? currentWord.english : currentWord.korean;

    // 대소문자, 공백 처리 개선
    const normalizeAnswer = (text) => {
        return text.toLowerCase().replace(/\s+/g, ' ').trim();
    };

    const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
    
    // 피드백 표시
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
            question: currentTestMode === 'KorToEng' ? currentWord.korean : currentWord.english,
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
    // 시험 영역 숨기고 결과 영역 표시
    testArea.style.display = 'none';
    resultBox.style.display = 'block';

    // 점수 표시
    correctCountElement.textContent = correctAnswers;
    totalCountElement.textContent = testWords.length;

    // 틀린 단어 목록 표시
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

    // 결과 버튼 표시
    restartTestButton.style.display = 'block';
    backToOptionsButton.style.display = 'block';
}

// 틀린 단어만 다시 보기
function retryWrongWords() {
    if (wrongAnswers.length === 0) {
        alert('틀린 단어가 없습니다!');
        return;
    }

    testWords = wrongAnswers.map(wrong => ({
        english: currentTestMode === 'KorToEng' ? wrong.correctAnswer : wrong.question,
        korean: currentTestMode === 'KorToEng' ? wrong.question : wrong.correctAnswer
    }));
    
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
    // 시험 모드 버튼
    document.getElementById('startKorToEng').addEventListener('click', () => startTest('KorToEng'));
    document.getElementById('startEngToKor').addEventListener('click', () => startTest('EngToKor'));
    submitAnswerButton.addEventListener('click', checkAnswer);
    answerInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            checkAnswer();
        }
    });

    // 결과 화면 버튼
    retryWrongButton.addEventListener('click', retryWrongWords);
    restartTestButton.addEventListener('click', () => startTest(currentTestMode));
    backToOptionsButton.addEventListener('click', () => {
        testArea.style.display = 'none';
        resultBox.style.display = 'none';
        testOptions.style.display = 'block';
    });

    // 스피킹 모드 버튼
    practiceAllButton.addEventListener('click', practiceAllWords);
    practiceRandomButton.addEventListener('click', practiceRandomWord);

    // 음성 설정
    voiceSelect.addEventListener('change', (e) => {
        selectedVoice = voices.find(voice => voice.name === e.target.value);
    });

    speechRateInput.addEventListener('input', (e) => {
        speechRate = parseFloat(e.target.value);
        speechRateValue.textContent = speechRate.toFixed(1);
    });

    // 검색 및 정렬
    searchInput.addEventListener('input', renderWordList);
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
}

// 앱 시작
initialize();
