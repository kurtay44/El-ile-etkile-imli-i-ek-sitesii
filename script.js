// === TAÇ VE BOYUT AYARLARI ===
const CICEK_BOYUTU = 40;              
const TAC_INDIRME_CICEK = 4.05; 
const TAC_OFSET_Y = 40;               

const videoElement = document.getElementById('webcam');
const canvas = document.getElementById('cicek-canvas');
const ctx = canvas.getContext('2d');
const sayacText = document.getElementById('sayac');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- PNG GÖRSEL ÖNBELLEKLEME (CACHE) SİSTEMİ ---
const gorseller = {};
for (let i = 1; i <= 19; i++) {
    const dosyaAdi = `flower${i < 10 ? '0' + i : i}.png`;
    const img = new Image();
    img.src = dosyaAdi;
    gorseller[dosyaAdi] = img;
}

let cicekler = [];
let secilenTip = 'Rastgele';

let sonCicekZamani = 0;
let cimdikDurum = false;
let sonYuzNoktalari = null;
let isProcessing = false;
let frameCount = 0;

// === UI KONTROLLERİ ===
const btnRehber = document.getElementById('btn-rehber');
const btnCicekler = document.getElementById('btn-cicekler');
const popupRehber = document.getElementById('popup-rehber');
const popupCicekler = document.getElementById('popup-cicekler');

btnRehber.addEventListener('click', (e) => {
    e.stopPropagation();
    popupCicekler.classList.remove('aktif');
    popupRehber.classList.toggle('aktif');
});

btnCicekler.addEventListener('click', (e) => {
    e.stopPropagation();
    popupRehber.classList.remove('aktif');
    popupCicekler.classList.toggle('aktif');
});

document.querySelectorAll('#popup-cicekler .secenek-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('#popup-cicekler .secenek-btn').forEach(b => b.classList.remove('aktif'));
        btn.classList.add('aktif');
        secilenTip = btn.getAttribute('data-tip');
        popupCicekler.classList.remove('aktif');
    });
});

document.addEventListener('click', () => {
    popupRehber.classList.remove('aktif');
    popupCicekler.classList.remove('aktif');
});

// === ÇİÇEK FİZİK VE ÇİZİM SİSTEMİ (PNG) ===
function yeniCicekEkle(x, y, vx = 0, vy = 0) {
    let secilenDosya;
    if (secilenTip === 'Rastgele') {
        const rastgeleNumara = Math.floor(Math.random() * 19) + 1;
        secilenDosya = `flower${rastgeleNumara < 10 ? '0' + rastgeleNumara : rastgeleNumara}.png`;
    } else {
        secilenDosya = `${secilenTip}.png`;
    }

    cicekler.push({
        x: (1 - x) * canvas.width,
        y: y * canvas.height,
        vx: vx,
        vy: vy,
        gorselAdi: secilenDosya,
        kayiyor: vx !== 0 || vy !== 0
    });
    
    sayacText.innerText = cicekler.length;
}

function animasyonDongusu() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    cicekler.forEach(c => {
        if (c.kayiyor) {
            c.x += c.vx;
            c.y += c.vy;
            c.vx *= 0.88;
            c.vy *= 0.88;
            
            if (Math.abs(c.vx) < 0.2 && Math.abs(c.vy) < 0.2) {
                c.kayiyor = false;
            }
        }
        
        const img = gorseller[c.gorselAdi];
        if (img && img.complete) {
            ctx.drawImage(img, c.x - CICEK_BOYUTU/2, c.y - CICEK_BOYUTU/2, CICEK_BOYUTU, CICEK_BOYUTU);
        }
    });

    requestAnimationFrame(animasyonDongusu);
}
animasyonDongusu();

// === ÖZEL HAREKETLER ===
function cicekleriSil() {
    cicekler = [];
    sayacText.innerText = '0';
}

function patlamaYap(x, y) {
    for (let i = 0; i < 10; i++) {
        const aci = (i / 10) * Math.PI * 2;
        const hiz = 6 + Math.random() * 6;
        yeniCicekEkle(x, y, Math.cos(aci) * hiz, Math.sin(aci) * hiz);
    }
}

