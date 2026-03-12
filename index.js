/**
 * Gallery Panels Extension for SillyTavern
 *
 * Opens gallery images and videos in resizable, moveable, popout-capable
 * floating panels. Does NOT modify the default gallery extension.
 */

import { delay } from '../../../utils.js';

const EXT_NAME = 'GalleryPanels';
const PANEL_CLASS = 'ga-panel';
let panelCounter = 0;
let zCounter = 9000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function isVideo(url) {
    return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function bringToFront(panel) {
    panel.style.zIndex = String(++zCounter);
}

// ── Panel Creation ────────────────────────────────────────────────────────────

function createResizablePanel(url, label) {
    label = label || '';
    const id = 'ga_panel_' + (++panelCounter);
    const container = document.getElementById('movingDivs') || document.body;

    const panel = document.createElement('div');
    panel.id = id;
    panel.className = PANEL_CLASS;
    panel.setAttribute('data-ga-url', url);

    // ── Header / drag bar ──
    const header = document.createElement('div');
    header.className = 'ga-header';
    header.title = 'Drag to move';

    const labelEl = document.createElement('span');
    labelEl.className = 'ga-label';
    try {
        labelEl.textContent = label || decodeURIComponent(url.split('/').pop().split('?')[0]);
    } catch (e) {
        labelEl.textContent = label || url.split('/').pop();
    }

    const btnRow = document.createElement('div');
    btnRow.className = 'ga-btn-row';

    const fitBtn = document.createElement('button');
    fitBtn.className = 'ga-btn ga-fit-btn';
    fitBtn.title = 'Maximise in viewport';
    fitBtn.innerHTML = '&#x26F6;';
    fitBtn.addEventListener('click', () => maxPanel(panel));

    const resetBtn = document.createElement('button');
    resetBtn.className = 'ga-btn ga-reset-btn';
    resetBtn.title = 'Reset size';
    resetBtn.innerHTML = '&#x229F;';
    resetBtn.addEventListener('click', () => resetPanel(panel));

    const popoutBtn = document.createElement('button');
    popoutBtn.className = 'ga-btn ga-popout-btn';
    popoutBtn.title = 'Pop out to new window';
    popoutBtn.innerHTML = '&#x2197;';
    popoutBtn.addEventListener('click', () => popoutPanel(url));

    const closeBtn = document.createElement('button');
    closeBtn.className = 'ga-btn ga-close-btn';
    closeBtn.title = 'Close';
    closeBtn.innerHTML = '&#x2715;';
    closeBtn.addEventListener('click', () => panel.remove());

    btnRow.appendChild(fitBtn);
    btnRow.appendChild(resetBtn);
    btnRow.appendChild(popoutBtn);
    btnRow.appendChild(closeBtn);
    header.appendChild(labelEl);
    header.appendChild(btnRow);

    // ── Media ──
    const mediaWrap = document.createElement('div');
    mediaWrap.className = 'ga-media-wrap';

    let media;
    if (isVideo(url)) {
        media = document.createElement('video');
        media.src = url;
        media.controls = true;
        media.autoplay = true;
        media.loop = false;
    } else {
        media = document.createElement('img');
        media.src = url;
        media.draggable = false;
        media.addEventListener('load', () => autoSize(panel, media));
    }
    media.className = 'ga-media';
    mediaWrap.appendChild(media);

    // ── Resize handles ──
    const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
    for (const dir of directions) {
        const handle = document.createElement('div');
        handle.className = 'ga-resize-handle ga-resize-' + dir;
        handle.setAttribute('data-dir', dir);
        panel.appendChild(handle);
    }

    panel.appendChild(header);
    panel.appendChild(mediaWrap);
    container.appendChild(panel);

    // ── Initial position: centered within the left 30% column ──
    // autoSize will correct dimensions once the image loads; this is just the placeholder.
    const col = Math.round(window.innerWidth * 0.30);
    const initW = col - 32; // 16px margin each side
    const initH = Math.round(window.innerHeight * 0.50);
    panel.style.width = initW + 'px';
    panel.style.height = initH + 'px';
    panel.style.left = '16px';
    panel.style.top = Math.round((window.innerHeight - initH) / 2) + 'px';

    bringToFront(panel);
    attachDrag(panel, header);
    attachResize(panel);
    panel.addEventListener('mousedown', () => bringToFront(panel));

    return panel;
}

// ── Sizing helpers ────────────────────────────────────────────────────────────

function autoSize(panel, img) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const headerEl = panel.querySelector('.ga-header');
    const headerH = headerEl ? headerEl.offsetHeight : 24;

    // The left pane column is 30% of the viewport width.
    // We leave 16px margin on each side within that column.
    const colW = vw * 0.30;
    const maxW = colW - 32;
    const maxH = vh - 32;

    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    if (!naturalW || !naturalH) return;

    const scale = Math.min(1, maxW / naturalW, (maxH - headerH) / naturalH);
    const w = Math.round(naturalW * scale);
    const h = Math.round(naturalH * scale) + headerH;

    // Center horizontally within the left column, center vertically in viewport
    const left = Math.round((colW - w) / 2);
    const top  = Math.round((vh - h) / 2);

    panel.style.width  = w + 'px';
    panel.style.height = h + 'px';
    panel.style.left   = Math.max(8, left) + 'px';
    panel.style.top    = Math.max(8, top)  + 'px';
}

