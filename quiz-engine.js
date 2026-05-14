const config = [
    { id: 'part1', count: 9, hasOptions: true },
    { id: 'part2', count: 2, hasOptions: true },
    { id: 'part3', count: 2, hasOptions: true },
    { id: 'part4', count: 2, hasOptions: true },
    { id: 'part5', count: 1, hasOptions: true },
    { id: 'part6', count: 5, hasOptions: true, passageRef: 'passages_part6' },
    { id: 'part7', count: 6, hasOptions: true, passageRef: 'passages_part7' },
    { id: 'part8', count: 4, hasOptions: false },
    { id: 'part9', count: 4, hasOptions: false },
    { id: 'part10', count: 4, hasOptions: false }
];

const MM_TO_PX = 3.78; 
let currentExamData = [];

async function loadData(file) {
    const res = await fetch(`data/${file}.json`);
    return await res.json();
}

async function buildExam() {
    const output = document.getElementById('examOutput');
    const fSize = document.getElementById('fontSize').value;
    const eCode = document.getElementById('examCode').value;
    
    document.documentElement.style.setProperty('--print-font-size', fSize);
    output.innerHTML = '<div>Đang chuẩn bị đề thi...</div>';

    const p6Arr = await loadData('passages_part6');
    const p7Arr = await loadData('passages_part7');
    const maps = { passages_part6: p6Arr, passages_part7: p7Arr };

    let allElements = [];
    let qGlobalIndex = 1;
    currentExamData = [];

    for (let i = 0; i < config.length; i++) {
        const conf = config[i];
        const questions = await loadData(conf.id);
        let selected = [];
        let currentPassageText = "";

        if (conf.passageRef) {
            let passages = maps[conf.passageRef];
            if (!Array.isArray(passages)) passages = [passages];
            const shuffledPassages = [...passages].sort(() => 0.5 - Math.random());
            
            for (const p of shuffledPassages) {
                const matched = questions.filter(q => {
                    const qTitle = (q.question_reading || q.question || "").toLowerCase().trim();
                    const pTitle = (p.title || "").toLowerCase().trim();
                    
                    return pTitle.includes(qTitle) || qTitle.includes(pTitle);
                });

                if (matched.length > 0) {
                    currentPassageText = p.content;
                    selected = matched.slice(0, conf.count);
                    break;
                }
            }
        } else {
            selected = questions.sort(() => 0.5 - Math.random()).slice(0, conf.count);
        }

        if (selected.length === 0) continue;

        currentExamData.push({ 
            config: conf, 
            questions: selected, 
            passage: currentPassageText,
            partNumber: i + 1 
        });

        if (conf.id === 'part8') allElements.push({ type: 'section-main', text: 'B. PHẦN TỰ LUẬN' });
        else if (i === 0) allElements.push({ type: 'section-main', text: 'A. PHẦN TRẮC NGHIỆM' });

        allElements.push({ type: 'section-part', text: `Part ${i + 1}.`, instruction: selected[0].instruction });
        if (currentPassageText) allElements.push({ type: 'passage', text: currentPassageText });

        selected.forEach((q, sIdx) => {
            let displayQ = q.question;
            allElements.push({ type: 'question', data: q, displayQuestion: displayQ, index: qGlobalIndex++, hasOptions: conf.hasOptions, partId: conf.id });
        });
    }

    // Render logic
    output.innerHTML = '';
    const PAGE_MAX_PX = 1060; 
    let currentPage = createNewPage(eCode, true);
    output.appendChild(currentPage);
    let currentContentArea = currentPage.querySelector('.exam-content');

    for (const el of allElements) {
        const node = document.createElement('div');
        node.innerHTML = renderElement(el);
        const actualNode = node.firstElementChild;
        currentContentArea.appendChild(actualNode);

        if (currentPage.scrollHeight > PAGE_MAX_PX) {
            currentContentArea.removeChild(actualNode);
            currentPage = createNewPage(eCode, false);
            output.appendChild(currentPage);
            currentContentArea = currentPage.querySelector('.exam-content');
            currentContentArea.appendChild(actualNode);
        }
    }

    // Add End Footer
    const lastPage = output.lastElementChild;
    const endFooter = document.createElement('div');
    endFooter.className = 'footer';
    endFooter.innerText = '---------- HẾT ----------';
    lastPage.querySelector('.exam-content').appendChild(endFooter);

    // Create Answer Key Page
    const answerPage = createNewPage(eCode, false);
    answerPage.querySelector('.header').innerHTML = `<div style="text-align:center; font-weight:bold; font-size:14pt; width:100%;">ĐÁP ÁN ĐỀ THI MÃ SỐ: ${eCode}</div>`;
    
    let mcqHtml = '<div style="font-weight:bold; margin-top:20px; border-bottom:1px solid #000;">I. PHẦN TRẮC NGHIỆM</div>';
    mcqHtml += '<div style="display:grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top:10px; margin-bottom:20px;">';
    
    let writingHtml = '<div style="font-weight:bold; margin-top:20px; border-bottom:1px solid #000;">II. PHẦN TỰ LUẬN</div>';
    writingHtml += '<div style="margin-top:10px;">';
    
    let ansIdx = 1;
    currentExamData.forEach(part => {
        part.questions.forEach(q => {
            if (part.config.hasOptions) {
                const labels = ['A', 'B', 'C', 'D'];
                mcqHtml += `<div style="border-bottom:1px solid #eee; padding:4px;"><strong>${ansIdx}.</strong> ${labels[q.answer]}</div>`;
            } else {
                writingHtml += `<div style="margin-bottom:8px;"><strong>${ansIdx}.</strong> ${q.explanation || '................................................'}</div>`;
            }
            ansIdx++;
        });
    });
    
    mcqHtml += '</div>';
    writingHtml += '</div>';
    
    answerPage.querySelector('.exam-content').innerHTML = mcqHtml + writingHtml;
    output.appendChild(answerPage);

    // Final Touch
    document.querySelectorAll('.exam-page').forEach((p, idx, arr) => {
        p.style.minHeight = '297mm';
        p.querySelector('.page-num').innerText = `Trang ${idx + 1}/${arr.length}`;
    });
}

