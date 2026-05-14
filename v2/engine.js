let currentExamData = [];
const output = document.getElementById('output');

async function buildExam() {
    const eCode = document.getElementById('examCode').value;
    const fSize = document.getElementById('fontSize').value;
    document.documentElement.style.setProperty('--print-font-size', fSize);
    output.innerHTML = '<div style="margin-top:100px;">Đang khởi tạo bộ đề v3...</div>';

    // 1. Load Modular Data
    try {
        const [questions, readingDict, instDict] = await Promise.all([
            fetch('data/questions_ultralight.json').then(res => res.json()),
            fetch('data/reading.json').then(res => res.json()),
            fetch('data/instruction.json').then(res => res.json())
        ]);

        // 2. Setup Exam Structure
        const config = [
            { id: 'part1', count: 9, hasOptions: true, isPassage: false },
            { id: 'part2', count: 2, hasOptions: true, isPassage: false },
            { id: 'part3', count: 2, hasOptions: true, isPassage: false }, // Signs
            { id: 'part4', count: 2, hasOptions: true, isPassage: false },
            { id: 'part5', count: 2, hasOptions: true, isPassage: false },
            { id: 'part6', count: 1, hasOptions: true, isPassage: false },
            { id: 'part7', count: 5, hasOptions: true, isPassage: true },
            { id: 'part8', count: 6, hasOptions: true, isPassage: true },
            { id: 'part9', count: 4, hasOptions: false, isPassage: false },
            { id: 'part10', count: 4, hasOptions: false, isPassage: false },
            { id: 'part11', count: 4, hasOptions: false, isPassage: false }
        ];

        let allElements = [];
        let qGlobalIndex = 1;
        currentExamData = [];

        for (let i = 0; i < config.length; i++) {
            const conf = config[i];
            const groupId = (i + 1).toString().padStart(2, '0');
            
            // Filter by Smart ID Group (chars 7-8)
            const partQuestions = questions.filter(q => q.id.substring(6, 8) === groupId);
            let selected = [];
            let currentPassageText = "";

            if (conf.isPassage) {
                // Dynamic Discovery: Find unique Reading Indices for this group in the bank
                const availableIdxs = [...new Set(partQuestions.map(q => q.id.substring(8, 10)))];
                if (availableIdxs.length > 0) {
                    const randomIdx = availableIdxs[Math.floor(Math.random() * availableIdxs.length)];
                    const readKey = `READ${groupId}${randomIdx}`; // Matches READ0601, READ0701 etc.
                    
                    if (readingDict[readKey]) {
                        currentPassageText = readingDict[readKey].content;
                        selected = partQuestions.filter(q => q.id.substring(8, 10) === randomIdx);
                    }
                }
            } else {
                selected = partQuestions.sort(() => 0.5 - Math.random()).slice(0, conf.count);
            }

            if (selected.length === 0) continue;

            // ... Options shuffling ...
            selected.forEach(q => {
                if (q.o && q.o.length > 1) {
                    const correctText = q.o[0];
                    const shuffled = [...q.o].sort(() => Math.random() - 0.5);
                    q.o = shuffled;
                    q.answer = shuffled.indexOf(correctText);
                }
            });

            const instText = instDict[groupId] || "";
            currentExamData.push({ config: conf, questions: JSON.parse(JSON.stringify(selected)), passage: currentPassageText, partNumber: i + 1, instructionText: instText });

            // Layout Elements
            if (i === 0) allElements.push({ type: 'section-main', text: 'A. PHẦN TRẮC NGHIỆM' });
            if (conf.id === 'part9') allElements.push({ type: 'section-main', text: 'B. PHẦN TỰ LUẬN' });

            allElements.push({ type: 'section-part', text: `Part ${i + 1}.`, instruction: instText });
            if (currentPassageText) allElements.push({ type: 'passage', text: currentPassageText });

            selected.forEach((q, sIdx) => {
                allElements.push({ type: 'question', data: q, displayQuestion: q.q, index: qGlobalIndex++, hasOptions: conf.hasOptions, partId: conf.id });
            });
        }

        // 3. Final End Marker
        allElements.push({ type: 'end-marker' });

        // 4. Render & Auto-Paging
        renderExam(allElements, eCode);

    } catch (err) {
        output.innerHTML = `<div style="color:red; padding:100px;">Lỗi nạp dữ liệu: ${err.message}</div>`;
    }
}

