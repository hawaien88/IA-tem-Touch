document.addEventListener('DOMContentLoaded', () => {
  const display   = document.getElementById('transitionTime');
  const btnPlus   = document.getElementById('btnPlus');
  const btnMinus  = document.getElementById('btnMinus');
  const btnBack   = document.getElementById('btnBack');
  let currentTime = 1.0;

  function updateDisplay() {
    display.textContent = currentTime.toFixed(1) + 's';
  }

  function setDuration() {
    console.log('Envoi /api/mix-duration →', currentTime, 's');
    fetch('/api/mix-duration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transition: currentTime })
    })
    .then(res => console.log('← status', res.status))
    .catch(err => console.error('Erreur fetch:', err));
  }

  btnPlus.addEventListener('click', () => {
    currentTime = Math.min(10, currentTime + 0.5);
    updateDisplay();
    setDuration();
  });

  btnMinus.addEventListener('click', () => {
    currentTime = Math.max(0.5, currentTime - 0.5);
    updateDisplay();
    setDuration();
  });

  btnBack.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  updateDisplay();
});