function createNewPage(eCode, isFirst = true) {
    const page = document.createElement('div');
    page.className = 'exam-page';
    let headerHtml = isFirst ? `
        <div class="header">
            <div class="header-left">SỞ GIÁO DỤC VÀ ĐÀO TẠO<br><strong>THÀNH PHỐ CẦN THƠ</strong></div>
            <div class="header-right"><strong>KỲ THI TUYỂN SINH VÀO LỚP 10 THPT</strong><br>NĂM HỌC 2026 - 2027</div>
        </div>
        <div class="title">ĐỀ THAM KHẢO MÔN: TIẾNG ANH (Mã đề: ${eCode})</div>
        <div style="text-align:center; margin-bottom:10px; font-size: 0.9em;">Thời gian làm bài: 60 phút (không kể thời gian phát đề)</div>
    ` : `
        <div class="header" style="border-bottom: 1px dotted #ccc; margin-bottom: 10px;">
            <div style="font-size: 10pt; font-weight: bold;">Đề thi Tuyển sinh 10 - Tiếng Anh - Mã đề ${eCode}</div>
        </div>
    `;
    page.innerHTML = `${headerHtml}<div class="exam-content"></div><div class="page-num"></div>`;
    return page;
}

function renderElement(el) {
    switch (el.type) {
        case 'section-main': return `<div style="text-align:center; font-weight:bold; margin: 15px 0 5px;">${el.text}</div>`;
        case 'section-part': 
            return `<div style="margin-top: 15px; margin-bottom: 8px;"><span class="section-title" style="margin-top:0; display:inline;">${el.text}</span> <span class="instruction" style="display:inline; margin-left:5px;">${el.instruction}</span></div>`;
        case 'passage': return `<div class="passage">${el.text}</div>`;
        case 'question':
            const q = el.data;
            let colClass = '';
            if (el.hasOptions) {
                const isLong = q.options.some(opt => opt.split(' ').filter(w => w.trim()).length > 4);
                if (el.partId === 'part4' || el.partId === 'part5') colClass = 'one-col';
                else if (isLong) colClass = 'two-cols';
                
                let optHtml = `<div class="options ${colClass}">`;
                const labels = ['A', 'B', 'C', 'D'];
                q.options.forEach((opt, idx) => { optHtml += `<span>${labels[idx]}. ${opt}</span>`; });
                optHtml += `</div>`;
                return `<div class="question"><strong>Question ${el.index}:</strong> ${el.displayQuestion}${optHtml}</div>`;
            } else {
                return `<div class="question"><strong>Question ${el.index}:</strong> ${el.displayQuestion}<div style="margin-top:4px;">&#10144; __________________________________________________________________</div></div>`;
            }
    }
}

