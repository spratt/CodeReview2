"use strict";
const codereview2 = (function() {
    const config = {
        codeDir: 'code',
        commentDir: 'comment',
        mode: 'code',
        opacityStep: 0.1,
        fadeTime: 1000,
        solidTime: 5000,
    };
    const firebaseConfig = {
        apiKey: "AIzaSyDk04YB7GsAO6oHv0VH3gVil5T2_B0c9co",
        authDomain: "codereview2-e405f.firebaseapp.com",
        databaseURL: "https://codereview2-e405f.firebaseio.com",
        storageBucket: "codereview2-e405f.appspot.com",
        messagingSenderId: "495817769946",
    };
    function toast(message) {
        var opacity = 0;
        const toastContainer = document.getElementById('message');
        toastContainer.className = 'hidden';
        toastContainer.innerHTML = message;
        toastContainer.style = 'opacity: ' + opacity;
        toastContainer.className = '';
        function fadeOut() {
            opacity -= config.opacityStep;
            if(opacity <= 0) opacity = 0;
            toastContainer.style = 'opacity: ' + opacity;
            if(opacity > 0)
                setTimeout(fadeOut, config.fadeTime / (1 / config.opacityStep));
        }
        function fadeIn() {
            opacity += config.opacityStep;
            if(opacity >= 1) opacity = 1;
            toastContainer.style = 'opacity: ' + opacity;
            if(opacity === 1) {
                setTimeout(fadeOut, config.solidTime);
            } else {
                setTimeout(fadeIn, config.fadeTime / (1 / config.opacityStep));
            }
        }
        fadeIn();
    }
    function switchToReviewMode() {
        config.mode = 'review';
        config.cm.setOption('readOnly', true);
        document.getElementById('code-key').value = config.codeKey;
        document.getElementById('lang').remove();
        document.getElementById('submit-code').remove();
    }
    function newCodeKey() {
        return firebase.database().ref().child(config.codeDir).push().key;
    }
    function submitCode(ob) {
        if(!ob || !ob.text || !ob.mime) throw "Tried to submit invalid code.";
        config.codeKey = newCodeKey();
        ob.time = firebase.database.ServerValue.TIMESTAMP;
        firebase.database().ref(config.codeDir + '/' + config.codeKey).set(ob).
            then(function() {
                toast('Code submitted!');
                switchToReviewMode();
            });
    }
    function newCommentKey() {
        return firebase.database().ref().child(config.commentDir).push().key;
    }
    function submitComment(ob) {
        if(!ob || !ob.codeKey || !ob.text || !ob.start || !ob.end)
            throw "Tried to submit invalid comment.";
        ob.time = firebase.database.ServerValue.TIMESTAMP;
        firebase.database().
            ref(config.commentDir + '/' + newCommentKey()).set(ob).
            then(function() {
                toast('Comment submitted!');
            });
    }
    const loaded = [];
    function loadScript(path, callback) {
        if(!path) return;
        if(loaded.indexOf(path) > -1) return callback();
        loaded.push(path);
        var scr = document.createElement('script');
        scr.setAttribute('src', path);
        if(callback) {
            if(scr.readyState) {
                scr.onreadystatechange = function() {
                    if(scr.readyState === 'complete' ||
                       scr.readyState === 'loaded')
                        callback();
                }
            } else {
                scr.onload = callback;
            }
        }
        document.getElementsByTagName('body')[0].appendChild(scr);
    }
    function setMode(path, mime) {
        loadScript(path, function() {
            config.cm.setOption('mode', mime);
        });
    }
    function setupModes() {
        const select = document.getElementById('lang');
        Object.keys(codereview2modes).forEach(function(key) {
            const opt = document.createElement('option');
            opt.value = codereview2modes[key].mime;
            opt.innerHTML = key;
            select.appendChild(opt);
        });
        function changeMode() {
            const selection = select.options[select.selectedIndex];
            const key = selection.text;
            const mime = selection.value;
            const path = codereview2modes[key].path;
            setMode(path, mime);
        }
        select.addEventListener('change',changeMode);
        changeMode();
    }
    function parseCodeKeyFromURL() {
        // TODO
    }
    function loadCode(codeKey) {
        config.codeKey = codeKey;
        // TODO
    }
    function loadComments() {
        // TODO
    }
    function init() {
        const ta = document.getElementById('code');
        config.cm = CodeMirror.fromTextArea(ta,{
            lineNumbers: true,
        });
        setupModes();
        firebase.initializeApp(firebaseConfig);
        document.getElementById('submit-code').
            addEventListener('click', function() {
                const text = config.cm.getDoc().getValue();
                const mime = document.getElementById('lang').value;
                submitCode({text:text, mime:mime});
            });
        document.getElementById('submit-comment').
            addEventListener('click',function() {
                const codeKey = document.getElementById('code-key').value;
                const text = document.getElementById('comment').value;
                const start = document.getElementById('line-start').value;
                const end = document.getElementById('line-end').value;
                submitComment({codeKey:codeKey,text:text,start:start,end:end});
            });
    }
    return {init:init, toast:toast};
})();
codereview2.init();
