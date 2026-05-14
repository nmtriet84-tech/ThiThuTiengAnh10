// Config for full exam matching PDF structure
const examConfig = [
    { key: 'Part1', count: 9 },
    { key: 'Part2', count: 2 },
    { key: 'Part3', count: 2 },
    { key: 'Part4', count: 2 },
    { key: 'Part5', count: 1 },
    { key: 'Part6', count: 5 },
    { key: 'Part7', count: 6 },
    { key: 'Part8', count: 4 },
    { key: 'Part9', count: 4 },
    { key: 'Part10', count: 4 }
];

let quizQuestions = [];
let currentIdx = 0;
let score = 0;
let userAnswers = [];

function startQuiz() {
    // Build exam set
    quizQuestions = [];
    examConfig.forEach(conf => {
        const parts = allQuestions.filter(q => q.part === conf.key);
        const selected = parts.sort(() => 0.5 - Math.random()).slice(0, conf.count);
        quizQuestions = quizQuestions.concat(selected);
    });

    userAnswers = new Array(quizQuestions.length).fill(null);
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('quiz-container').style.display = 'block';
    document.getElementById('quiz-footer').style.display = 'flex';
    
    showQuestion();
}

function showQuestion() {
    const q = quizQuestions[currentIdx];
    const questionText = document.getElementById('question-text');
    const optionsList = document.getElementById('options-list');
    const instructionText = document.getElementById('instruction-text');
    const passageContainer = document.getElementById('passage-container');
    const progressBar = document.getElementById('progress-bar');
    const feedback = document.getElementById('feedback-text');

    // Reset UI
    feedback.style.display = 'none';
    optionsList.innerHTML = '';
    
    // Update progress
    progressBar.style.width = `${((currentIdx + 1) / quizQuestions.length) * 100}%`;
    document.getElementById('quiz-title').innerText = `Câu ${currentIdx + 1}/${quizQuestions.length}`;

    // Set Text
    instructionText.innerText = q.instruction || "Chọn đáp án đúng";
    questionText.innerText = q.question;

    // Handle Passage
    if (q.passage) {
        passageContainer.innerText = q.passage;
        passageContainer.style.display = 'block';
    } else {
        passageContainer.style.display = 'none';
    }

    // Render Options
    if (q.options && q.options.length > 1 && q.options[0] !== "") {
        const labels = ['A', 'B', 'C', 'D'];
        q.options.forEach((opt, i) => {
            const btn = document.createElement('div');
            btn.className = 'option-btn';
            btn.innerHTML = `<span style="font-weight:700; margin-right:10px;">${labels[i]}.</span> ${opt}`;
            
            if (userAnswers[currentIdx] === i) btn.classList.add('selected');
            
            btn.onclick = () => selectOption(i);
            optionsList.appendChild(btn);
        });
    } else {
        // Input for Tự luận
        const input = document.createElement('textarea');
        input.placeholder = "Nhập câu trả lời của bạn...";
        input.style.width = '100%';
        input.style.height = '100px';
        input.style.padding = '15px';
        input.style.borderRadius = '12px';
        input.style.border = '2px solid #e2e8f0';
        input.value = userAnswers[currentIdx] || '';
        input.oninput = (e) => { userAnswers[currentIdx] = e.target.value; };
        optionsList.appendChild(input);
    }

    // Navigation buttons
    document.getElementById('prev-btn').style.visibility = currentIdx === 0 ? 'hidden' : 'visible';
    document.getElementById('next-btn').innerText = currentIdx === quizQuestions.length - 1 ? 'Nộp Bài' : 'Tiếp Theo';
}

function selectOption(idx) {
    userAnswers[currentIdx] = idx;
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach((btn, i) => {
        btn.classList.remove('selected');
        if (i === idx) btn.classList.add('selected');
    });
}

function nextQuestion() {
    if (currentIdx < quizQuestions.length - 1) {
        currentIdx++;
        showQuestion();
    } else {
        finishQuiz();
    }
}

function prevQuestion() {
    if (currentIdx > 0) {
        currentIdx--;
        showQuestion();
    }
}

function finishQuiz() {
    score = 0;
    quizQuestions.forEach((q, i) => {
        if (q.options && q.options.length > 1) {
            if (userAnswers[i] === q.answer) score++;
        } else {
            // Self-check for Tự luận (optional logic)
            if (userAnswers[i] && userAnswers[i].trim() !== "") score++; 
        }
    });

    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('quiz-footer').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';
    document.getElementById('final-score').innerText = `${score}/${quizQuestions.length}`;
    
    const msg = document.getElementById('result-msg');
    const percent = (score / quizQuestions.length) * 100;
    if (percent >= 80) msg.innerText = "Tuyệt vời! Bạn đã sẵn sàng đi thi.";
    else if (percent >= 50) msg.innerText = "Khá tốt! Hãy ôn luyện thêm các phần chưa vững.";
    else msg.innerText = "Cần cố gắng nhiều hơn nhé!";
}
