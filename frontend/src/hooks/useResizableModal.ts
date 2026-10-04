import { useEffect, useRef } from 'react';

export function useResizableModal(storageKey: string, defaultWidth: number = 720, defaultHeight: number = 600) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedWidth = localStorage.getItem(`${storageKey}_width`);
    const savedHeight = localStorage.getItem(`${storageKey}_height`);
    const savedTop = localStorage.getItem(`${storageKey}_top`);
    const savedLeft = localStorage.getItem(`${storageKey}_left`);
    
    let initialWidth = savedWidth ? parseInt(savedWidth, 10) : defaultWidth;
    let initialHeight = savedHeight ? parseInt(savedHeight, 10) : defaultHeight;

    // Prevent modal from being larger than the viewport
    initialWidth = Math.min(initialWidth, window.innerWidth - 40);
    initialHeight = Math.min(initialHeight, window.innerHeight - 40);

    const panel = panelRef.current;
    if (!panel) return;

    // Apply initial dimensions
    panel.style.width = `${initialWidth}px`;
    panel.style.height = `${initialHeight}px`;

    // Center the modal if no position saved, otherwise use saved
    const updatePosition = () => {
      if (savedTop && savedLeft) {
        let topVal = parseInt(savedTop, 10);
        let leftVal = parseInt(savedLeft, 10);
        topVal = Math.max(0, Math.min(topVal, window.innerHeight - initialHeight));
        leftVal = Math.max(0, Math.min(leftVal, window.innerWidth - initialWidth));
        panel.style.top = `${topVal}px`;
        panel.style.left = `${leftVal}px`;
      } else {
        const rect = panel.getBoundingClientRect();
        const actualHeight = rect.height || defaultHeight;
        const actualWidth = rect.width || defaultWidth;
        const top = Math.max(0, (window.innerHeight - actualHeight) / 2);
        const left = Math.max(0, (window.innerWidth - actualWidth) / 2);
        panel.style.top = `${top}px`;
        panel.style.left = `${left}px`;
      }
      panel.style.bottom = 'auto';
      panel.style.right = 'auto';
      panel.style.transform = 'none';
    };

    updatePosition();

    // Focus and scroll into view when mounted
    panel.tabIndex = -1;
    panel.focus();
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // 1. Resizing Logic
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'modal-resize-handle-br';
    panel.appendChild(resizeHandle);

    let isResizing = false;
    let resizeStartX = 0;
    let resizeStartY = 0;
    let startWidth = 0;
    let startHeight = 0;

    const onResizeMouseDown = (e: MouseEvent) => {
      isResizing = true;
      resizeStartX = e.clientX;
      resizeStartY = e.clientY;
      startWidth = panel.offsetWidth;
      startHeight = panel.offsetHeight;
      document.body.style.cursor = 'nwse-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
      e.stopPropagation();
    };

    const onResizeMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const dx = e.clientX - resizeStartX;
      const dy = e.clientY - resizeStartY;
      
      const newWidth = Math.max(400, Math.min(startWidth + dx, window.innerWidth - panel.offsetLeft - 20));
      const newHeight = Math.max(300, Math.min(startHeight + dy, window.innerHeight - panel.offsetTop - 20));
      
      panel.style.width = `${newWidth}px`;
      panel.style.height = `${newHeight}px`;
    };

    const onResizeMouseUp = () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        localStorage.setItem(`${storageKey}_width`, panel.offsetWidth.toString());
        localStorage.setItem(`${storageKey}_height`, panel.offsetHeight.toString());
      }
    };

    resizeHandle.addEventListener('mousedown', onResizeMouseDown);
    document.addEventListener('mousemove', onResizeMouseMove);
    document.addEventListener('mouseup', onResizeMouseUp);

    // 2. Dragging (Moving) Logic
    const header = panel.querySelector('.modal-panel__header') as HTMLElement;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    const onDragMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.modal-panel__close')) return;
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      initialLeft = panel.offsetLeft;
      initialTop = panel.offsetTop;
      if (header) header.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    };

    const onDragMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      
      const newLeft = Math.max(0, Math.min(initialLeft + dx, window.innerWidth - panel.offsetWidth));
      const newTop = Math.max(0, Math.min(initialTop + dy, window.innerHeight - panel.offsetHeight));

      panel.style.left = `${newLeft}px`;
      panel.style.top = `${newTop}px`;
    };

    const onDragMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        if (header) header.style.cursor = 'grab';
        document.body.style.userSelect = '';
        localStorage.setItem(`${storageKey}_left`, panel.offsetLeft.toString());
        localStorage.setItem(`${storageKey}_top`, panel.offsetTop.toString());
      }
    };

    if (header) {
      header.style.cursor = 'grab';
      header.addEventListener('mousedown', onDragMouseDown);
    }
    document.addEventListener('mousemove', onDragMouseMove);
    document.addEventListener('mouseup', onDragMouseUp);

    // Clean up
    return () => {
      resizeHandle.removeEventListener('mousedown', onResizeMouseDown);
      document.removeEventListener('mousemove', onResizeMouseMove);
      document.removeEventListener('mouseup', onResizeMouseUp);
      
      if (header) header.removeEventListener('mousedown', onDragMouseDown);
      document.removeEventListener('mousemove', onDragMouseMove);
      document.removeEventListener('mouseup', onDragMouseUp);

      if (panel.contains(resizeHandle)) {
        panel.removeChild(resizeHandle);
      }
    };
  }, [storageKey, defaultWidth, defaultHeight]);

  return panelRef;
}
