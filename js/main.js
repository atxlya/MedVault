/* ============================================================
   main.js — boot
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  App.start();

  const toggle = $('#frame-toggle');
  const syncLabel = () => {
    toggle.textContent = document.body.classList.contains('framed') ? '📱 Full' : '📱 Frame';
  };
  if (window.innerWidth < 500) {
    document.body.classList.remove('framed');
  } else {
    document.body.classList.add('framed');
  }
  syncLabel();
  toggle.addEventListener('click', () => {
    document.body.classList.toggle('framed');
    syncLabel();
  });
});

/* Expose for debugging in the console */
window.MedVault = { Store, App, Session, Screens, OCR };