function miknatiz(x, y) {
    const hedefX = (1 - x) * canvas.width;
    const hedefY = y * canvas.height;

    for (let c of cicekler) {
        const dx = hedefX - c.x;
        const dy = hedefY - c.y;
        c.vx += dx * 0.05;
        c.vy += dy * 0.05;
        c.kayiyor = true;
    }
}

function yuzTaciYap() {
    if (!sonYuzNoktalari || cicekler.length === 0) return;
    
    const alin = sonYuzNoktalari[10];
    const merkezX = (1 - alin.x) * canvas.width;
    const ekstraIndirme = CICEK_BOYUTU * TAC_INDIRME_CICEK;
    const merkezY = (alin.y * canvas.height) - TAC_OFSET_Y + ekstraIndirme;

    const ekstraGenislikPiksel = 0.33 * CICEK_BOYUTU;
    const yaricapX = ((canvas.width * 0.15) * 1.4) + ekstraGenislikPiksel;
    const yaricapY = CICEK_BOYUTU * 2.1;

    const toplamCicek = cicekler.length;
    cicekler.forEach((c, index) => {
        const aci = (index / Math.max(1, toplamCicek - 1)) * Math.PI;
        c.x = merkezX - Math.cos(aci) * yaricapX;
        c.y = merkezY - Math.sin(aci) * yaricapY;
        c.vx = 0;
        c.vy = 0;
        c.kayiyor = false;
    });
}

function dagit() {
    for (let c of cicekler) {
        c.vx = (Math.random() - 0.5) * 20;
        c.vy = (Math.random() - 0.5) * 20;
        c.kayiyor = true;
    }
}

// === MEDIAPIPE KURULUMLARI (Optimize Edildi) ===
const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});
faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: false,
    minDetectionConfidence: 0.4,
    minTrackingConfidence: 0.4
});
faceMesh.onResults((results) => {
    sonYuzNoktalari = (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) 
        ? results.multiFaceLandmarks[0] 
        : null;
});

const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 0, 
    minDetectionConfidence: 0.3, 
    minTrackingConfidence: 0.3  
});
hands.onResults((results) => {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        cimdikDurum = false;
        return;
    }

    const l = results.multiHandLandmarks[0];

    const isaretY = l[8].y < l[6].y;
    const ortaY = l[12].y < l[10].y;
    const yuzukY = l[16].y < l[14].y;
    const serceY = l[20].y < l[18].y;

    if (!isaretY && !ortaY && !yuzukY && !serceY) {
        cicekleriSil();
        return;
    }

    if (isaretY && ortaY && yuzukY && serceY) {
        dagit();
        return;
    }

    if (isaretY && ortaY && yuzukY && !serceY) {
        yuzTaciYap();
        return;
    }

    if (isaretY && ortaY && !yuzukY && !serceY) {
        miknatiz(l[8].x, l[8].y);
        return;
    }

    const mesafe = Math.hypot(l[8].x - l[4].x, l[8].y - l[4].y);
    if (mesafe < 0.05) {
        cimdikDurum = true;
    } else if (mesafe > 0.1 && cimdikDurum) {
        patlamaYap(l[8].x, l[8].y);
        cimdikDurum = false;
    }

    if (isaretY && !ortaY && !yuzukY && !serceY) {
        if (Date.now() - sonCicekZamani > 15) { 
            yeniCicekEkle(l[8].x, l[8].y);
            sonCicekZamani = Date.now();
        }
    }
});

// Kamera Döngüsü (Kilit ve Seyreltme Mekanizması ile)
const camera = new Camera(videoElement, {
    onFrame: async () => {
        if (isProcessing) return;
        isProcessing = true;

        try {
            await hands.send({ image: videoElement });

            frameCount++;
            if (frameCount % 3 === 0) {
                await faceMesh.send({ image: videoElement });
            }
        } catch (err) {
            console.error(err);
        } finally {
            isProcessing = false;
        }
    },
    width: 640,
    height: 480
});

camera.start();
  