function renderExam(elements, eCode) {
    output.innerHTML = '';
    const CONTENT_MAX_PX = 920; // Safety threshold for PDF consistency
    let pageCount = 1;

    let currentPage = createNewPage(eCode, true, pageCount++);
    output.appendChild(currentPage);
    let currentContentArea = currentPage.querySelector('.exam-content');

    for (const el of elements) {
        const node = document.createElement('div');
        node.innerHTML = renderElement(el);
        currentContentArea.appendChild(node);

        // Check if content area exceeds limit
        if (currentContentArea.scrollHeight > CONTENT_MAX_PX) {
            currentContentArea.removeChild(node);
            currentPage = createNewPage(eCode, false, pageCount++);
            output.appendChild(currentPage);
            currentContentArea = currentPage.querySelector('.exam-content');
            currentContentArea.appendChild(node);
        }
    }

    // Add Answer Key Page
    const answerPage = createNewPage(eCode, false, pageCount++);
    answerPage.querySelector('.header').innerHTML = `<div style="text-align:center; font-weight:bold; font-size:14pt; width:100%;">ĐÁP ÁN ĐỀ THI MÃ SỐ: ${eCode}</div>`;
    
    let mcqHtml = '<div style="font-weight:bold; margin-top:20px; border-bottom:1px solid #000;">I. PHẦN TRẮC NGHIỆM</div><div style="display:grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top:10px; margin-bottom:20px;">';
    let writingHtml = '<div style="font-weight:bold; margin-top:20px; border-bottom:1px solid #000;">II. PHẦN TỰ LUẬN</div><div style="margin-top:10px;">';
    
    let ansIdx = 1;
    currentExamData.forEach(part => {
        part.questions.forEach(q => {
            if (part.config.hasOptions) {
                mcqHtml += `<div style="border-bottom:1px solid #eee; padding:4px;"><strong>${ansIdx}.</strong> ${['A','B','C','D'][q.answer]}</div>`;
            } else {
                writingHtml += `<div style="margin-bottom:8px;"><strong>${ansIdx}.</strong> ${q.e || '...'}</div>`;
            }
            ansIdx++;
        });
    });
    answerPage.querySelector('.exam-content').innerHTML = mcqHtml + '</div>' + writingHtml + '</div>';
    output.appendChild(answerPage);

    // Update Page Totals
    document.querySelectorAll('.page-num').forEach(el => {
        const pNum = el.innerText.split(' ')[1];
        el.innerText = `Trang ${pNum} / ${pageCount - 1}`;
    });
}

function createNewPage(eCode, isFirst, pNum) {
    const page = document.createElement('div');
    page.className = 'a4-page';
    let header = isFirst ? `
        <div class="header">
            <div>SỞ GIÁO DỤC VÀ ĐÀO TẠO<br><strong>THÀNH PHỐ CẦN THƠ</strong></div>
            <div style="text-align:right;"><strong>KỲ THI TUYỂN SINH VÀO LỚP 10 THPT</strong><br>NĂM HỌC 2026 - 2027</div>
        </div>
        <div class="title">ĐỀ THAM KHẢO MÔN: TIẾNG ANH (Mã đề: ${eCode})</div>
    ` : `<div class="header" style="border-bottom:1px solid #eee; padding-bottom:5px;"><strong>Mã đề: ${eCode} - Tiếp theo</strong></div>`;
    page.innerHTML = `${header}<div class="exam-content"></div><div class="page-num">Trang ${pNum}</div>`;
    return page;
}

function renderElement(el) {
    switch (el.type) {
        case 'section-main': return `<div style="text-align:center; font-weight:bold; margin: 15px 0 5px; color:#000;">${el.text}</div>`;
        case 'section-part': return `<div style="margin-top: 15px; margin-bottom: 8px; color:#000;"><span class="section-title">${el.text}</span> <span class="instruction">${el.instruction}</span></div>`;
        case 'passage': return `<div class="passage" style="color:#000;">${el.text.replace(/\n/g, '<br>')}</div>`;
        case 'end-marker': return `<div style="text-align:center; font-weight:bold; margin: 30px 0; color:#000; width:100%;">--- HẾT ---</div>`;
        case 'question':
            const q = el.data;
            let colClass = 'four-cols';
            let displayQ = el.displayQuestion;

            // Handle [IMG:...] markers
            if (displayQ.includes('[IMG:')) {
                displayQ = displayQ.replace(/\[IMG:(.*?)\]/, (match, imgName) => {
                    let src = imgName.trim();
                    if (!src.includes('.')) src += '.png';
                    return `<div style="text-align:center; margin:10px 0;"><img src="img/${src}" style="max-height:120px; border:1px solid #eee;"></div>`;
                });
            }

            if (el.hasOptions) {
                const isLong = q.o.some(opt => opt.length > 15);
                if (el.partId === 'part9' || el.partId === 'part10' || el.partId === 'part11') colClass = 'one-col';
                else if (isLong) colClass = 'two-cols';
                let optHtml = `<div class="options ${colClass}">` + q.o.map((opt, idx) => `<span><strong>${['A','B','C','D'][idx]}.</strong> ${opt}</span>`).join('') + `</div>`;
                return `<div class="question" style="color:#000;"><strong>Question ${el.index}:</strong> ${displayQ}${optHtml}</div>`;
            } else {
                return `<div class="question" style="color:#000;"><strong>Question ${el.index}:</strong> ${displayQ}<div style="margin-top:4px;">&#10144; __________________________________________________________________</div></div>`;
            }
    }
}

