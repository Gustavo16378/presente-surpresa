document.addEventListener('DOMContentLoaded', () => {
    // Seletores de elementos
    const playButton = document.querySelector('.play-button');
    const gallerySection = document.querySelector('.gallery');
    const infoButton = document.querySelector('.info-button');
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const galleryImages = Array.from(document.querySelectorAll('.gallery-grid img'));

    let currentImageIndex;

    // --- Ações dos botões Play e Info ---
    let galleryShown = false;
    let galleryAnimated = false;

    function isElementFullyInViewport(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
    }

    function focusFirstImageWhenVisible() {
        if (!gallerySection) return;
        const start = Date.now();
        const timeout = 900; // ms
        const firstImg = gallerySection.querySelector('.gallery-grid img');
        if (!firstImg) return;
        const check = () => {
            if (isElementFullyInViewport(gallerySection) || Date.now() - start > timeout) {
                firstImg.focus();
            } else {
                requestAnimationFrame(check);
            }
        };
        check();
    }

    const recommendationsSection = document.querySelector('.recommendations');

    if (playButton) {
        playButton.addEventListener('click', () => {
            if (!gallerySection) return;
            const galleryIsVisible = gallerySection.classList.contains('visible');

            if (!galleryIsVisible) {
                if (galleryAnimated) {
                    gallerySection.classList.add('no-anim');
                    recommendationsSection && recommendationsSection.classList.add('no-anim');
                } else {
                    gallerySection.classList.remove('no-anim');
                    recommendationsSection && recommendationsSection.classList.remove('no-anim');
                }

                gallerySection.classList.add('visible');
                recommendationsSection && recommendationsSection.classList.add('visible');
                playButton.classList.add('active');
                galleryShown = true;

                if (!galleryAnimated) {
                    const onAnimEnd = () => {
                        galleryAnimated = true;
                        gallerySection.classList.add('no-anim');
                        recommendationsSection && recommendationsSection.classList.add('no-anim');
                        gallerySection.removeEventListener('animationend', onAnimEnd);
                    };
                    gallerySection.addEventListener('animationend', onAnimEnd);
                }

                gallerySection.scrollIntoView({ behavior: 'smooth' });
                focusFirstImageWhenVisible();
            } else {
                gallerySection.classList.remove('visible');
                recommendationsSection && recommendationsSection.classList.remove('visible');
                gallerySection.classList.add('no-anim');
                recommendationsSection && recommendationsSection.classList.add('no-anim');
                playButton.classList.remove('active');
            }
        });
    }

    // --- Splash screen (intro) ---
    const splash = document.getElementById('splash');
    const SPLASH_DURATION = 2400; // ms
    let splashTimer;
    const splashAudio = document.getElementById('splash-audio');
    let splashPlayBlocked = false;

    function attemptPlaySplashSound() {
        if (!splashAudio) return;
        const p = splashAudio.play();
        if (p !== undefined) {
            p.then(() => { splashPlayBlocked = false; }).catch(() => {
                splashPlayBlocked = true;
                const tryPlayOnUser = () => { splashAudio.play().catch(()=>{}); };
                document.addEventListener('click', tryPlayOnUser, { once: true, capture: true });
                document.addEventListener('keydown', tryPlayOnUser, { once: true });
            });
        }
    }

    function hideSplash() {
        if (!splash) return;
        splash.classList.add('hidden');
        splash.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('splash-active');
        if (splashAudio) { try { splashAudio.pause(); splashAudio.currentTime = 0; } catch (e) {} }
        if (playButton) playButton.focus();
        clearTimeout(splashTimer);
    }

    function showSplashSequence() {
        if (!splash) return;
        splash.classList.remove('hidden');
        splash.setAttribute('aria-hidden', 'false');
        document.body.classList.add('splash-active');
        attemptPlaySplashSound();
        splashTimer = setTimeout(hideSplash, SPLASH_DURATION);
        const splashClick = () => { if (splashPlayBlocked && splashAudio) splashAudio.play().catch(()=>{}); hideSplash(); };
        splash.addEventListener('click', splashClick, { once: true });
        document.addEventListener('keydown', function splashKey(e) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                if (splashPlayBlocked && splashAudio) splashAudio.play().catch(()=>{});
                hideSplash();
                document.removeEventListener('keydown', splashKey);
            }
        });
    }

    if (infoButton) infoButton.addEventListener('click', () => alert('Ta querendo demais! kkkkk'));

    // --- Funções do Modal ---
    const openModal = (index) => {
        if (!galleryImages || !galleryImages.length) return;
        currentImageIndex = index;
        updateModalImage();
        if (modal) modal.style.display = 'flex';
    };

    const closeModal = () => { if (modal) modal.style.display = 'none'; };

    const updateModalImage = () => {
        if (!galleryImages || !galleryImages.length) return;
        if (!modalImg) return;
        modalImg.src = galleryImages[currentImageIndex].src;
    };

    const showPrevImage = () => {
        if (!galleryImages || !galleryImages.length) return;
        currentImageIndex = (currentImageIndex > 0) ? currentImageIndex - 1 : galleryImages.length - 1;
        updateModalImage();
    };

    const showNextImage = () => {
        if (!galleryImages || !galleryImages.length) return;
        currentImageIndex = (currentImageIndex < galleryImages.length - 1) ? currentImageIndex + 1 : 0;
        updateModalImage();
    };

    galleryImages.forEach((img, index) => {
        img.addEventListener('click', () => openModal(index));
        img.tabIndex = 0;
        img.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(index); }
        });
    });

    if (modal) modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
    document.addEventListener('keydown', (event) => {
        if (modal && modal.style.display === 'flex') {
            if (event.key === 'Escape') closeModal();
            if (event.key === 'ArrowLeft') showPrevImage();
            if (event.key === 'ArrowRight') showNextImage();
        }
    });

    // swipe no modal
    let touchStartX = 0, touchEndX = 0;
    if (modal) {
        modal.addEventListener('touchstart', (event) => { touchStartX = event.changedTouches[0].screenX; }, { passive: true });
        modal.addEventListener('touchend', (event) => { touchEndX = event.changedTouches[0].screenX; handleSwipe(); }, { passive: true });
    }
    function handleSwipe() {
        if (Math.abs(touchEndX - touchStartX) < 50) return;
        if (touchEndX < touchStartX) showNextImage();
        if (touchEndX > touchStartX) showPrevImage();
    }

    // --- Tela do presente (pre-splash) ---
    const giftScreen = document.getElementById('giftScreen');
    const giftImage = document.getElementById('giftImage');
    const giftCountdownEl = document.getElementById('giftCountdown');
    let giftStarted = false;

    function explodeGift() {
        if (!giftImage || !giftScreen) return;
        giftImage.classList.remove('bobbing');
        giftImage.classList.add('explode');
        if (giftCountdownEl) giftCountdownEl.style.opacity = '0';

        // fallback caso animationend não ocorra
        const fallback = setTimeout(() => {
            if (giftScreen && giftScreen.style.display !== 'none') {
                try { giftScreen.style.display = 'none'; } catch(e) {}
                showSplashSequence();
            }
        }, 900);

        giftImage.addEventListener('animationend', () => {
            clearTimeout(fallback);
            giftScreen.style.display = 'none';
            showSplashSequence();
        }, { once: true });
    }

    function startGiftSequence() {
        if (giftStarted) return;
        giftStarted = true;
        let count = 5;
        if (giftCountdownEl) giftCountdownEl.textContent = count;
        if (giftImage) giftImage.classList.add('bobbing');

        const iv = setInterval(() => {
            count -= 1;
            if (giftCountdownEl) giftCountdownEl.textContent = count > 0 ? count : 0;
            if (count <= 0) {
                clearInterval(iv);
                explodeGift();
            }
        }, 1000);
    }

    if (giftScreen) {
        giftScreen.focus();
        giftScreen.addEventListener('click', startGiftSequence);
        giftScreen.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGiftSequence(); }
        });
    }

    // --- Modal de vídeo (abre quando o usuário clica no card) ---
    const videoCards = Array.from(document.querySelectorAll('.video-card'));
    const videoModal = document.getElementById('videoModal');
    const modalVideo = document.getElementById('modalVideo');
    const closeVideoBtn = document.getElementById('closeVideo');

    function openVideoModal(src) {
        if (!videoModal || !modalVideo) return;
        modalVideo.src = src;
        videoModal.style.display = 'flex';
        videoModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        modalVideo.play().catch(()=>{});
        closeVideoBtn && closeVideoBtn.focus();
    }
    function closeVideoModal() {
        if (!videoModal || !modalVideo) return;
        try { modalVideo.pause(); } catch (e) {}
        modalVideo.removeAttribute('src'); modalVideo.load();
        videoModal.style.display = 'none';
        videoModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
    videoCards.forEach((card) => {
        const src = card.dataset.src;
        card.addEventListener('click', () => openVideoModal(src));
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openVideoModal(src); } });
    });
    videoModal && videoModal.addEventListener('click', (e) => { if (e.target === videoModal) closeVideoModal(); });
    closeVideoBtn && closeVideoBtn.addEventListener('click', closeVideoModal);
    document.addEventListener('click', (e) => {
        const el = e.target;
        if (el && el.closest && el.closest('.video-close')) { e.stopPropagation(); closeVideoModal(); }
    });
    document.addEventListener('keydown', (e) => { if (videoModal && videoModal.style.display === 'flex' && e.key === 'Escape') closeVideoModal(); });
});
