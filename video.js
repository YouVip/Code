(function() {
    // ១. ចាក់សោ Domain (កែសម្រួលដើម្បីការពារការចេញ Link ស្ទួន)
    if (window.location.hostname.indexOf("sh41.us") === -1 && window.location.hostname !== "localhost") {
        // បង្ហាញសារព្រមាន
        alert("Unauthorized Source! Redirecting to original site...");
        
        // កំណត់ Link ឱ្យត្រឹមត្រូវ (មាន https:// តែមួយគត់)
        window.location.href = "https://www.sh41.us"; 
        
        // បញ្ឈប់កូដខាងក្រោមមិនឱ្យដើរ
        return; 
    }

    // ២. បិទការពិនិត្យកូដ (ដូចដើមរបស់អ្នក)
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.onkeydown = e => { 
        if(e.keyCode == 123 || (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 74))) return false; 
    };

    

let adTimes = []; 
let triggeredTimes = new Set();
let lastProcessedSecond = -1; 
let checkInterval = null;
let isIframeMode = false; 
let startTimeForIframe = 0; // សម្រាប់គណនាម៉ោង Iframe

function checkMidRoll(currentTime) {
    if (!currentTime || adTimes.length === 0) return;
    let currentSec = Math.floor(currentTime);

    if (currentSec === lastProcessedSecond) return;
    lastProcessedSecond = currentSec;

    adTimes.forEach(time => {
        if (currentSec === time && !triggeredTimes.has(time)) {
            triggeredTimes.add(time);
            
            // ផ្អាកវីដេអូដើម
            if (isYT && ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
            if (!isYT && vjsPlayer && !isIframeMode) vjsPlayer.pause();
            // បើជា Iframe (OK.ru) យើងមិនអាច Pause បានទេ តែយើងគ្រប Ad ពីលើ

            showMidRollAd();
        }
    });
}

function showMidRollAd() {
    const adContainer = document.getElementById('vip-adContainer');
    adContainer.style.display = 'block';

    document.getElementById('vip-videoStoreOverlay').style.display = 'none';
    document.getElementById('vip-tvLogoOverlay').style.display = 'none';
    document.getElementById('vip-tickerOverlay').style.display = 'none';

    if (shuffledAds.length === 0 || currentAdPointer >= shuffledAds.length) {
        shuffledAds = shuffleAdsArray();
        currentAdPointer = 0;
    }

    const adItem = shuffledAds[currentAdPointer++];
    let type = adItem.getAttribute('data-type');
    let link = adItem.getAttribute('data-link');

    const iframe = document.getElementById('vip-adIframe');
    const video = document.getElementById('vip-adDirect');

    iframe.style.display = "none";
    video.style.display = "none";

    if (type === "youtube") {
        iframe.style.display = "block";
        iframe.src = "https://www.youtube.com/embed/" + extractYTID(link) + "?autoplay=1";
    } else {
        video.style.display = "block";
        video.src = link;
        video.play().catch(e => console.log("Auto-play blocked"));
    }

    let timeLeft = 5;
    const timer = document.getElementById('vip-adTimer');
    const skipBtn = document.getElementById('vip-skipBtn');
    const timerBox = document.getElementById('vip-adTimerBox');

    skipBtn.style.display = "none";
    timerBox.style.display = "block";
    timer.innerText = timeLeft;

    if(timerId) clearInterval(timerId);
    timerId = setInterval(() => {
        timeLeft--;
        timer.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerId);
            timerBox.style.display = "none";
            skipBtn.style.display = "block";
        }
    }, 1000);
}

function skipNow() {
    triggerVibrate();
    document.getElementById('vip-adContainer').style.display = 'none';
    
    const adIframe = document.getElementById('vip-adIframe');
    adIframe.src = ""; 
    const adDirect = document.getElementById('vip-adDirect');
    adDirect.pause();
    
    document.getElementById('vip-videoStoreOverlay').style.display = 'flex';
    document.getElementById('vip-tvLogoOverlay').style.display = 'block';
    document.getElementById('vip-tickerOverlay').style.display = 'flex';

    if (document.getElementById('vip-posterArea').style.display !== 'none') {
        document.getElementById('vip-posterArea').style.display = 'none';
        loadMainVideo();
    } else {
        if (isYT && ytPlayer && ytPlayer.playVideo) {
            ytPlayer.playVideo();
        } else if (!isYT && vjsPlayer && !isIframeMode) {
            vjsPlayer.play();
        }
    }
}