async function exportToDocx() {
    if (!currentExamData.length) return alert("Vui lòng tạo đề trước!");
    const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = docx;
    const eCode = document.getElementById('examCode').value;
    const children = [
        new Paragraph({ children: [new TextRun({ text: "SỞ GIÁO DỤC VÀ ĐÀO TẠO", bold: true }), new TextRun({ text: "\t\t\tKỲ THI TUYỂN SINH VÀO LỚP 10 THPT", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: "THÀNH PHỐ CẦN THƠ", bold: true }), new TextRun({ text: "\t\t\t\tNĂM HỌC 2026 - 2027", bold: true })] }),
        new Paragraph({ text: "", spacing: { before: 200 } }),
        new Paragraph({ children: [new TextRun({ text: "ĐỀ THAM KHẢO MÔN: TIẾNG ANH", bold: true, size: 28 })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: `(Mã đề: ${eCode})`, bold: true, size: 24 })], alignment: AlignmentType.CENTER }),
        new Paragraph({ text: "A. PHẦN TRẮC NGHIỆM", bold: true, alignment: AlignmentType.CENTER, spacing: { before: 400, after: 200 } }),
    ];

    let qCount = 1;
    currentExamData.forEach(part => {
        if (part.config.id === 'part8') children.push(new Paragraph({ text: "B. PHẦN TỰ LUẬN", bold: true, alignment: AlignmentType.CENTER, spacing: { before: 400, after: 200 } }));
        children.push(new Paragraph({ children: [new TextRun({ text: `Part ${part.partNumber}.`, bold: true }), new TextRun({ text: " " + part.questions[0].instruction, italic: true })], spacing: { before: 200 } }));
        if (part.passage) children.push(new Paragraph({ children: [new TextRun({ text: part.passage })], border: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } }, spacing: { before: 200, after: 200 }, indent: { left: 200, right: 200 } }));
        part.questions.forEach((q, sIdx) => {
            let displayQ = q.question;
            if (part.config.id === 'part6') displayQ = `(${sIdx + 1})`;
            children.push(new Paragraph({ children: [new TextRun({ text: `Question ${qCount}: `, bold: true }), new TextRun(displayQ)], spacing: { before: 100 } }));
            if (part.config.hasOptions) {
                children.push(new Paragraph({ children: q.options.map((opt, idx) => new TextRun({ text: ["A. ", "B. ", "C. ", "D. "][idx] + opt + "\t\t" })) }));
            } else {
                children.push(new Paragraph({ text: "--> __________________________________________________________________", spacing: { before: 100 } }));
            }
            qCount++;
        });
    });

    // Add Answer Key to DOCX
    children.push(new Paragraph({ text: "", pageBreakBefore: true }));
    children.push(new Paragraph({ children: [new TextRun({ text: `ĐÁP ÁN ĐỀ THI MÃ SỐ: ${eCode}`, bold: true, size: 28 })], alignment: AlignmentType.CENTER }));
    
    children.push(new Paragraph({ children: [new TextRun({ text: "I. PHẦN TRẮC NGHIỆM", bold: true })], spacing: { before: 200, after: 100 } }));
    
    let ansIdx = 1;
    let mcqAnswers = [];
    currentExamData.forEach(part => {
        if (part.config.hasOptions) {
            part.questions.forEach(q => {
                const labels = ['A', 'B', 'C', 'D'];
                mcqAnswers.push(`${ansIdx}. ${labels[q.answer]}`);
                ansIdx++;
            });
        }
    });

    // Display MCQs in rows of 5
    for (let i = 0; i < mcqAnswers.length; i += 5) {
        children.push(new Paragraph({
            children: mcqAnswers.slice(i, i + 5).map(ans => new TextRun({ text: ans + "\t\t" }))
        }));
    }

    children.push(new Paragraph({ children: [new TextRun({ text: "II. PHẦN TỰ LUẬN", bold: true })], spacing: { before: 400, after: 100 } }));
    
    // Reset index for writing if needed, or continue
    ansIdx = 1;
    currentExamData.forEach(part => {
        part.questions.forEach(q => {
            if (!part.config.hasOptions) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: `${ansIdx}. `, bold: true }), new TextRun(q.explanation || "")]
                }));
            }
            ansIdx++;
        });
    });

    const doc = new Document({ sections: [{ children }] });
    Packer.toBlob(doc).then(blob => saveAs(blob, `De_Thi_TS10_MaDe_${eCode}.docx`));
}

document.getElementById('exportDocxBtn').onclick = exportToDocx;
window.onload = buildExam;
