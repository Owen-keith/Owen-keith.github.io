document.getElementById('shake-button').addEventListener('click', function() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const cells = document.querySelectorAll('.boggle-cell');
    cells.forEach(cell => {
        cell.textContent = letters[Math.floor(Math.random() * letters.length)];
    });
});