function maxPanel(panel) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    panel.style.width = (vw - 32) + 'px';
    panel.style.height = (vh - 32) + 'px';
    panel.style.left = '16px';
    panel.style.top = '16px';
}

function resetPanel(panel) {
    const img = panel.querySelector('img.ga-media');
    if (img && img.complete && img.naturalWidth) {
        autoSize(panel, img);
    } else {
        panel.style.width = '600px';
        panel.style.height = '500px';
    }
}

function popoutPanel(url) {
    const w = Math.min(1200, screen.availWidth);
    const h = Math.min(900, screen.availHeight);
    const win = window.open('', '_blank', `width=${w},height=${h},resizable=yes,scrollbars=no`);
    if (!win) {
        console.warn('[GalleryPanels] Pop-out blocked — allow popups for this page.');
        return;
    }
    const filename = url.split('/').pop();
    const isVid = isVideo(url);
    win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${filename}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #0e0e12; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  img, video { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
</style>
</head>
<body>
${isVid
    ? `<video src="${url}" controls autoplay style="width:100%;height:100%;"></video>`
    : `<img src="${url}" alt="${filename}">`
}
</body>
</html>`);
    win.document.close();
}

// ── Drag (move) ───────────────────────────────────────────────────────────────

function attachDrag(panel, handle) {
    handle.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        // Don't start drag when clicking a button inside the header
        let t = e.target;
        while (t && t !== handle) {
            if (t.tagName === 'BUTTON') return;
            t = t.parentElement;
        }

        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = parseInt(panel.style.left, 10) || 0;
        const startTop = parseInt(panel.style.top, 10) || 0;

        function onMove(e) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            panel.style.left = clamp(startLeft + dx, -panel.offsetWidth + 80, window.innerWidth - 80) + 'px';
            panel.style.top = clamp(startTop + dy, 0, window.innerHeight - 40) + 'px';
        }

        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
}

// ── Resize ────────────────────────────────────────────────────────────────────

const MIN_W = 180;
const MIN_H = 120;

function attachResize(panel) {
    panel.querySelectorAll('.ga-resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();

            const dir = handle.getAttribute('data-dir');
            const startX = e.clientX;
            const startY = e.clientY;
            const startW = panel.offsetWidth;
            const startH = panel.offsetHeight;
            const startLeft = parseInt(panel.style.left, 10) || 0;
            const startTop = parseInt(panel.style.top, 10) || 0;

            function onMove(e) {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                let newW = startW, newH = startH, newLeft = startLeft, newTop = startTop;

                if (dir.includes('e')) newW = Math.max(MIN_W, startW + dx);
                if (dir.includes('w')) { newW = Math.max(MIN_W, startW - dx); newLeft = startLeft + (startW - newW); }
                if (dir.includes('s')) newH = Math.max(MIN_H, startH + dy);
                if (dir.includes('n')) { newH = Math.max(MIN_H, startH - dy); newTop = startTop + (startH - newH); }

                panel.style.width = newW + 'px';
                panel.style.height = newH + 'px';
                panel.style.left = newLeft + 'px';
                panel.style.top = newTop + 'px';
            }

            function onUp() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            }

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    });
}

// ── Patch fnThumbnailOpen ─────────────────────────────────────────────────────
//
// The gallery extension passes fnThumbnailOpen: viewWithDragbox to nanogallery2.
// That callback receives the ngy2 item array, and items[0].responsiveURL() returns
// the actual full-size file path — the only reliable source of truth.
//
// We override fnThumbnailOpen on the #dragGallery element after nanogallery2
// initialises it. We watch for #dragGallery to appear (or reappear after
// gallery refreshes) using a MutationObserver, then call:
//
//   $('#dragGallery').nanogallery2('option', 'fnThumbnailOpen', ourCallback)
//
// Our callback receives the same items array, pulls the URL via responsiveURL(),
// and opens our resizable panel instead of the default draggable box.

function patchGallery(galleryEl) {
    try {
        $(galleryEl).nanogallery2('option', 'fnThumbnailOpen', function (items) {
            if (!items || !items.length) return;
            const url = items[0].responsiveURL();
            if (!url) return;
            createResizablePanel(url);
        });
        console.log('[' + EXT_NAME + '] Patched fnThumbnailOpen on', galleryEl.id || galleryEl);
    } catch (ex) {
        console.warn('[' + EXT_NAME + '] Could not patch gallery:', ex);
    }
}

function watchForGallery() {
    // We must NOT patch during nanogallery2's own init sequence or it breaks
    // thumbnail rendering. Instead we watch for the first thumbnail to appear
    // inside #dragGallery — that signals ngy2 has finished rendering and it is
    // safe to override fnThumbnailOpen.
    // We also clear the gaPatched flag whenever #dragGallery is removed so that
    // gallery refreshes (sort change, folder change) get re-patched.
    const observer = new MutationObserver(function (mutations) {
        for (const mutation of mutations) {
            // Detect gallery removal so we allow re-patching on next open
            for (const node of mutation.removedNodes) {
                if (node instanceof HTMLElement && node.id === 'dragGallery') {
                    // No action needed — dataset is gone with the element
                }
            }

            // Detect thumbnail insertion = ngy2 init is complete
            for (const node of mutation.addedNodes) {
                if (!(node instanceof HTMLElement)) continue;

                const isThumbnail = node.classList.contains('nGY2GThumbnail');
                const containsThumbnail = !isThumbnail && node.querySelector('.nGY2GThumbnail');

                if (isThumbnail || containsThumbnail) {
                    const galleryEl = document.getElementById('dragGallery');
                    if (galleryEl && !galleryEl.dataset.gaPatched) {
                        galleryEl.dataset.gaPatched = '1';
                        patchGallery(galleryEl);
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// ── Escape key closes topmost panel ──────────────────────────────────────────

document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    const panels = document.querySelectorAll('.' + PANEL_CLASS);
    if (!panels.length) return;
    let top = null, topZ = -Infinity;
    panels.forEach(function (p) {
        const z = parseInt(p.style.zIndex, 10) || 0;
        if (z > topZ) { topZ = z; top = p; }
    });
    if (top) top.remove();
});

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
    await delay(500); // let the default gallery extension register first
    watchForGallery();
    console.log('[' + EXT_NAME + '] Loaded \u2014 gallery images are now resizable & moveable.');
}

init();
