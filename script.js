document.getElementById('shake-button').addEventListener('click', function() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const cells = document.querySelectorAll('.boggle-cell');
    cells.forEach(cell => {
        cell.value = letters[Math.floor(Math.random() * letters.length)];
    });
});

document.querySelectorAll('.boggle-cell').forEach(cell => {
    cell.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
        if (!/[A-Z]/.test(this.value)) {
            this.value = '';
        }
    });
});
