/**
 * Make a fixed-positioned element draggable with corner-snapping.
 *
 * On init and on drag-end the element snaps to whichever screen corner its
 * center is nearest. While dragging it follows the pointer freely (clamped
 * inside the viewport with a 24px margin). Buttons inside the element are
 * excluded from drag initiation so they remain clickable.
 *
 * @param {HTMLElement} element - Element to make draggable.
 * @returns {{ cleanup: () => void, syncIntendedPosition: () => void }}
 */
export const makeDraggable = (element) => {
  let dragState = {
    dragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    intendedX: 0,
    intendedY: 0,
  };

  const getNearestCorner = () => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    return {
      horizontal: centerX > window.innerWidth / 2 ? 'right' : 'left',
      vertical: centerY > window.innerHeight / 2 ? 'bottom' : 'top',
    };
  };

  const snapToCorner = () => {
    const corner = getNearestCorner();
    const rect = element.getBoundingClientRect();
    const margin = 24;

    let x, y;

    if (corner.horizontal === 'right') {
      x = window.innerWidth - rect.width - margin;
    } else {
      x = margin;
    }

    if (corner.vertical === 'bottom') {
      y = window.innerHeight - rect.height - margin;
    } else {
      y = margin;
    }

    return { x, y, corner };
  };

  const applySnappedPosition = () => {
    const rect = element.getBoundingClientRect();
    const corner = getNearestCorner();

    // Convert to the target coordinate system without animating, so the
    // subsequent snap animation has a sane starting point.
    const prevTransition = element.style.transition;
    element.style.transition = 'none';

    if (corner.horizontal === 'right') {
      element.style.left = '';
      element.style.right = `${window.innerWidth - rect.right}px`;
    } else {
      element.style.right = '';
      element.style.left = `${rect.left}px`;
    }

    if (corner.vertical === 'bottom') {
      element.style.top = '';
      element.style.bottom = `${window.innerHeight - rect.bottom}px`;
    } else {
      element.style.bottom = '';
      element.style.top = `${rect.top}px`;
    }

    // Force reflow so the no-transition write commits before the next write.
    element.getBoundingClientRect();

    element.style.transition = prevTransition;

    if (corner.horizontal === 'right') {
      element.style.right = '0px';
    } else {
      element.style.left = '0px';
    }

    if (corner.vertical === 'bottom') {
      element.style.bottom = '0px';
    } else {
      element.style.top = '0px';
    }
  };

  const applyPosition = (x, y) => {
    element.style.right = '';
    element.style.bottom = '';
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
  };

  const initializePosition = () => {
    const rect = element.getBoundingClientRect();
    dragState.currentX = rect.left;
    dragState.currentY = rect.top;
    dragState.intendedX = rect.left;
    dragState.intendedY = rect.top;

    element.style.position = 'fixed';
    element.style.transform = 'none';

    const { x, y } = snapToCorner();
    dragState.currentX = x;
    dragState.currentY = y;
    dragState.intendedX = x;
    dragState.intendedY = y;
    applySnappedPosition(x, y);
  };

  const updatePosition = (intendedX, intendedY) => {
    const rect = element.getBoundingClientRect();
    const margin = 24;

    const minX = margin;
    const minY = margin;
    const maxX = window.innerWidth - rect.width - margin;
    const maxY = window.innerHeight - rect.height - margin;

    const x = Math.max(minX, Math.min(maxX, intendedX));
    const y = Math.max(minY, Math.min(maxY, intendedY));

    dragState.currentX = x;
    dragState.currentY = y;

    applyPosition(x, y);
  };

  const syncIntendedPosition = () => {
    const { x, y } = snapToCorner();
    dragState.intendedX = x;
    dragState.intendedY = y;
    dragState.currentX = x;
    dragState.currentY = y;
    applySnappedPosition(x, y);
  };

  const onResize = () => {
    const { x, y } = snapToCorner();
    dragState.intendedX = x;
    dragState.intendedY = y;
    dragState.currentX = x;
    dragState.currentY = y;
    applySnappedPosition(x, y);
  };

  const onPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;

    if (event.target.tagName === 'BUTTON' || event.target.closest('button')) {
      return;
    }

    const rect = element.getBoundingClientRect();
    element.style.right = '';
    element.style.bottom = '';
    element.style.left = `${rect.left}px`;
    element.style.top = `${rect.top}px`;
    dragState.currentX = rect.left;
    dragState.currentY = rect.top;
    dragState.intendedX = rect.left;
    dragState.intendedY = rect.top;

    dragState.dragging = true;
    dragState.startX = event.clientX;
    dragState.startY = event.clientY;

    // Mute the panel's own 0.3s transition while dragging so the pointer
    // tracks 1:1; restored on pointer-up for the snap animation.
    element.style.transition = 'all 0.1s ease-out';

    element.style.cursor = 'grabbing';
    element.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  const onPointerMove = (event) => {
    if (!dragState.dragging) return;

    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;

    dragState.intendedX += dx;
    dragState.intendedY += dy;
    dragState.startX = event.clientX;
    dragState.startY = event.clientY;

    updatePosition(dragState.intendedX, dragState.intendedY);

    event.preventDefault();
    event.stopPropagation();
  };

  const endDrag = (event) => {
    if (!dragState.dragging) return;

    dragState.dragging = false;
    element.style.transition = 'all 0.3s ease';

    element.style.cursor = 'grab';

    const { x, y } = snapToCorner();
    dragState.intendedX = x;
    dragState.intendedY = y;
    dragState.currentX = x;
    dragState.currentY = y;
    applySnappedPosition(x, y);

    if (event.pointerId !== undefined) {
      element.releasePointerCapture(event.pointerId);
    }
  };

  initializePosition();

  element.style.cursor = 'grab';
  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', endDrag);
  element.addEventListener('pointercancel', endDrag);
  window.addEventListener('resize', onResize);

  return {
    cleanup: () => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', endDrag);
      element.removeEventListener('pointercancel', endDrag);
      window.removeEventListener('resize', onResize);
    },
    syncIntendedPosition,
  };
};