async function exportToDocx() {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = docx;
    const eCode = document.getElementById('examCode').value;
    const children = [
        new Paragraph({ children: [new TextRun({ text: "SỞ GIÁO DỤC VÀ ĐÀO TẠO", bold: true }), new TextRun({ text: "\t\t\tKỲ THI TUYỂN SINH VÀO LỚP 10 THPT", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: "THÀNH PHỐ CẦN THƠ", bold: true }), new TextRun({ text: "\t\t\t\tNĂM HỌC 2026 - 2027", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: `ĐỀ THAM KHẢO MÔN: TIẾNG ANH (Mã đề: ${eCode})`, bold: true, size: 28 })], alignment: AlignmentType.CENTER, spacing: { before: 400 } }),
        new Paragraph({ text: "A. PHẦN TRẮC NGHIỆM", bold: true, alignment: AlignmentType.CENTER, spacing: { before: 400, after: 200 } })
    ];

    let qCount = 1;
    currentExamData.forEach(part => {
        if (part.config.id === 'part9') children.push(new Paragraph({ text: "B. PHẦN TỰ LUẬN", bold: true, alignment: AlignmentType.CENTER, spacing: { before: 400, after: 200 } }));
        children.push(new Paragraph({ children: [new TextRun({ text: `Part ${part.partNumber}.`, bold: true }), new TextRun({ text: " " + part.instructionText, italic: true })], spacing: { before: 200 } }));
        if (part.passage) children.push(new Paragraph({ children: [new TextRun({ text: part.passage })], border: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } }, spacing: { before: 200, after: 200 } }));
        part.questions.forEach((q, sIdx) => {
            let displayQ = q.q;
            if (part.config.id === 'part7') displayQ = `(${sIdx + 1})`; // Part 7 Cloze
            
            // For Word, just strip the [IMG:...] tag or add a placeholder
            displayQ = displayQ.replace(/\[IMG:(.*?)\]/, "(Image: $1) ");

            children.push(new Paragraph({ children: [new TextRun({ text: `Question ${qCount}: `, bold: true }), new TextRun(displayQ)], spacing: { before: 100 } }));
            if (part.config.hasOptions) {
                const optChildren = [];
                part.questions[sIdx].o.forEach((opt, idx) => {
                    optChildren.push(new TextRun({ text: ["A. ", "B. ", "C. ", "D. "][idx], bold: true }));
                    optChildren.push(new TextRun({ text: opt + "\t\t" }));
                });
                children.push(new Paragraph({ children: optChildren }));
            } else {
                children.push(new Paragraph({ text: "--> __________________________________________________________________", spacing: { before: 100 } }));
            }
            qCount++;
        });
    });

    // Final End Marker for Word
    children.push(new Paragraph({ 
        children: [new TextRun({ text: "--- HẾT ---", bold: true })], 
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 400 }
    }));

    // Answer Key
    children.push(new Paragraph({ text: "", pageBreakBefore: true }));
    children.push(new Paragraph({ children: [new TextRun({ text: "ĐÁP ÁN", bold: true, size: 28 })], alignment: AlignmentType.CENTER }));
    let ansIdx = 1;
    currentExamData.forEach(part => {
        part.questions.forEach(q => {
            const ans = part.config.hasOptions ? ['A','B','C','D'][q.answer] : (q.e || "");
            children.push(new Paragraph({ children: [new TextRun({ text: `${ansIdx}. `, bold: true }), new TextRun(ans)] }));
            ansIdx++;
        });
    });

    const doc = new Document({ sections: [{ children }] });
    Packer.toBlob(doc).then(blob => saveAs(blob, `Exam_v3_${eCode}.docx`));
}

document.getElementById('exportDocxBtn').onclick = exportToDocx;