function loadMainVideo() {
    if (currentIndex === -1) return;
    let currentEp = episodes[currentIndex];
    let rawLink = currentEp.link;
    
    // កំណត់ម៉ោង Ad សម្រាប់ភាគនីមួយៗឡើងវិញ
    if(currentEp.ad && currentEp.ad.trim() !== "") {
        adTimes = currentEp.ad.split(',').map(x => parseInt(x.trim()));
    } else {
        adTimes = [];
    }
    triggeredTimes.clear(); 
    startTimeForIframe = Date.now(); // ចាប់ផ្ដើមរាប់ម៉ោងសម្រាប់ Iframe

    if (rawLink.includes("youtube.com") || rawLink.includes("youtu.be")) {
        isYT = true; isIframeMode = false;
        vjsCont.style.display = 'none'; ytBox.style.display = 'block';
        if(vjsPlayer) { vjsPlayer.pause(); vjsPlayer.src([]); }
        let ytid = extractYTID(rawLink);
        if (ytPlayer && ytPlayer.loadVideoById) {
            ytPlayer.loadVideoById(ytid);
            setTimeout(() => ytPlayer.playVideo(), 300);
        } else {
            ytBox.innerHTML = '<div id="vip-player"></div>';
            onYouTubeIframeAPIReady();
        }
    } else if (rawLink.includes("ok.ru") || rawLink.includes("facebook.com") || rawLink.includes("dailymotion.com") || rawLink.includes("dai.ly")) {
        isYT = false; isIframeMode = true; 
        vjsCont.style.display = 'none'; ytBox.style.display = 'block';
        if (ytPlayer && ytPlayer.destroy) { ytPlayer.destroy(); ytPlayer = null; }
        let finalLink = rawLink.replace("ok.ru/video/", "ok.ru/videoembed/");
        ytBox.innerHTML = `<iframe id="vip-mainIframe" src="${finalLink}" width="100%" height="100%" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="position:absolute;top:0;left:0;z-index:10;"></iframe>`;
        startCheckInterval();
    } else {
        isYT = false; isIframeMode = false;
        ytBox.style.display = 'none'; vjsCont.style.display = 'block';
        if (ytPlayer && ytPlayer.destroy) { ytPlayer.destroy(); ytPlayer = null; }
        let sources = rawLink.includes(".m3u8") ? [{ type: "application/x-mpegURL", src: rawLink }] : [{ type: "video/mp4", src: rawLink }];
        vjsPlayer.src(sources);
        vjsPlayer.ready(() => { vjsPlayer.play(); });
    }
}

const ytBox = document.getElementById('vip-ytPlayerContainer');
const vjsCont = document.getElementById('vip-directPlayerContainer');
let slideAds = [], currentSlideIndex = 0, episodes = [], currentIndex = -1, timerId, ytPlayer, isYT = false, vjsPlayer, shuffledAds = [], currentAdPointer = 0;

function startCheckInterval() {
    if (checkInterval) return;
    checkInterval = setInterval(() => {
        if (document.hidden) return; 
        if (isYT && ytPlayer && ytPlayer.getCurrentTime) {
            checkMidRoll(ytPlayer.getCurrentTime());
        } else if (!isYT && vjsPlayer && !isIframeMode) {
            checkMidRoll(vjsPlayer.currentTime());
        } else if (isIframeMode) {
            // សម្រាប់ Iframe (OK.ru) ប្រើការគណនាម៉ោងរត់ជំនួស
            let elapsed = (Date.now() - startTimeForIframe) / 1000;
            checkMidRoll(elapsed);
        }
    }, 1000);
}

function stopCheckInterval() { if (checkInterval) { clearInterval(checkInterval); checkInterval = null; } }

vjsPlayer = videojs('vip-my_video', {
    controls: true,
    html5: { hls: { overrideNative: true } },
    controlBar: { children: ["playToggle", "volumePanel", "currentTimeDisplay", "progressControl", "durationDisplay", "fullscreenToggle"] },
    inactivityTimeout: 3000
});
vjsPlayer.on('play', startCheckInterval);
vjsPlayer.on('pause', stopCheckInterval);

function handlePlayClick() {
    triggerVibrate();
    let currentEp = episodes[currentIndex];
    // កំណត់ម៉ោង Ad មុនពេលបង្ហាញ Ad ដំបូង
    if(currentEp.ad && currentEp.ad.trim() !== "") {
        adTimes = currentEp.ad.split(',').map(x => parseInt(x.trim()));
    } else {
        adTimes = [];
    }
    showMidRollAd(); 
}

function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('vip-player', {
        height: '100%', width: '100%',
        playerVars: { 'autoplay': 1, 'controls': 1, 'rel': 0, 'modestbranding': 1 },
        events: { 'onStateChange': (e) => { if(e.data == YT.PlayerState.PLAYING) startCheckInterval(); else stopCheckInterval(); } }
    });
}

