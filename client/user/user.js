const socket = io("/user");

var state = "start";

//Start:
const start = document.getElementById('start');
const form = document.getElementById('joinup');
const name = document.getElementById('name');
const joinCode = document.getElementById('code')
const joinCodePresentation = document.getElementById('joinCodePresentation');
const currentSlideDisplay = document.getElementById('currentSlideDisplay');

//Wait:
const wait = document.getElementById('wait');

//Presentation:
const presentationDiv = document.getElementById('presentation');

//Quiz:
const quiz = document.getElementById('quiz');
const quizContentDiv = document.getElementById('quizContent')
const quizQuestion = document.getElementById('quizQuestion');
const quizAnswers = document.getElementById('quizAnswers')
const quizWait = document.getElementById('quizWait');
const quizProgress = document.getElementById('quizProgress')

var score = 0;

form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (name.value) {
        socket.emit('join', name.value, joinCode.value, (response) => {
            console.log(response.status);//Will either be "ok" or "error"
            if(response.status==="ok"){
                start.style.display = 'none';
                wait.style.display = 'block';
                var loadingTask = pdfjsLib.getDocument('/testpdf.pdf');
                loadingTask.promise.then(function(pdf) {
                    presPdf = pdf;
                });
            }
        });
    }
});

socket.on('presentation', (presentation) => {

    switch (presentation.state) {
        case "start":
            break;

        case "presentation":
            clearInterval(timeOutInterval);
            clearTimeout(nexQTimeout);
            wait.style.display = 'none';
            quiz.style.display = 'none';
            presentationDiv.style.display = 'block';

            joinCodePresentation.innerHTML = "Score: " + presentation['users'][socket.id].points;
            currentSlideDisplay.innerHTML = "Page " + presentation['currentPage'] + " / " + presentation['numPages'];
            showPage(presentation.currentPage)
            break;

        case "quiz":
            //Load up quiz:
            const qJson = presentation["quizzes"][presentation.currentPage];
            beginQuiz(qJson);
    }

});

var presPdf;

function showPage(num){
    presPdf.getPage(num).then(function(page) {
        var scale = 1.35;
        var viewport = page.getViewport({ scale: scale, });
// Support HiDPI-screens.
        var outputScale = window.devicePixelRatio || 1;

        var canvas = document.getElementById('pdf-can');
        var context = canvas.getContext('2d');

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height =  Math.floor(viewport.height) + "px";

        var transform = outputScale !== 1
            ? [outputScale, 0, 0, outputScale, 0, 0]
            : null;

        var renderContext = {
            canvasContext: context,
            transform: transform,
            viewport: viewport
        };
        page.render(renderContext);
    });
}


function beginQuiz(qJson){
    presentationDiv.style.display = 'none';
    quiz.style.display = 'block';
    displayQuestion(qJson, 0);
}

var timeOutInterval;
var nexQTimeout;
function displayQuestion(qJson, qIdx) {
    if(qJson[qIdx]) {
        quizQuestion.innerHTML = qJson[qIdx]["q"];
        quizContentDiv.style.display = 'block';
        quizWait.style.display = 'none';

        var timeRemaining = qJson[qIdx]['time']
        quizProgress.max = timeRemaining;
        quizProgress.value = timeRemaining;

        const answers = qJson[qIdx]['answers'];

        while (quizAnswers.firstChild) {
            quizAnswers.removeChild(quizAnswers.firstChild);
        }
        for (var i = 0; i < answers.length; i++) {

            const item = document.createElement('button');
            const aIdx = i;
            item.innerHTML = answers[i];
            item.onclick = function () {
                answerQuestion(qJson, aIdx, qIdx);
            };
            item.className = 'quizButton';
            quizAnswers.appendChild(item);
        }
        //Create a timer that after 5 seconds answers(qJson, -1, qIdx)
        timeOutInterval = setInterval(function () {
            if(timeRemaining <= 0){
                answerQuestion(qJson, -1, qIdx);
            }
            timeRemaining -= 100;
            quizProgress.value = timeRemaining;
        }, 100);
    } else {
        //wait for teach to end the quiz
        quizContentDiv.style.display = 'none';
        quizWait.style.display = 'block';
    }
}

function answerQuestion(qJson, aIdx, qIdx) {
    clearInterval(timeOutInterval);
    //Check if answer is correct.
    if (aIdx === qJson[qIdx]["a"]) {
        //Give points.
        score += Math.round(1000 * (0.5 * quizProgress.value/quizProgress.max + 0.5));
        socket.emit('quizData', score);
    } else if (aIdx >= 0) {
        quizAnswers.children[aIdx].style.background = "red";
    }
    // } else {
    //     for (var child in quizAnswers.children) {
    //         console.log()
    //         quizAnswers.children[child].style.background = "red";
    //     }
    // }
    quizAnswers.children[qJson[qIdx]["a"]].style.background = "green";

    for (var child in quizAnswers.children) {
        quizAnswers.children[child].disabled = true; //Disable the children
    }

    nexQTimeout = setTimeout(function () {
        displayQuestion(qJson, qIdx + 1);
    }, 2000);
}