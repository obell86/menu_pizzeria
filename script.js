// script.js (solo per il countdown)
document.addEventListener('DOMContentLoaded', () => {
    const countdownTimer = document.getElementById('countdown-timer');
    if (countdownTimer) {
        const targetDate = new Date(countdownTimer.dataset.targetDate);
        if (!isNaN(targetDate)) {
            const updateCountdown = () => {
                const now = new Date().getTime();
                const distance = targetDate.getTime() - now;
                if (distance < 0) {
                    clearInterval(intervalId);
                    countdownTimer.innerHTML = '<p id="countdown-message">Tempo Scaduto!</p>';
                    return;
                }
                const days = Math.floor(distance / (1000*60*60*24));
                const hours = Math.floor((distance % (1000*60*60*24))/(1000*60*60));
                const minutes = Math.floor((distance % (1000*60*60))/(1000*60));
                const seconds = Math.floor((distance % (1000*60))/1000);
                document.getElementById('days').textContent = String(days).padStart(2, '0');
                document.getElementById('hours').textContent = String(hours).padStart(2, '0');
                document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
                document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
            };
            const intervalId = setInterval(updateCountdown, 1000);
            updateCountdown();
        }
    }
});