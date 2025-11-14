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

=======
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

    // controlar visibilidade da galeria E das recomendações juntos
    const recommendationsSection = document.querySelector('.recommendations');

    playButton.addEventListener('click', () => {
        const galleryIsVisible = gallerySection.classList.contains('visible');

        if (!galleryIsVisible) {
            // Preparar animação (evitar re-executar se já rodou antes)
            if (galleryAnimated) {
                gallerySection.classList.add('no-anim');
                recommendationsSection && recommendationsSection.classList.add('no-anim');
            } else {
                gallerySection.classList.remove('no-anim');
                recommendationsSection && recommendationsSection.classList.remove('no-anim');
            }

            // Mostrar ambos
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

            // Rolar até a galeria/recomendações
            gallerySection.scrollIntoView({ behavior: 'smooth' });
            focusFirstImageWhenVisible();
        } else {
            // Ocultar ambos
            gallerySection.classList.remove('visible');
            recommendationsSection && recommendationsSection.classList.remove('visible');
            gallerySection.classList.add('no-anim');
            recommendationsSection && recommendationsSection.classList.add('no-anim');
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
            }).catch(() => {
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

    // Mostra a splash (usado após a sequência do presente)
    function showSplashSequence() {
        if (!splash) return;
        // mostrar splash e tentar tocar áudio
        splash.classList.remove('hidden');
        splash.setAttribute('aria-hidden', 'false');
        document.body.classList.add('splash-active');
        attemptPlaySplashSound();
        splashTimer = setTimeout(hideSplash, SPLASH_DURATION);

        // Permitir pular a intro com clique ou tecla (Enter, Espaço, Escape)
        const splashClick = () => {
            if (splashPlayBlocked && splashAudio) {
                splashAudio.play().catch(() => {});
            }
            hideSplash();
        };
        splash.addEventListener('click', splashClick, { once: true });
        document.addEventListener('keydown', function splashKey(e) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                if (splashPlayBlocked && splashAudio) {
                    splashAudio.play().catch(() => {});
                }
                hideSplash();
                document.removeEventListener('keydown', splashKey);
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

    // --- Tela do presente (pre-splash) ---
    const giftScreen = document.getElementById('giftScreen');
    const giftImage = document.getElementById('giftImage');
    const giftCountdownEl = document.getElementById('giftCountdown');
    let giftStarted = false;

    function explodeGift() {
        if (!giftImage || !giftScreen) return;
        giftImage.classList.remove('bobbing');
        giftImage.classList.add('explode');
        // esconder contador
        if (giftCountdownEl) giftCountdownEl.style.opacity = '0';
        // após animação, ocultar giftScreen e mostrar splash
        giftImage.addEventListener('animationend', () => {
            giftScreen.style.display = 'none';
            // iniciar splash sequence
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
        // iniciar com foco para acessibilidade
        giftScreen.focus();
        giftScreen.addEventListener('click', startGiftSequence);
        giftScreen.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                startGiftSequence();
            }
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
        // mostrar modal
        videoModal.style.display = 'flex';
        videoModal.setAttribute('aria-hidden', 'false');
        // evitar scroll de fundo
        document.body.style.overflow = 'hidden';
        // tenta reproduzir (pode ser bloqueado por autoplay)
        modalVideo.play().catch(() => {});
        // foco para fechar
        closeVideoBtn && closeVideoBtn.focus();
    }

    function closeVideoModal() {
        if (!videoModal || !modalVideo) return;
        try { modalVideo.pause(); } catch (e) {}
        // limpar src para liberar memória e parar download
        modalVideo.removeAttribute('src');
        modalVideo.load();
        videoModal.style.display = 'none';
        videoModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    videoCards.forEach((card) => {
        const src = card.dataset.src;
        // clique
        card.addEventListener('click', (e) => {
            // evitar abrir se o click for no botão interno que não deve propagar
            openVideoModal(src);
        });
        // acessibilidade: abrir com Enter ou Espaço
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openVideoModal(src);
            }
        });
    });

    // Fechar ao clicar fora do player
    videoModal && videoModal.addEventListener('click', (e) => {
        if (e.target === videoModal) closeVideoModal();
    });

    closeVideoBtn && closeVideoBtn.addEventListener('click', closeVideoModal);
    // Fallback delegado: se por algum motivo o botão não capturar o clique,
    // fechamos quando qualquer elemento com a classe .video-close for clicado.
    document.addEventListener('click', (e) => {
        const el = e.target;
        if (el && el.closest && el.closest('.video-close')) {
            // evitar que o clique seja tratado como clique fora do modal
            e.stopPropagation();
            closeVideoModal();
        }
    });

    // Teclado: Escape fecha o modal de vídeo quando aberto
    document.addEventListener('keydown', (e) => {
        if (videoModal && videoModal.style.display === 'flex' && e.key === 'Escape') {
            closeVideoModal();
        }
    });
});
