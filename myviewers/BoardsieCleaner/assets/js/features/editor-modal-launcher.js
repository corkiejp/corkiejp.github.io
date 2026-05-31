// assets/js/features/editor-modal-launcher.js

const FORM_SELECTOR = '.MessageForm.CommentForm';
const MODAL_ID = 'bc-editor-modal-bg';

export function hasEditorModalTarget() {
  return !!document.querySelector(FORM_SELECTOR);
}

export function openModalWithForm() {
  const formContainer = document.querySelector(FORM_SELECTOR);
  if (!formContainer) {
    if (typeof window.showPopup === 'function') {
      window.showPopup('Reply editor not available on this page.');
    }
    return false;
  }

  if (document.getElementById(MODAL_ID)) {
    return true;
  }

  const originalParent = formContainer.parentNode;
  const originalNextSibling = formContainer.nextSibling;

  const modalBg = document.createElement('div');
  modalBg.id = MODAL_ID;

  Object.assign(modalBg.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.56)',
    zIndex: '2147483647',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'auto',
    padding: '20px',
    boxSizing: 'border-box'
  });

  const modalBox = document.createElement('div');
  Object.assign(modalBox.style, {
    background: '#fff',
    color: '#111',
    borderRadius: '10px',
    maxWidth: '980px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '16px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  });

  const topBar = document.createElement('div');
  Object.assign(topBar.style, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px'
  });

  const title = document.createElement('div');
  title.textContent = 'Edit in modal';
  Object.assign(title.style, {
    fontSize: '16px',
    fontWeight: '600'
  });

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = 'Close & Return';
  closeBtn.title = 'Close modal and return editor to page';

  Object.assign(closeBtn.style, {
    padding: '8px 14px',
    fontSize: '14px',
    background: '#0d6efd',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  });

  let closed = false;

  function closeModal() {
    if (closed) return;
    closed = true;

    if (originalParent && formContainer) {
      if (originalNextSibling && originalNextSibling.parentNode === originalParent) {
        originalParent.insertBefore(formContainer, originalNextSibling);
      } else {
        originalParent.appendChild(formContainer);
      }
    }

    modalBg.remove();

    const editable = formContainer.querySelector('[contenteditable="true"], textarea');
    if (editable) editable.focus();
  }

  closeBtn.addEventListener('click', closeModal);

  topBar.appendChild(title);
  topBar.appendChild(closeBtn);
  modalBox.appendChild(topBar);
  modalBox.appendChild(formContainer);
  modalBg.appendChild(modalBox);
  document.body.appendChild(modalBg);

  const editable = formContainer.querySelector('[contenteditable="true"], textarea');
  if (editable) editable.focus();

  modalBg.addEventListener('click', (e) => {
    if (e.target === modalBg) {
      closeModal();
    }
  });

  const escHandler = (ev) => {
    if (ev.key === 'Escape' && document.getElementById(MODAL_ID)) {
      ev.preventDefault();
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };

  document.addEventListener('keydown', escHandler);

  return true;
}

export function initEditorModalLauncher() {
  return {
    hasEditorModalTarget,
    openModalWithForm
  };
}