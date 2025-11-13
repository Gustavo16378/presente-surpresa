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
    // Controlamos se a galeria já foi mostrada/animada para evitar re-disparar a animação
    let galleryShown = false;
    let galleryAnimated = false;

    function isElementFullyInViewport(el) {
        const rect = el.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
    }

    function focusFirstImageWhenVisible() {
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

    playButton.addEventListener('click', () => {
        const isVisible = gallerySection.classList.contains('visible');

        if (!isVisible) {
            // Mostrar a galeria
            // Se já animamos antes, garantimos que a animação não seja re-executada
            if (galleryAnimated) {
                gallerySection.classList.add('no-anim');
            } else {
                // Removemos qualquer classe no-anim caso venha de um estado anterior
                gallerySection.classList.remove('no-anim');
            }

            gallerySection.classList.add('visible');
            playButton.classList.add('active');
            galleryShown = true;

            // Se a animação rodar (primeira vez), marcamos quando terminar
            if (!galleryAnimated) {
                const onAnimEnd = () => {
                    galleryAnimated = true;
                    gallerySection.classList.add('no-anim');
                    gallerySection.removeEventListener('animationend', onAnimEnd);
                };
                gallerySection.addEventListener('animationend', onAnimEnd);
            }

            // Rola até a galeria e foca ao ficar visível
            gallerySection.scrollIntoView({ behavior: 'smooth' });
            focusFirstImageWhenVisible();
        } else {
            // Ocultar a galeria e voltar o botão ao estado branco (inativo)
            gallerySection.classList.remove('visible');
            // Mantemos a flag galleryAnimated para que, quando mostrado novamente, não reanime
            gallerySection.classList.add('no-anim');
            playButton.classList.remove('active');
        }
    });

    // --- Splash screen (intro) ---
    const splash = document.getElementById('splash');
    const SPLASH_DURATION = 2400; // ms (deve combinar com animation-duration em CSS)
    let splashTimer;
    const splashAudio = document.getElementById('splash-audio');
    let splashPlayBlocked = false;

    function attemptPlaySplashSound() {
        if (!splashAudio) return;
        // tenta tocar; muitos navegadores bloqueiam autoplay sem interação do usuário
        const p = splashAudio.play();
        if (p !== undefined) {
            p.then(() => {
                // tocando normalmente
                splashPlayBlocked = false;
            }).catch((err) => {
                // autoplay bloqueado: aguardamos interação do usuário para tocar
                splashPlayBlocked = true;
                const tryPlayOnUser = () => {
                    splashAudio.play().catch(() => {});
                };
                document.addEventListener('click', tryPlayOnUser, { once: true, capture: true });
                document.addEventListener('keydown', tryPlayOnUser, { once: true });
            });
        }
    }

    function hideSplash() {
        if (!splash) return;
        // marca aria-hidden e remove da visualização
        splash.classList.add('hidden');
        splash.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('splash-active');
        // parar o áudio caso esteja tocando
        if (splashAudio) {
            try { splashAudio.pause(); splashAudio.currentTime = 0; } catch (e) {}
        }
        // liberar foco para o playButton (ou primeiro elemento interativo)
        if (playButton) playButton.focus();
        clearTimeout(splashTimer);
    }

    // Esconder automaticamente após duração definida
    if (splash) {
        // Tenta tocar o áudio da splash (se disponível)
        attemptPlaySplashSound();

        splashTimer = setTimeout(hideSplash, SPLASH_DURATION);

        // Permitir pular a intro com clique ou tecla (Enter, Espaço, Escape)
        splash.addEventListener('click', () => {
            // Se o autoplay foi bloqueado, um clique também tentará tocar o áudio antes de esconder
            if (splashPlayBlocked && splashAudio) {
                splashAudio.play().catch(() => {});
            }
            hideSplash();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                if (splashPlayBlocked && splashAudio) {
                    splashAudio.play().catch(() => {});
                }
                hideSplash();
            }
        });
    }

    infoButton.addEventListener('click', () => alert('Ta querendo demais! kkkkk'));

    // --- Funções do Modal ---
    const openModal = (index) => {
        currentImageIndex = index;
        updateModalImage();
        modal.style.display = 'flex';
    };

    const closeModal = () => modal.style.display = 'none';

    const updateModalImage = () => modalImg.src = galleryImages[currentImageIndex].src;

    const showPrevImage = () => {
        currentImageIndex = (currentImageIndex > 0) ? currentImageIndex - 1 : galleryImages.length - 1;
        updateModalImage();
    };

    const showNextImage = () => {
        currentImageIndex = (currentImageIndex < galleryImages.length - 1) ? currentImageIndex + 1 : 0;
        updateModalImage();
    };

    // --- Eventos de clique e teclado ---
    galleryImages.forEach((img, index) => {
        // Abre o modal ao clicar
        img.addEventListener('click', () => openModal(index));

        // Torna a imagem focável via teclado (acessibilidade)
        img.tabIndex = 0;

        // Abre o modal ao pressionar Enter ou Espaço quando a imagem estiver em foco
        img.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openModal(index);
            }
        });
    });
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });
    document.addEventListener('keydown', (event) => {
        if (modal.style.display === 'flex') {
            if (event.key === 'Escape') closeModal();
            if (event.key === 'ArrowLeft') showPrevImage(); // Mantido para desktop
            if (event.key === 'ArrowRight') showNextImage(); // Mantido para desktop
        }
    });

    // --- LÓGICA PARA ARRASTAR (SWIPE) ---
    let touchStartX = 0;
    let touchEndX = 0;

    modal.addEventListener('touchstart', (event) => {
        touchStartX = event.changedTouches[0].screenX;
    }, { passive: true });

    modal.addEventListener('touchend', (event) => {
        touchEndX = event.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        // Verifica se o deslize foi longo o suficiente
        if (Math.abs(touchEndX - touchStartX) < 50) return;

        if (touchEndX < touchStartX) {
            // Arrastou para a esquerda -> Próxima imagem
            showNextImage();
        }
        if (touchEndX > touchStartX) {
            // Arrastou para a direita -> Imagem anterior
            showPrevImage();
        }
    }
});