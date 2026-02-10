
// Window Manager and Desktop Logic

class WindowManager {
    constructor() {
        this.windows = document.querySelectorAll('.window');
        this.icons = document.querySelectorAll('.desktop-icon');
        this.taskbarItems = document.querySelector('.taskbar-items');
        this.startBtn = document.querySelector('.start-button');
        this.startMenu = document.querySelector('.start-menu');
        this.zIndex = 100;

        this.setupWindows();
        this.setupIcons();
        this.setupTaskbar();
        this.setupClock();
        this.setupStartup();
        this.setupApps();
    }

    setupStartup() {
        const startupScreen = document.getElementById('startup-screen');
        if (startupScreen) {
            // Play sound
            const audio = new Audio('win98_startup.mp3');
            audio.play().catch(e => console.log('Audio playback failed (interaction needed):', e));

            // Hide after 4 seconds (approx length of sound + bar animation)
            setTimeout(() => {
                startupScreen.style.display = 'none';
            }, 4000);
        }
    }

    setupWindows() {
        this.windows.forEach(win => {
            const titleBar = win.querySelector('.title-bar');
            const closeBtn = win.querySelector('.title-bar-controls button[aria-label="Close"]');
            const maxBtn = win.querySelector('.title-bar-controls button[aria-label="Maximize"]');
            const minBtn = win.querySelector('.title-bar-controls button[aria-label="Minimize"]');
            const titleText = win.querySelector('.title-bar-text').textContent;

            // Dragging
            this.makeDraggable(win, titleBar);

            // Bring to front on click
            win.addEventListener('mousedown', () => this.bringToFront(win));

            // Close button
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeWindow(win));
            }

            // Maximize button
            if (maxBtn) {
                maxBtn.addEventListener('click', () => this.toggleMaximize(win));
            }

            // Minimize button
            if (minBtn) {
                minBtn.addEventListener('click', () => this.minimizeWindow(win));
            }

            // Store title for taskbar
            win.dataset.title = titleText;
        });
    }

    setupIcons() {
        // Initial positioning for icons (simple grid)
        const icons = Array.from(this.icons);
        let row = 0;
        let col = 0;
        const startX = 10;
        const startY = 10;
        const gapX = 100; // width + gap
        const gapY = 100; // height + gap
        const maxRows = Math.floor((window.innerHeight - 28) / gapY);

        icons.forEach((icon, index) => {
            icon.style.left = `${startX + (col * gapX)}px`;
            icon.style.top = `${startY + (row * gapY)}px`;

            row++;
            if (row >= maxRows) {
                row = 0;
                col++;
            }

            // Make draggable
            this.makeDraggable(icon, icon);

            // Double click interaction
            icon.addEventListener('dblclick', () => {
                const targetId = icon.dataset.target;
                const win = document.getElementById(targetId);
                if (win) {
                    this.openWindow(win);
                }
            });

            // Touch support
            let lastTap = 0;
            icon.addEventListener('touchend', (e) => {
                if (icon.classList.contains('dragging')) return;
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                if (tapLength < 500 && tapLength > 0) {
                    const targetId = icon.dataset.target;
                    const win = document.getElementById(targetId);
                    if (win) {
                        this.openWindow(win);
                    }
                    e.preventDefault();
                }
                lastTap = currentTime;
            });
        });
    }

    setupTaskbar() {
        // Start Menu Toggle
        this.startBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.startBtn.classList.toggle('active');
            this.startMenu.style.display = this.startMenu.style.display === 'flex' ? 'none' : 'flex';
        });

        // Close start menu when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!this.startBtn.contains(e.target) && !this.startMenu.contains(e.target)) {
                this.startMenu.style.display = 'none';
                this.startBtn.classList.remove('active');
            }
        });
    }

    setupClock() {
        const updateClock = () => {
            const now = new Date();
            const timeString = new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/New_York',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            }).format(now);

            const timeEl = document.querySelector('.time');
            if (timeEl) timeEl.textContent = timeString;
        };

        setInterval(updateClock, 1000);
        updateClock();
    }

    makeDraggable(element, handle) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const onMouseDown = (e) => {
            if (e.button !== 0) return; // Only left click
            if (element.classList.contains('maximized')) return; // No dragging if maximized

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = element.getBoundingClientRect();
            // Use offsetLeft/Top for relative positioning logic if parent is positioned
            // But getBoundingClientRect is safer for initial delta calculation
            initialLeft = element.offsetLeft;
            initialTop = element.offsetTop;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            // Don't prevent default immediately for icons to allow dblclick? 
            // Actually usually good to prevent default to stop text selection
            // e.preventDefault(); 
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // If moved significantly, mark as dragging (to prevent click events)
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                element.classList.add('dragging');
            }

            element.style.left = `${initialLeft + dx}px`;
            element.style.top = `${initialTop + dy}px`;
            element.style.transform = 'none';
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            setTimeout(() => element.classList.remove('dragging'), 100);
        };

        handle.addEventListener('mousedown', onMouseDown);

        // Touch support
        const onTouchStart = (e) => {
            if (element.classList.contains('maximized')) return;
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            const rect = element.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        };

        const onTouchMove = (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            e.preventDefault();
            element.style.left = `${initialLeft + dx}px`;
            element.style.top = `${initialTop + dy}px`;
        };

        const onTouchEnd = () => {
            isDragging = false;
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        };

        handle.addEventListener('touchstart', onTouchStart, { passive: false });
    }

    bringToFront(win) {
        this.zIndex++;
        win.style.zIndex = this.zIndex;

        // Highlight taskbar item
        const id = win.id;
        document.querySelectorAll('.taskbar-item').forEach(item => {
            if (item.dataset.target === id) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    openWindow(win) {
        if (win.style.display === 'block') {
            this.bringToFront(win);
            // If minimized (visual check logic, though we use display block), restore it
            return;
        }

        win.style.display = 'block';
        this.bringToFront(win);
        this.addTaskbarItem(win);

        // Center if new
        if (!win.style.left) {
            const desktop = document.querySelector('.desktop');
            const rect = win.getBoundingClientRect();
            const deskRect = desktop.getBoundingClientRect();
            win.style.left = `${(deskRect.width - rect.width) / 2}px`;
            win.style.top = `${(deskRect.height - rect.height) / 2}px`;
        }
    }

    closeWindow(win) {
        win.style.display = 'none';
        this.removeTaskbarItem(win);
    }

    minimizeWindow(win) {
        win.style.display = 'none';
        const id = win.id;
        const item = document.querySelector(`.taskbar-item[data-target="${id}"]`);
        if (item) item.classList.remove('active');
    }

    toggleMaximize(win) {
        if (win.classList.contains('maximized')) {
            win.classList.remove('maximized');
            win.style.width = win.dataset.prevWidth || '';
            win.style.height = win.dataset.prevHeight || '';
            win.style.top = win.dataset.prevTop || '';
            win.style.left = win.dataset.prevLeft || '';
        } else {
            const rect = win.getBoundingClientRect();
            win.dataset.prevWidth = win.style.width;
            win.dataset.prevHeight = win.style.height;
            win.dataset.prevTop = win.style.top;
            win.dataset.prevLeft = win.style.left;

            win.classList.add('maximized');
            win.style.width = '100vw';
            win.style.height = 'calc(100vh - 28px)';
            win.style.top = '0';
            win.style.left = '0';
        }
    }

    addTaskbarItem(win) {
        if (document.querySelector(`.taskbar-item[data-target="${win.id}"]`)) return;

        const item = document.createElement('div');
        item.className = 'taskbar-item active';
        item.dataset.target = win.id;

        // Icon
        let iconSrc = 'https://win98icons.alexmeub.com/icons/png/application_hourglass_small-3.png'; // default
        // Try to find matching desktop icon
        const desktopIcon = document.querySelector(`.desktop-icon[data-target="${win.id}"] img`);
        if (desktopIcon) iconSrc = desktopIcon.src;

        item.innerHTML = `
            <img src="${iconSrc}" alt="icon">
            <span>${win.dataset.title}</span>
        `;

        item.addEventListener('click', () => {
            if (win.style.display === 'none') {
                win.style.display = 'block';
                this.bringToFront(win);
            } else {
                // Check if it's the top window
                if (parseInt(win.style.zIndex) === this.zIndex) {
                    this.minimizeWindow(win);
                } else {
                    this.bringToFront(win);
                }
            }
        });

        this.taskbarItems.appendChild(item);
    }

    setupApps() {
        // Notepad Logic
        const notepad = document.getElementById('notepad-content');
        if (notepad) {
            notepad.value = localStorage.getItem('notepad-content') || '';
            notepad.addEventListener('input', () => {
                localStorage.setItem('notepad-content', notepad.value);
            });
        }

        // Audio Player Logic
        const playBtn = document.getElementById('play-btn');
        const stopBtn = document.getElementById('stop-btn');
        const visualizer = document.querySelector('.visualizer');
        const bars = Array.from(visualizer.getElementsByClassName('bar'));

        if (playBtn && stopBtn) {
            let audio = new Audio('canyon.mp3');
            audio.loop = true;

            // Web Audio API Context
            let audioContext;
            let analyser;
            let source;
            let isContextSetup = false;

            const setupAudioContext = () => {
                if (isContextSetup) return;

                const AudioContext = window.AudioContext || window.webkitAudioContext;
                audioContext = new AudioContext();
                analyser = audioContext.createAnalyser();
                source = audioContext.createMediaElementSource(audio);

                source.connect(analyser);
                analyser.connect(audioContext.destination);

                analyser.fftSize = 64; // Small size for chunky retro bars
                isContextSetup = true;
            };

            const updateVisualizer = () => {
                if (!analyser || audio.paused) return;

                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                analyser.getByteFrequencyData(dataArray);

                // Map frequency data to bars
                // We have 7 bars now (from user update), let's distribute them
                const step = Math.floor(bufferLength / bars.length);

                bars.forEach((bar, index) => {
                    const dataIndex = index * step;
                    const value = dataArray[dataIndex];
                    // Convert 0-255 to percentage height (min 10% max 100%)
                    const height = Math.max(10, (value / 255) * 100);
                    bar.style.height = `${height}%`;

                    // Optional: color change based on intensity
                    if (value > 200) bar.style.background = 'red';
                    else if (value > 150) bar.style.background = 'yellow';
                    else bar.style.background = 'lime';
                });

                requestAnimationFrame(updateVisualizer);
            };

            playBtn.addEventListener('click', () => {
                setupAudioContext();

                // Resume context if suspended (browser autoplay policy)
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }

                audio.play().then(() => {
                    visualizer.classList.add('playing');
                    updateVisualizer();
                }).catch(e => console.log('Audio error:', e));
            });

            stopBtn.addEventListener('click', () => {
                audio.pause();
                audio.currentTime = 0;
                bars.forEach(bar => bar.style.height = '10%'); // Reset bars
            });
        }

        // Minesweeper Logic
        this.setupMinesweeper();

        // BSOD Logic (Konami Code)
        let konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        let konamiIndex = 0;
        document.addEventListener('keydown', (e) => {
            if (e.key === konamiCode[konamiIndex]) {
                konamiIndex++;
                if (konamiIndex === konamiCode.length) {
                    this.triggerBSOD();
                    konamiIndex = 0;
                }
            } else {
                konamiIndex = 0;
            }
        });

        // Also trigger BSOD from Shutdown
        const shutdownItem = document.querySelector('.start-item[onclick*="shut_down"]');
        if (shutdownItem) {
            shutdownItem.onclick = null; // Remove old alert
            shutdownItem.addEventListener('click', () => {
                this.triggerBSOD();
            });
        }
    }

    triggerBSOD() {
        const bsod = document.getElementById('bsod');
        bsod.style.display = 'block';
        document.body.style.cursor = 'none';

        const closeBSOD = (e) => {
            e.preventDefault();
            bsod.style.display = 'none';
            document.body.style.cursor = 'auto';
            document.removeEventListener('keydown', closeBSOD);
            document.removeEventListener('click', closeBSOD);
        };

        // Slight delay before allowing close so user sees it
        setTimeout(() => {
            document.addEventListener('keydown', closeBSOD);
            document.addEventListener('click', closeBSOD);
        }, 1000);
    }

    setupMinesweeper() {
        const grid = document.getElementById('minesweeper-grid');
        const faceBtn = document.getElementById('face-btn');
        const mineCountDisplay = document.getElementById('mine-count');

        let width = 9;
        let height = 9;
        let mineCount = 10;
        let cells = [];
        let isGameOver = false;

        const createBoard = () => {
            grid.innerHTML = '';
            cells = [];
            isGameOver = false;
            faceBtn.textContent = '😊';
            mineCountDisplay.textContent = mineCount.toString().padStart(3, '0');

            // Create cells
            const emptyArray = Array(width * height).fill('valid');
            const minesArray = Array(mineCount).fill('mine');
            const gameArray = emptyArray.concat(minesArray);

            // Note: simple randomization, might put mines at end if not sliced correctly. 
            // Fixed logic:
            const totalCells = width * height;
            const mines = Array(totalCells).fill(false);
            let minesPlaced = 0;
            while (minesPlaced < mineCount) {
                const idx = Math.floor(Math.random() * totalCells);
                if (!mines[idx]) {
                    mines[idx] = true;
                    minesPlaced++;
                }
            }

            for (let i = 0; i < totalCells; i++) {
                const cell = document.createElement('div');
                cell.setAttribute('id', i);
                cell.classList.add('mine-cell');
                cell.dataset.isMine = mines[i];
                grid.appendChild(cell);
                cells.push(cell);

                // Normal Click
                cell.addEventListener('click', () => {
                    click(cell);
                });

                // Right Click
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    addFlag(cell);
                });
            }
        };

        const addFlag = (cell) => {
            if (isGameOver) return;
            if (!cell.classList.contains('revealed')) {
                if (!cell.classList.contains('flag')) {
                    cell.classList.add('flag');
                    cell.textContent = '🚩';
                    // Update counter logic could go here
                } else {
                    cell.classList.remove('flag');
                    cell.textContent = '';
                }
            }
        };

        const click = (cell) => {
            if (isGameOver) return;
            if (cell.classList.contains('revealed') || cell.classList.contains('flag')) return;

            if (cell.dataset.isMine === 'true') {
                gameOver();
            } else {
                let total = 0;
                const isLeftEdge = (parseInt(cell.id) % width === 0);
                const isRightEdge = (parseInt(cell.id) % width === width - 1);
                const id = parseInt(cell.id);

                // Check neighbors
                const check = (idx) => {
                    if (idx >= 0 && idx < width * height && cells[idx].dataset.isMine === 'true') total++;
                };

                if (!isLeftEdge) {
                    check(id - 1); // West
                    check(id - 1 - width); // North-West
                    check(id - 1 + width); // South-West
                }
                if (!isRightEdge) {
                    check(id + 1); // East
                    check(id + 1 - width); // North-East
                    check(id + 1 + width); // South-East
                }
                check(id - width); // North
                check(id + width); // South

                if (total !== 0) {
                    cell.classList.add('revealed');
                    cell.textContent = total;
                    cell.style.color = getNumberColor(total);
                    return;
                }

                // If 0, reveal neighbors (recursion)
                checkSquare(cell, id);
            }
            // Check for win logic could go here
        };

        const getNumberColor = (n) => {
            switch (n) {
                case 1: return 'blue';
                case 2: return 'green';
                case 3: return 'red';
                case 4: return 'darkblue';
                default: return 'black';
            }
        };

        const checkSquare = (cell, currentId) => {
            const isLeftEdge = (currentId % width === 0);
            const isRightEdge = (currentId % width === width - 1);

            setTimeout(() => {
                if (isGameOver) return;

                const check = (id) => {
                    if (id >= 0 && id < width * height) {
                        const newCell = cells[id];
                        click(newCell);
                    }
                };

                if (!isLeftEdge) {
                    check(currentId - 1);
                    check(currentId - 1 - width);
                    check(currentId + width - 1);
                }
                if (!isRightEdge) {
                    check(currentId + 1);
                    check(currentId + 1 - width);
                    check(currentId + width + 1);
                }
                check(currentId - width);
                check(currentId + width);

                cell.classList.add('revealed');
            }, 10);
        };

        const gameOver = () => {
            isGameOver = true;
            faceBtn.textContent = '😵';
            cells.forEach(cell => {
                if (cell.dataset.isMine === 'true') {
                    cell.textContent = '💣';
                    cell.classList.add('revealed', 'mine');
                }
            });
        };

        faceBtn.addEventListener('click', createBoard);
        createBoard();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WindowManager();
});
