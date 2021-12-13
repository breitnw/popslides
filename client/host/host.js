const socket = io("/host");

//Start:
const start = document.getElementById('start');
const joinCodeStart = document.getElementById('joinCodeStart');
const joinCodePresentation = document.getElementById('joinCodePresentation');
const userList = document.getElementById('userList');
const currentSlideDisplay = document.getElementById('currentSlideDisplay')

//Normal presentation:
const presentationDiv = document.getElementById('presentation');
const startQuizButton = document.getElementById('startQuizButton');

//Quiz:
const quizDiv = document.getElementById('quiz');
const leaderList = document.getElementById('leaderList');

socket.on('presentation', function(presentation, quiz) {

    switch (presentation.state) {
        case "start":
            joinCodeStart.innerHTML = presentation['joinCode'];

            while (userList.firstChild) {
                userList.removeChild(userList.firstChild);
            }

            for (var key in presentation['users']) {
                console.log(presentation['users'][key]);
                const item = document.createElement('td');
                item.textContent = presentation['users'][key]['name'];
                userList.appendChild(document.createElement('tr')).appendChild(item);
            }
            break;

        case "presentation":
            start.style.display = 'none';
            quizDiv.style.display = 'none';
            presentationDiv.style.display = 'block';

            joinCodePresentation.innerHTML = "Join Code: " + presentation['joinCode'];
            currentSlideDisplay.innerHTML = "Page " + presentation['currentPage'] + " / " + presentation['numPages'];
            showPage(presentation.currentPage);
            startQuizButton.style.display = (quiz)?"inline-block":"none";
            break;

        //Basically we update the leaderboard
        case "quiz":
            quizDiv.style.display = 'block';
            presentationDiv.style.display = 'none';
            while (leaderList.firstChild) {
                leaderList.removeChild(leaderList.firstChild);
            }
            // Create items array
            var items = Object.keys(presentation['users']).map(function(key) {
                return [presentation['users'][key]['name'], presentation['users'][key]['points']];
            });

            console.log(items);
            // Sort the array based on the second element
            if(items.length > 1) {
                items.sort(function (first, second) {
                    return second[1] - first[1];
                });
            }

            for (let i in items) {
                const l = document.createElement('tr');
                l.innerHTML = '<td class="left">'+items[i][0]+'</td><td class="left">'+items[i][1]+'</td>';
                leaderList.appendChild(l);
            }

    }
});

var presPdf;

function startPresentation(){

    var loadingTask = pdfjsLib.getDocument('/testpdf.pdf');
    loadingTask.promise.then(function(pdf) {
        presPdf = pdf;
        socket.emit('pdfData', pdf.numPages);
        setState('presentation');
    });
}

function setState(state){
    socket.emit('setState', state);
}

function stopQuiz(){
    quizDiv.style.display = 'none';
    presentation.style.display = 'block';
}

//+ or - 1
function changePage(n){
    socket.emit('changePage', n);
}

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

