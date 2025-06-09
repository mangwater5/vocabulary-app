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
        
        // 입력 필드 초기화
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
    for (let i = currentWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentWords[i], currentWords[j]] = [currentWords[j], currentWords[i]];
    }
    wordList = currentWords;
    renderWordList();
});

// 초기 렌더링
renderWordList();