function extractYTID(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : url;
}

function getPostEpisodes() {
    const source = document.getElementById('vip-episode-source');
    if (!source) return [];
    const items = source.querySelectorAll('.ep-item');
    let eps = [];
    items.forEach(item => {
        eps.push({
            id: item.getAttribute('data-id'),
            poster: item.getAttribute('data-poster'),
            link: item.getAttribute('data-link'),
            ad: item.getAttribute('data-ad'),
            isNew: item.getAttribute('data-new') === 'true'
        });
    });
    return eps;
}

function shuffleAdsArray() {
    const adItems = Array.from(document.querySelectorAll('#vip-globalAdsConfig .vip-ad-item'));
    let array = [...adItems];
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function triggerVibrate() { if (window.navigator && window.navigator.vibrate) { window.navigator.vibrate(50); } }

function toggleTVMode() {
    const container = document.getElementById('vip-fullContainer'), exitBtn = document.getElementById('vip-exitFsBtn');
    if (!document.fullscreenElement) { 
        if (container.requestFullscreen) container.requestFullscreen();
        exitBtn.style.display = "flex"; 
    } else { 
        if (document.exitFullscreen) document.exitFullscreen();
        exitBtn.style.display = "none"; 
    }
}

function wakePlayerControls() {
    vjsPlayer.userActive(true); 
    if (document.fullscreenElement) { document.getElementById('vip-exitFsBtn').style.display = "flex"; }
}

function updateTickerSlide() {
    const dataContainer = document.getElementById('vip-adData');
    if (slideAds.length === 0) {
        for (let i = 1; i <= 3; i++) {
            let logo = dataContainer.getAttribute('data-logo' + i), text = dataContainer.getAttribute('data-text' + i);
            if (logo && text) slideAds.push({ logo, text });
        }
    }
    if (slideAds.length === 0) return;
    currentSlideIndex = (currentSlideIndex + 1) % slideAds.length;
    const slide = slideAds[currentSlideIndex];
    document.getElementById('vip-tickerAdLogo').src = slide.logo;
    document.getElementById('vip-tickerMarqueeImg').src = slide.logo;
    document.getElementById('vip-tickerMarqueeTxt').innerText = slide.text;
}

document.getElementById('vip-tickerAdText').addEventListener('animationiteration', updateTickerSlide);

document.addEventListener('DOMContentLoaded', () => {
    shuffledAds = shuffleAdsArray();
    const postAd = document.getElementById('vip-postAdData');
    if(postAd) {
        const templateAd = document.getElementById('vip-adData');
        for(let i=1; i<=3; i++) {
            if(postAd.getAttribute('data-logo'+i)) templateAd.setAttribute('data-logo'+i, postAd.getAttribute('data-logo'+i));
            if(postAd.getAttribute('data-text'+i)) templateAd.setAttribute('data-text'+i, postAd.getAttribute('data-text'+i));
        }
    }
    episodes = getPostEpisodes();
    if (episodes.length === 0) return;
    const epId = new URLSearchParams(window.location.search).get('episode');
    currentIndex = epId ? episodes.findIndex(e => e.id === epId) : 0;
    if(currentIndex === -1) currentIndex = 0;
    
    const currentEp = episodes[currentIndex];
    
    if(currentEp.ad && currentEp.ad.trim() !== "") {
        adTimes = currentEp.ad.split(',').map(x => parseInt(x.trim()));
    } else {
        adTimes = []; 
    }

    document.getElementById('vip-displayPartNumber').innerText = currentEp.id;
    document.getElementById('vip-infoTitle').innerHTML = "ភាគ " + currentEp.id;
    document.getElementById('vip-posterArea').style.backgroundImage = `url('${currentEp.poster}')`;
    
    const grid = document.getElementById('vip-epGrid');
    episodes.forEach((ep, i) => {
        const btn = document.createElement('button'); btn.className = 'vip-ep-btn';
        if(currentIndex === i) btn.classList.add('active'); if(ep.isNew) btn.classList.add('is-new');
        btn.innerText = ep.id;
        btn.onclick = () => { triggerVibrate(); const url = new URL(window.location.href); url.searchParams.set('episode', ep.id); window.location.href = url.href; };
        grid.appendChild(btn);
    });
    updateTickerSlide();
});

function nextEpisode() { if (currentIndex < episodes.length - 1) { triggerVibrate(); const url = new URL(window.location.href); url.searchParams.set('episode', episodes[currentIndex + 1].id); window.location.href = url.href; } }
function prevEpisode() { if (currentIndex > 0) { triggerVibrate(); const url = new URL(window.location.href); url.searchParams.set('episode', episodes[currentIndex - 1].id); window.location.href = url.href; } }