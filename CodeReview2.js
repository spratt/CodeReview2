"use strict";
const codereview2 = (function() {
    const config = {
        codeDir: 'code',
        commentDir: 'comment',
        mode: 'code',
        opacityStep: 0.1,
        fadeTime: 1000,
        solidTime: 5000,
        openLine: -1,
        comments: {}
    };
    const firebaseConfig = {
        apiKey: "AIzaSyDk04YB7GsAO6oHv0VH3gVil5T2_B0c9co",
        authDomain: "codereview2-e405f.firebaseapp.com",
        databaseURL: "https://codereview2-e405f.firebaseio.com",
        storageBucket: "codereview2-e405f.appspot.com",
        messagingSenderId: "495817769946",
    };
    function toast(message) {
        let opacity = 0;
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
        config.cm.on('beforeSelectionChange', function(i,o) {
            closeComments();
            let start = 1 + o.ranges[0].anchor.line;
            let end = 1 + o.ranges[0].head.line;
            if(start > end) {
                const temp = start;
                start = end;
                end = temp;
            }
            document.getElementById('line-start').value = start;
            document.getElementById('line-end').value = end;
            setSidebarTop(start - 1);
            openSidebar();
        });
        loadComments();
    }
    function newCodeKey() {
        return firebase.database().ref().child(config.codeDir).push().key;
    }
    function submitCode(ob) {
        if(!ob || !ob.text || !ob.lang) throw "Tried to submit invalid code.";
        config.codeKey = newCodeKey();
        ob.time = firebase.database.ServerValue.TIMESTAMP;
        firebase.database().ref(config.codeDir + '/' + config.codeKey).set(ob).
            then(function() {
                toast('Code submitted!');
                history.pushState(null, null,
                                  window.location.href + '?' + config.codeKey);
                switchToReviewMode();
            });
    }
    function loadCode(codeKey) {
        config.codeKey = codeKey;
        firebase.database().ref(config.codeDir + '/' + codeKey).once('value').
            then(function(snapshot) {
                const lang = snapshot.val().lang;
                const time = snapshot.val().time;
                const text = snapshot.val().text;
                const path = codereview2modes[lang].path;
                const mime = codereview2modes[lang].mime;
                config.cm.getDoc().setValue(text);
                setMode(path, mime);
                switchToReviewMode();
            });
    }
    function submitComment(ob) {
        if(!ob || !ob.name || !ob.text || !ob.start || !ob.end)
            throw "Tried to submit invalid comment.";
        ob.time = firebase.database.ServerValue.TIMESTAMP;
        firebase.database().
            ref(config.commentDir + '/' + config.codeKey).push().set(ob).
            then(function() {
                openComments(parseInt(ob.start, 10) - 1);
                document.getElementById('comment-text').value = '';
                toast('Comment submitted!');
            });
    }
    function commentMarker(ob) {
        const marker = document.createElement("div");
        marker.style.color = "#0a0";
        if(ob && ob.open) {
            marker.innerHTML = "◀";
        } else {
            marker.innerHTML = "▶";
        }
        if(ob && ob.callback)
            marker.addEventListener('click', ob.callback);
        return marker;
    }
    function openSidebar() {
        document.getElementById('sidebar').className = '';
    }
    function closeSidebar() {
        document.getElementById('sidebar').className = 'hidden';
    }
    function setSidebarTop(line) {
        const height = config.cm.heightAtLine(line, 'local');
        document.getElementById('sidebar').style = 'top: ' + height + 'px';
    }
    function openComments(line) {
        if(config.openLine > 0)
            closeComments();
        const sidebar = document.getElementById('sidebar');
        for(let comment of config.comments[line]) {
            if(comment === config.comments[line][0]) {
                config.cm.getDoc().setSelection({line:comment.start,ch:0},
                                                {line:comment.end,ch:0});
            }
            const box = document.createElement('div');
            box.className = 'comment';
            box.id = comment.key;
            const nameField = document.createElement('div');
            nameField.innerHTML = comment.name + ' says:';
            box.appendChild(nameField);
            const textField = document.createElement('div');
            textField.innerHTML = comment.text;
            box.appendChild(textField);
            sidebar.appendChild(box);
        }
        setSidebarTop(line);
        openSidebar();
        config.openLine = line;
        config.cm.getDoc().
            setGutterMarker(line, 'mark',
                            commentMarker({open:true,callback:function() {
                                closeComments();
                            }}));
        if(!sidebar.hasChildNodes() ||
           sidebar.firstChild.id !== 'comment-container') {
            throw "Error while moving comment input";
        }
        const commentInput = sidebar.firstChild;
        sidebar.removeChild(commentInput);
        sidebar.appendChild(commentInput);
    }
    function closeComments() {
        closeSidebar();
        const sidebar = document.getElementById('sidebar');
        while(sidebar.hasChildNodes()) {
            if(sidebar.firstChild.id === 'comment-container')
                break;
            else
                sidebar.firstChild.remove();
        }
        closeMarker(config.openLine);
        config.openLine = -1;
    }
    function closeMarker(line) {
        config.cm.getDoc().
            setGutterMarker(line, 'mark',
                            commentMarker({callback:function() {
                                openComments(line);
                            }}));
    }
    function loadComments() {
        let ref =
            firebase.database().ref(config.commentDir + '/' + config.codeKey);
        ref.on('child_added', function(data) {
            const name = data.val().name;
            const text = data.val().text;
            const start = parseInt(data.val().start, 10) - 1;
            const end = data.val().end;
            const time = data.val().time;
            const comment = {key:data.getKey(),
                             name:name,
                             text:text,
                             start:start,
                             end:end,
                             time:time};
            closeMarker(start);
            if(!config.comments[start])
                config.comments[start] = [];
            config.comments[start].push(comment);
        });
    }
    const loaded = [];
    function loadScript(path, callback) {
        if(!path) return;
        if(loaded.indexOf(path) > -1) return callback();
        loaded.push(path);
        const scr = document.createElement('script');
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
        return window.location.search[0] &&
            window.location.search.substring(1);
    }
    function init() {
        const ta = document.getElementById('code');
        config.cm = CodeMirror.fromTextArea(ta,{
            lineNumbers: true,
            gutters: ['mark'],
        });
        firebase.initializeApp(firebaseConfig);
        const codeKey = parseCodeKeyFromURL();
        if(codeKey) {
            config.cm.getDoc().setValue('');
            loadCode(codeKey);
        } else {
            setupModes();
            document.getElementById('submit-code').
                addEventListener('click', function() {
                    const text = config.cm.getDoc().getValue();
                    const select = document.getElementById('lang');
                    const lang = select.options[select.selectedIndex].text;
                    submitCode({text:text, lang:lang});
                });
        }
        document.getElementById('submit-comment').
            addEventListener('click',function() {
                const name = document.getElementById('commenter').value;
                const text = document.getElementById('comment-text').value;
                const start = parseInt(
                    document.getElementById('line-start').value, 10);
                const end = parseInt(
                    document.getElementById('line-end').value,10);
                submitComment({name:name,text:text,start:start,end:end});
            });
        document.getElementById('close-comment').
            addEventListener('click', function() {
                closeSidebar();
            });
    }
    return {init:init, toast:toast};
})();
codereview2.init();
