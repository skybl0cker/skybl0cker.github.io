
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
        this.icons.forEach(icon => {
            icon.addEventListener('dblclick', () => {
                const targetId = icon.dataset.target;
                const win = document.getElementById(targetId);
                if (win) {
                    this.openWindow(win);
                }
            });

            // Touch support for mobile (double tap simulation)
            let lastTap = 0;
            icon.addEventListener('touchend', (e) => {
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
            initialLeft = rect.left;
            initialTop = rect.top;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            element.style.left = `${initialLeft + dx}px`;
            element.style.top = `${initialTop + dy}px`;
            element.style.transform = 'none';
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
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

    removeTaskbarItem(win) {
        const item = document.querySelector(`.taskbar-item[data-target="${win.id}"]`);
        if (item) item.remove();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WindowManager();
});
